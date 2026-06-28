# Quickstart & Validation — Location POI Scoring

A run/validation guide proving the feature works end to end. Implementation details live in
`tasks.md` and the code; this file is for setup, running, and verifying behavior against the spec.

## Prerequisites

- Node.js 20 LTS and npm
- Provider credentials in environment (never committed — Constitution: secrets via env):
  - `ROUTING_API_KEY` (OpenRouteService key)
  - Optional endpoint overrides: `PLACES_BASE_URL`, `NOMINATIM_BASE_URL`, `ROUTING_BASE_URL`
- A single Next.js app at the repository root.

## Setup

```bash
npm install
cp .env.example .env   # then fill in ROUTING_API_KEY
```

## Run

```bash
npm run dev            # Next.js on http://localhost:3000 (UI + /api/v1)
```

## Tests (the gate)

```bash
npx playwright install   # one-time: download browser binaries
npm test                 # Playwright: API tests (/api/v1) + browser E2E
npm run typecheck        # tsc --noEmit
```

Playwright starts a **test-mode** server automatically (`APTSCORE_TEST_MODE=1`) that uses
deterministic fixture adapters, so tests are network-free and reproducible. Per Constitution I, the
API and E2E tests are written **first** and must fail before implementation.

## Validation scenarios (map to spec)

### 1. Score a location (US1 / FR-002, FR-003, FR-008)

```bash
curl -s http://localhost:3000/api/v1/score -H 'content-type: application/json' -d '{
  "location": { "query": "123 Example St, Townsville" },
  "interests": [
    { "typeId": "transit", "importance": "high" },
    { "typeId": "cafes" },
    { "typeId": "bookstores", "importance": "low" }
  ]
}' | jq
```

Expect `200` with `primaryScore` (unbounded), `secondaryScore` (0–100), and a `contributions`
entry for **all three** types. Default range = 20 walking minutes.

### 2. Breakdown is explainable (US2 / FR-013, FR-011)

In the `200` response, confirm each `contributions[]` item lists `contributingPlaces` with
`walkingSeconds`/`walkingMeters`, and that a type with nothing nearby still appears with `rawSum: 0`.

### 3. Weighting changes the score (US3 / FR-009)

Re-run scenario 1 with all importances `medium`, then with `transit: high`. Confirm both
`primaryScore` and `secondaryScore` change, and raising importance of a well-served type raises the
overall.

### 4. No interest selected is rejected (FR-010)

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/v1/score \
  -H 'content-type: application/json' -d '{ "location": {"query":"x"}, "interests": [] }'
```

Expect `400` (`invalid_request`). The UI also disables submit until a type is selected.

### 5. Unresolvable location (FR-002)

Submit a nonsense location; expect `422` (`location_unresolved`), no score.

### 6. Fail-closed on routing outage (FR-012)

With the routing provider stubbed to time out (test config), submit a valid request; expect `503`
(`scoring_unavailable`) — **no** approximate or partial score.

### 7. Determinism (FR-014 / SC-004)

With mocked providers returning fixed data, score the same request twice; `primaryScore` and
`secondaryScore` must be identical.

### 8. Range override (FR-003)

Repeat scenario 1 with `"range": { "mode": "minutes", "value": 10 }` and with
`{ "mode": "distance", "value": 800, "distanceUnit": "m" }`; confirm scores shift. Both are routed
walking, so both fail closed if routing is down.

## Calibration & sunset (spec Assumptions / SC-002)

Score the curated calibration set of known good/poorly-served locations; verify well-served rank
above poorly-served in ≥95% of pairwise comparisons (SC-002). Compare how `primaryScore` vs
`secondaryScore` rank them; record which is the better ranker — the trigger to drop one scoring mode.
