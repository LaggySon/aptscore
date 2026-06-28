# API Contracts — Location POI Scoring

`openapi.yaml` is the authoritative contract for the v1 API, served by Next.js Route Handlers under
`/api/v1`. Per Constitution principle IV, the **contract tests are the source of truth**: the Zod
schemas and the typed browser client must stay in sync with this file, and contract tests (which call
the handlers directly) assert that request/response shapes match.

## Endpoints

- `GET /api/v1/interest-types` — returns the closed catalog of 14 supported interest types (FR-001).
- `POST /api/v1/score` — scores one location against selected interests (FR-002..FR-016).

## Response contract highlights

- `200` — a `ScoreResult` with both `primaryScore` (unbounded headline) and `secondaryScore`
  (0–100), plus a per-type `contributions` array that **always includes every selected type**, even
  zero-contribution ones (FR-011).
- `400 invalid_request` — e.g., zero interest types selected (FR-010), unknown `typeId`, bad range.
- `422 location_unresolved` — the location could not be resolved (FR-002).
- `503 scoring_unavailable` — routing/places provider unavailable; **fail-closed**, no partial or
  approximate score (FR-012).

## Stability rules

- Additive, backward-compatible changes (new optional fields) → minor version.
- Removing/renaming fields or changing semantics → major version + migration note.
- The dual-score fields are expected to **narrow at sunset**: once calibration picks a single scoring
  mode (spec Assumptions), one of `primaryScore` / `secondaryScore` will be removed in a major
  version with a migration note.
