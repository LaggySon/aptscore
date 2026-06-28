# Phase 0 Research: Location POI Scoring

All Technical Context unknowns are resolved below. Each item: Decision / Rationale / Alternatives.

## 1. POI / place-data provider

**Decision**: OpenStreetMap data via the **Overpass API** for v1, accessed only through the
`adapters/places` interface. The 14 supported interest types are mapped to OSM tags inside the
adapter (e.g., transit → `public_transport`/`railway=station`/`highway=bus_stop`; cafés →
`amenity=cafe`; groceries → `shop=supermarket`/`shop=convenience`).

**Rationale**: Free, no per-request billing for early development, broad global coverage, and rich
category tagging that maps cleanly onto our curated set. Keeping the mapping in the adapter honors
the constitution's provider-isolation rule and lets us swap providers without touching domain logic.

**Alternatives considered**:
- *Google Places / Mapbox / Foursquare*: better ratings/review data and SLAs, but paid and
  rate-limited; ratings can be layered in later behind the same adapter interface.
- *Self-hosted OSM extract*: best determinism/cost at scale, but operational overhead not justified
  for v1.

**Open consequence**: OSM rating/review coverage is sparse. This is exactly why FR-006 specifies
neutral (3/5) handling for unrated/low-review places, and why the 80/20 split keeps rating a minor
factor. A ratings-rich provider can be added behind the adapter when needed.

## 2. Routing / walking-time provider

**Decision**: **OpenRouteService (ORS)** for v1 via `adapters/routing` — use the matrix endpoint to
get walking durations from the location to candidate places in one batched call; optionally its
isochrone endpoint to validate the catchment.

**Rationale**: Free tier suitable for development, supports foot-walking profiles, and a **matrix**
call returns many durations at once — keeping us within the SC-001 time budget and the FR-016
candidate cap. The matrix endpoint can return **both `durations` and `distances`** in a single call,
which supplies the routed walking distance needed for the fixed-distance range mode (FR-003) without
an extra request. Behind the adapter, so swappable for self-hosted OSRM later.

**Alternatives considered**:
- *Self-hosted OSRM*: fastest and most deterministic, but ops overhead; a strong v2 once volume
  justifies it.
- *Mapbox Matrix / Google Distance Matrix*: capable but paid.
- *Straight-line approximation*: explicitly rejected as the v1 measurement basis (grilling Q11);
  retained only as an internal candidate pre-filter, never as the authoritative measure.

## 3. Candidate selection strategy (correctness + performance)

**Decision**: Pre-filter candidates with a straight-line radius equal to
`max_walking_distance = budget × max_walking_speed` (a safe superset, since walking distance ≥
straight-line distance), cap to the **N nearest by straight-line per type** (FR-016), then send those
to the routing matrix for authoritative walking durations. Places whose routed walking time exceeds
the budget are dropped.

**Rationale**: Guarantees no reachable place is missed by the pre-filter, bounds provider load and
latency, and keeps the authoritative measure as routed walking time. N is a tunable constant.

**Alternatives considered**: Routing every place in a wide radius (too many calls); using only the
isochrone polygon then point-in-polygon (works, but matrix durations are also needed for the distance
component of the blend, so matrix is the primary call).

## 4. Determinism strategy

**Decision**: Domain scoring is pure functions over already-fetched data; all I/O (provider calls,
clock, any randomness) is injected at the service boundary. Tests feed fixed provider responses.

**Rationale**: Satisfies FR-014 / Constitution determinism. Same location + selections + weights +
same provider responses ⇒ identical scores, independent of wall-clock or network timing.

**Alternatives considered**: Caching provider responses for reproducibility — useful later for cost,
but determinism is achieved structurally without it.

## 5. Fail-closed degradation

**Decision**: The routing adapter applies a timeout and limited retries; on exhaustion it raises a
typed `RoutingUnavailable` error. The scoring service surfaces this as a clear "score unavailable"
response (FR-012). No straight-line fallback for the authoritative score in v1.

**Rationale**: Matches the grilling Q12 decision and the constitution's explicit-failure stance for
this feature. Places-provider failure is treated the same way (cannot score reliably).

**Alternatives considered**: Graceful straight-line fallback (rejected in grilling); partial scoring
(rejected — produces confusing half-scores).

## 6. App framework, API style & validation

**Decision**: A single **Next.js (App Router)** application delivers both the UI and the API. The API
is REST over JSON, versioned under `/api/v1`, implemented as Route Handlers that delegate to
framework-agnostic handler functions. Zod schemas are the single source for both runtime validation
and TypeScript types, kept in sync with the OpenAPI contract.

**Rationale**: Consolidating UI + API into one Next.js app means one codebase, one deploy, and no
cross-origin wiring, while the pure domain and adapters remain framework-independent in `src/server`.
Extracting the request logic into framework-agnostic handlers keeps Constitution IV's "contracts as
source of truth" cheap to test — contract/integration tests call the handlers directly with mock
adapters, with no running server.

**Alternatives considered**:
- *Separate Fastify API + Next/SPA frontend*: an extra process and deploy with no benefit here; the
  domain is already isolated, so consolidation loses nothing.
- *Next Server Actions instead of Route Handlers*: weaker as a documented, versioned public contract.
- *GraphQL / tRPC*: overkill for two endpoints; tRPC couples client and server.

## 7. Logging / observability

**Decision**: Pino structured JSON logging integrated with Fastify. Each score request logs inputs
(location, selected types, weights, range), per-type contributions, the contributing places with
walking times, and both overall scores at an appropriate level; errors log provider context.

**Rationale**: Satisfies Constitution III — every score is reconstructable from logs and explainable
in the breakdown.

## 8. Frontend

**Decision**: Next.js App Router UI (React + TypeScript + Tailwind): a client component for the
scoring page with an interest-type picker (the 14 types), a range control (minutes default 20, or
fixed distance), a results view showing the primary score with the bounded secondary alongside, and
(US2) an expandable per-type breakdown. It talks to the same app's `/api/v1` Route Handlers via a
typed client.

**Rationale**: Part of the consolidated Next.js app (decision 6) — no separate frontend build or
cross-origin calls; reusable Tailwind components per Constitution V.

**Alternatives considered**: A standalone Vite SPA (rejected — adds a second app/deploy for no gain
now that the API is also Next.js).

## 9. Testing strategy

**Decision**: **Playwright** is the only test tool. API tests use Playwright's `request` fixture to
exercise `/api/v1` (scoring math, contract shapes, 400/422/503, determinism, range modes); browser
E2E tests cover the UI journeys. Tests run against a **test-mode server**: when `APTSCORE_TEST_MODE=1`
the service container wires deterministic fixture adapters instead of the real providers, so tests
are network-free and reproducible. Failure cases are triggered by sentinel location queries
(`"nowhere"` → 422 unresolved; `"provider-outage"` → 503 fail-closed).

**Rationale**: One tool covering real user journeys and the public API contract. The scoring math is
asserted through the API rather than as isolated unit tests (a deliberate trade-off chosen by the
team — fewer, higher-level tests over fast granular ones).

**Trade-off noted**: pure scoring functions are verified only end-to-end through HTTP, so a math
regression surfaces as an API assertion failure rather than a focused unit failure. The fixture
adapters keep these tests deterministic enough to still pin the math precisely.

**Alternatives considered**: Vitest unit tests for the domain + Playwright for E2E (rejected by the
team in favor of a single tool).

## Resolved constants (initial values; all tunable, in `domain/constants.ts`)

| Constant | Initial value | Source |
|----------|---------------|--------|
| Proximity / rating split | 80 / 20 | Grilling Q4 |
| Neutral rating for unrated/low-review | 3 / 5 | Grilling Q5 |
| Minimum reviews for a rating to count | 5 | Grilling Q5 (default) |
| Default range | 20 walking minutes | Grilling Q6/Q7 |
| Assumed max walking speed (pre-filter only) | ~85 m/min | Pre-filter superset |
| Per-type "ideal places" ceiling K (bounded mode) | 5 | Grilling Q9 |
| Per-type candidate cap N (routed) | 20 | FR-016 (default) |
| Importance multipliers low/med/high | 1 / 2 / 3 | Grilling Q13 |
| Routing timeout / retries | 5 s / 2 | Fail-closed budget |
