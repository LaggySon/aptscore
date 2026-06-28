# Phase 1 Data Model: Location POI Scoring

These are domain/transfer shapes (no persistence in v1). Validation rules trace to spec FRs.

## InterestType (catalog)

The supported v1 catalog (FR-001). Static configuration; not user-created.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string (slug) | e.g., `groceries`, `transit`, `cafes` — one of the 14 |
| `label` | string | Display name |
| `providerMapping` | string[] | Provider category/tag identifiers (lives in places adapter) |
| `idealCeilingK` | number | Per-type bounded-mode ceiling (default 5) |

**Rules**: catalog is closed (FR-001); custom types rejected. `id` ∈ the 14 defined slugs.

## ImportanceLevel

Enum: `low` | `medium` | `high` → multipliers ×1 / ×2 / ×3 (FR-009). Default `medium`.

## RangeSetting

The catchment for a request (FR-003).

| Field | Type | Notes |
|-------|------|-------|
| `mode` | `minutes` \| `distance` | Default `minutes` |
| `value` | number > 0 | Minutes (default 20) or physical distance |
| `distanceUnit` | `m` \| `km` \| `mi` | Required when `mode = distance` |

**Rules**: `value > 0`; both modes resolved via walking (routing), never straight-line for the
authoritative measure (FR-003). Out-of-range cap enforced (sane upper bound to protect latency).

## InterestSelection (request input)

| Field | Type | Notes |
|-------|------|-------|
| `typeId` | InterestType.id | Must be in catalog |
| `importance` | ImportanceLevel | Defaults to `medium` if omitted (FR-009) |

**Rules**: at least one selection required (FR-010); `typeId` unique within a request.

## Location

| Field | Type | Notes |
|-------|------|-------|
| `query` | string | User input (address/place) — when resolving by text |
| `lat` / `lng` | number | Resolved coordinates |
| `resolved` | boolean | False ⇒ reject request with clear message (FR-002) |

**Rules**: an unresolvable location yields a rejection, not a score (FR-002).

## NearbyPlace (provider-derived, per type)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Provider place id |
| `name` | string | Display |
| `typeId` | InterestType.id | Which type it satisfies |
| `walkingSeconds` | number | Authoritative routed walking time (FR-003/005, minutes mode) |
| `walkingMeters` | number | Authoritative routed walking distance (FR-003/005, distance mode) |
| `straightLineMeters` | number | Pre-filter only |
| `rating` | number \| null | Provider rating (assumed /5); null ⇒ neutral (FR-006) |
| `reviewCount` | number | Below min-review threshold ⇒ treated as unrated (FR-006) |
| `inRange` | boolean | `walkingSeconds ≤ budgetSeconds` (minutes mode) or `walkingMeters ≤ budgetMeters` (distance mode) (FR-004) |

**Derived** `placeValue` ∈ [0,1] for in-range places (FR-005):
`0.8 × proximityPart + 0.2 × ratingPart`, where `proximityPart` scales linearly 1→0 across the
range over the **active dimension** (walking time for minutes mode, walking distance for distance
mode), and `ratingPart = effectiveRating / 5` (neutral 3/5 when unrated/low-review). Out-of-range
places have `placeValue = 0` (FR-004).

## TypeContribution (per selected type, in result)

| Field | Type | Notes |
|-------|------|-------|
| `typeId` | InterestType.id | |
| `importance` | ImportanceLevel | Echoed |
| `rawSum` | number | Linear sum of in-range `placeValue`s — no diminishing returns (FR-007) |
| `boundedScore` | number 0–100 | `min(100, rawSum / K × 100)` (FR-008 secondary) |
| `contributingPlaces` | NearbyPlace[] | In-range places with walking time (FR-013) |
| `coverage` | `ok` \| `no-data` | `no-data` when provider has no coverage (FR-015) |

## ScoreResult (response)

| Field | Type | Notes |
|-------|------|-------|
| `location` | Location | Resolved point |
| `range` | RangeSetting | Effective range used |
| `primaryScore` | number | Unbounded: Σ(weight × rawSum) (FR-008 primary, headline) |
| `secondaryScore` | number 0–100 | Σ(weight × boundedScore) / Σ(weight) (FR-008 secondary) |
| `contributions` | TypeContribution[] | One per selected type, incl. zero-contribution (FR-011) |
| `generatedAt` | ISO timestamp | Observability only; not an input to scoring (determinism) |

**Invariants**:
- Determinism: identical inputs + identical provider responses ⇒ identical `primaryScore` and
  `secondaryScore` (FR-014).
- Every selected type appears in `contributions`, including zero (FR-011).
- Routing/places unavailable ⇒ no `ScoreResult`; a typed error response instead (FR-012).
- `secondaryScore` ∈ [0,100]; `primaryScore` ≥ 0, unbounded above (FR-008).
