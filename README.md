# aptscore

Score a single location by how close it is to the things that matter to *you*. Pick the
points of interest you care about (groceries, transit, cafés, parks, …), enter an address,
and get a score reflecting how well that spot is served within walking distance — plus a
full breakdown of how the score was calculated.

Built with [GitHub Spec Kit](https://github.com/github/spec-kit): see
[`specs/001-location-poi-scoring/`](specs/001-location-poi-scoring/) for the spec, plan,
research, data model, API contract, and tasks, and
[`.specify/memory/constitution.md`](.specify/memory/constitution.md) for the project principles.

## Status

- ✅ **US1 — Score a location** (primary + secondary scores, routed walking ranges)
- ✅ **US2 — Explainable breakdown** (per-place math, top match, no-data states)
- ⏳ US3 — Importance controls (API supports it; UI controls pending)
- ⏳ Polish — calibration/sunset decision, real ratings provider, README/lint, perf

## Tech stack

A single **Next.js 14 (App Router)** app in TypeScript:

- **API:** Route Handlers under `/api/v1` (`score`, `interest-types`)
- **Domain:** pure, deterministic scoring in `src/server/domain` (fully isolated from I/O)
- **Providers:** OpenStreetMap (Overpass + Nominatim) for places/geocoding, OpenRouteService
  for walking distances — behind mockable adapters
- **UI:** React + Tailwind CSS, reusable components in `src/components`
- **Tests:** Playwright (API + browser E2E) against a deterministic test-mode server

## How scoring works (short version)

1. Each nearby place gets a **value** = `0.8 × proximity + 0.2 × (rating ÷ 5)`. Proximity is
   `1.0` at the location and falls linearly to `0` at the edge of your range; unrated places
   use a neutral `3/5`.
2. A category's **raw sum** is the sum of its in-range place values (no diminishing returns).
3. The **0–100 score** for a category = `raw sum ÷ K ideal places × 100` (capped at 100).
4. The **headline score** is the importance-weighted sum of raw sums; the **0–100 score** is
   the importance-weighted average of category scores.

> Note: OSM has no ratings, so on live data the rating term is currently neutral. A
> ratings-capable provider is a planned addition (see the spec's Assumptions).

## Getting started

Requires Node.js 20+ and npm.

```bash
npm install
cp .env.example .env   # then fill in ROUTING_API_KEY for live data
npm run dev            # http://localhost:3000
```

### Run without provider keys

Use the deterministic fixture adapters — handy for exploring the UI offline:

```bash
# macOS/Linux / Git Bash
APTSCORE_TEST_MODE=1 npm run dev
# PowerShell
$env:APTSCORE_TEST_MODE='1'; npm run dev
```

Any address scores from fixtures, except sentinels `nowhere` (→ 422) and `provider-outage` (→ 503).

## Environment variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `ROUTING_API_KEY` | OpenRouteService key (walking measurement) | — (required for live data) |
| `PLACES_BASE_URL` | Overpass endpoint | public Overpass |
| `NOMINATIM_BASE_URL` | Geocoding endpoint | public Nominatim |
| `ROUTING_BASE_URL` | OpenRouteService endpoint | ORS public API |
| `APTSCORE_TEST_MODE` | `1` wires fixture adapters (no network) | `0` |
| `LOG_LEVEL` | Pino log level | `info` |

Secrets are read only from the environment and never committed.

## Tests

```bash
npx playwright install   # one-time: download browser binaries
npm test                 # Playwright API + E2E (auto-starts a test-mode server on :3100)
npm run typecheck        # tsc --noEmit
```

## API

`POST /api/v1/score` and `GET /api/v1/interest-types`. See the OpenAPI contract at
[`specs/001-location-poi-scoring/contracts/openapi.yaml`](specs/001-location-poi-scoring/contracts/openapi.yaml).

Example:

```bash
curl -s http://localhost:3000/api/v1/score -H 'content-type: application/json' -d '{
  "location": { "query": "123 Example St" },
  "interests": [{ "typeId": "transit", "importance": "high" }, { "typeId": "cafes" }]
}'
```

## Project layout

```text
src/app/            Next.js routes + /api/v1 handlers
src/server/         domain (pure scoring), adapters, services, config
src/components/     React UI (ui/ primitives + feature components)
e2e/                Playwright tests
specs/              Spec Kit artifacts for the feature
```
