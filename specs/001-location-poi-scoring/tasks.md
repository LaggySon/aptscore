---
description: "Task list for Location POI Scoring (Next.js App Router + Playwright)"
---

# Tasks: Location POI Scoring

**Input**: Design documents from `/specs/001-location-poi-scoring/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: INCLUDED, via **Playwright only**. Per Constitution I (Test-First, NON-NEGOTIABLE) tests
are written before implementation. API tests hit `/api/v1` against a **test-mode server** (fixture
adapters, network-free); E2E tests drive the browser UI. There is no separate unit runner.

**Stack**: A single Next.js (App Router) app â€” API in `src/app/api/v1` Route Handlers, server logic
in `src/server`, UI in `src/app` + `src/components`. Playwright tests in `e2e/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1 / US2 / US3 (omitted for Setup, Foundational, Polish)

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Scaffold a single Next.js 14 App Router app at the repo root (`package.json`, `next.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`)
- [X] T002 Configure TypeScript strict in `tsconfig.json`
- [X] T003 [P] Configure Tailwind CSS (`tailwind.config.ts`, `postcss.config.mjs`, `src/app/globals.css`)
- [ ] T004 [P] Configure ESLint + Prettier (no unjustified `any`) in `.eslintrc.cjs`
- [X] T005 [P] Configure Playwright (`playwright.config.ts`) with a `webServer` that starts the app in test mode (`APTSCORE_TEST_MODE=1`); tests live in `e2e/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**âš ï¸ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 [P] Define tunable constants (80/20, K=5, min-reviews=5, default 20-min range, walking-speed, cap N=20, weights 1/2/3, routing timeout/retries) in `src/server/domain/constants.ts`
- [X] T007 [P] Define domain/transfer types (incl. `walkingSeconds` + `walkingMeters`) in `src/server/domain/types.ts`
- [X] T008 [P] Define typed errors (`LocationUnresolved`, `ScoringUnavailable`) in `src/server/domain/errors.ts`
- [X] T009 [P] Create the closed interest-type registry (the 14 + per-type K) in `src/server/config/interest-types.ts`
- [X] T010 [P] Implement env config loader (provider keys via env only; `APTSCORE_TEST_MODE`) in `src/server/config/env.ts`
- [X] T011 [P] Configure Pino structured logger in `src/server/config/logger.ts`
- [X] T012 Define places adapter interface in `src/server/adapters/places/places-adapter.ts`
- [X] T013 Define routing adapter interface (durations AND distances; throws `ScoringUnavailable`) in `src/server/adapters/routing/routing-adapter.ts`
- [X] T014 [P] Implement fixture places adapter (sentinel queries: `nowhere`â†’unresolved, `provider-outage`â†’unavailable) in `src/server/adapters/places/mock-places-adapter.ts`
- [X] T015 [P] Implement fixture routing adapter in `src/server/adapters/routing/mock-routing-adapter.ts`
- [X] T016 Add the service container choosing fixture vs real adapters by `APTSCORE_TEST_MODE` (`src/server/container.ts`) and empty `/api/v1` Route Handler shells

**Checkpoint**: Foundation ready â€” user stories can begin

---

## Phase 3: User Story 1 - Score a location (Priority: P1) ðŸŽ¯ MVP

**Goal**: Select interest types, enter a location, get an overall score (primary unbounded + secondary 0â€“100) using routed walking proximity and ratings, default equal weighting; range supports minutes (default 20) and fixed walking distance.

**Independent Test**: `POST /api/v1/score` with â‰¥2 types returns 200 with both scores; well-served > poorly-served; no interest â‡’ 400; `nowhere` â‡’ 422; `provider-outage` â‡’ 503; same inputs â‡’ identical scores; distance mode filters by routed walking distance. The UI scores a location end-to-end.

### Tests for User Story 1 (write first, must fail) âš ï¸

- [X] T017 [P] [US1] API test: place-value blend & out-of-range exclusion via a single-place score in `e2e/api.spec.ts`
- [X] T018 [P] [US1] API test: linear sum / no diminishing returns (N copies â†’ NÃ—) in `e2e/api.spec.ts`
- [X] T019 [P] [US1] API test: primary (unbounded) + secondary (0â€“100) aggregation in `e2e/api.spec.ts`
- [X] T020 [P] [US1] API test: importance weighting changes both scores in `e2e/api.spec.ts`
- [X] T021 [P] [US1] API test: GET /api/v1/interest-types returns the 14 in `e2e/api.spec.ts`
- [X] T022 [P] [US1] API test: POST /api/v1/score contract â€” 200/400/422 in `e2e/api.spec.ts`
- [X] T023 [P] [US1] API test: happy path, well-served scores higher than poorly-served in `e2e/api.spec.ts`
- [X] T024 [P] [US1] API test: fail-closed â€” `provider-outage` â‡’ 503, no score (FR-012) in `e2e/api.spec.ts`
- [X] T025 [P] [US1] API test: determinism â€” identical inputs â‡’ identical scores (FR-014) in `e2e/api.spec.ts`
- [X] T026 [P] [US1] API test: distance-mode range filters by walking distance (FR-003) in `e2e/api.spec.ts`
- [X] T027 [P] [US1] E2E: interest chips toggle and submit is disabled until â‰¥1 selected (FR-010) in `e2e/ui.spec.ts`
- [X] T028 [P] [US1] E2E: range control switches minutesâ†”distance in `e2e/ui.spec.ts`
- [X] T029 [P] [US1] E2E: entering a location and submitting shows primary + secondary scores in `e2e/ui.spec.ts`

### Implementation for User Story 1

- [X] T030 [P] [US1] Implement weights in `src/server/domain/weights.ts`
- [X] T031 [P] [US1] Implement place-value in `src/server/domain/place-value.ts`
- [X] T032 [US1] Implement per-type linear sum in `src/server/domain/type-score.ts` (depends on T031)
- [X] T033 [US1] Implement aggregate in `src/server/domain/aggregate.ts` (depends on T032, T030)
- [X] T034 [P] [US1] Implement category mapping in `src/server/adapters/places/category-mapping.ts`
- [X] T035 [US1] Implement Overpass places adapter + geocode (422) in `src/server/adapters/places/overpass-places-adapter.ts`
- [X] T036 [US1] Implement ORS routing adapter (duration+distance matrix, timeout/retry, fail-closed) in `src/server/adapters/routing/ors-routing-adapter.ts`
- [X] T037 [US1] Implement scoring-service orchestration (resolve â†’ prefilter â†’ cap N â†’ route â†’ in-range over active dimension â†’ score) in `src/server/services/scoring-service.ts`
- [X] T038 [P] [US1] Define Zod schemas (incl. `walkingMeters`) in `src/server/api/schemas/score.ts`
- [X] T039 [US1] Implement interest-types handler + wire GET route in `src/server/api/interest-types-handler.ts` and `src/app/api/v1/interest-types/route.ts`
- [X] T040 [US1] Implement score handler (errorsâ†’400/422/503) + wire POST route in `src/server/api/score-handler.ts` and `src/app/api/v1/score/route.ts` (depends on T037, T038)
- [X] T041 [P] [US1] Implement typed browser API client in `src/services/api-client.ts`
- [X] T042 [P] [US1] Implement reusable UI primitives (Button, Card, Chip, Field, ScoreBadge) in `src/components/ui/`
- [X] T043 [P] [US1] Implement InterestPicker in `src/components/InterestPicker.tsx`
- [X] T044 [P] [US1] Implement RangeControl (minutes / fixed distance) in `src/components/RangeControl.tsx`
- [X] T045 [US1] Implement ScoreView + scoring page client component (submit disabled until a type + location; FR-010) in `src/components/ScoreView.tsx` and `src/app/page.tsx`

**Checkpoint**: US1 is a fully functional, independently testable MVP

---

## Phase 4: User Story 2 - Understand the score (Priority: P2)

### Tests for User Story 2 (write first, must fail) âš ï¸

- [X] T046 [P] [US2] API test: contributions include places + walking time, incl. zero-contribution types (FR-011/013) in `e2e/api.spec.ts`
- [X] T047 [P] [US2] API test: a type with no coverage returns `coverage="no-data"` (FR-015) in `e2e/api.spec.ts`
- [ ] T048 [P] [US2] API test: score response is logged with an explanation (assert via server log capture) (Constitution III) in `e2e/api.spec.ts`
- [X] T049 [P] [US2] E2E: breakdown shows per-type rows, places, zero & no-data states, top contributor emphasized in `e2e/ui.spec.ts`

### Implementation for User Story 2

- [X] T050 [US2] Populate `TypeContribution` (places, boundedScore, coverage) in `src/server/services/scoring-service.ts`
- [X] T051 [US2] Add score-explanation logging in `src/server/services/scoring-service.ts`
- [X] T052 [P] [US2] Implement BreakdownView in `src/components/BreakdownView.tsx`
- [X] T053 [US2] Order breakdown by bounded per-type score and emphasize top contributor (SC-003) in `src/components/BreakdownView.tsx`
- [X] T054 [US2] Wire breakdown into the scoring page in `src/app/page.tsx`

---

## Phase 5: User Story 3 - Weight interests (Priority: P3)

### Tests for User Story 3 (write first, must fail) âš ï¸

- [ ] T055 [P] [US3] API test: changing importance changes both scores; omitted â‡’ medium (FR-009) in `e2e/api.spec.ts`
- [ ] T056 [P] [US3] E2E: importance controls update the score in `e2e/ui.spec.ts`

### Implementation for User Story 3

- [ ] T057 [US3] Ensure schema + service pass per-interest importance (default medium) in `src/server/api/schemas/score.ts` and `src/server/services/scoring-service.ts`
- [ ] T058 [P] [US3] Implement ImportanceControl in `src/components/ImportanceControl.tsx`
- [ ] T059 [US3] Wire importance changes to re-score in `src/app/page.tsx`

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T060 [P] Calibration harness + dataset; compare primary vs secondary ranking (SC-002) in `e2e/calibration.spec.ts`
- [ ] T061 Record calibration outcome + chosen mode (sunset) in `specs/001-location-poi-scoring/research.md`
- [ ] T062 [P] Performance check within SC-001; validate candidate cap N in `e2e/performance.spec.ts`
- [ ] T063 [P] Run quickstart.md validation scenarios end-to-end
- [ ] T064 [P] Add `README.md` (setup, env vars, run, test)
- [ ] T065 Constitution compliance review of the diff

---

## Dependencies & Execution Order

- **Setup (Phase 1)** â†’ **Foundational (Phase 2, blocks all stories)** â†’ **US1 â†’ US2 â†’ US3** â†’ **Polish**
- US1 has no cross-story dependency (the MVP). US2 surfaces data US1 already computes. US3 adds importance plumbing onto US1's weighted aggregate.

### Within a story

- Tests written FIRST and must FAIL before implementation (API and E2E)
- Domain (pure) â†’ service â†’ API handlers â†’ Route Handlers â†’ UI
- Adapters before the service that orchestrates them

### Parallel Opportunities

- Setup: T003â€“T005 parallel
- Foundational: T006â€“T011 parallel; T014/T015 after T012/T013
- US1 tests: T017â€“T029 parallel (cases across `e2e/api.spec.ts` + `e2e/ui.spec.ts`)
- US1 impl: T030/T031 parallel; T034/T038/T041/T042/T043/T044 parallel

---

## Notes

- [P] = different files, no incomplete-task dependency
- Verify tests fail before implementing (Constitution I)
- Provider calls stay behind adapters; domain stays pure and deterministic
- Code quality (Constitution V): DRY, self-documenting names, single-responsibility modules
- UI (Constitution V): Tailwind utility classes; extract repeated markup/classes into reusable
  components in `src/components/ui/` (Button, Card, Chip, Field, ScoreBadge) reused across features
- Playwright runs against a test-mode server (`APTSCORE_TEST_MODE=1`) wired with fixture adapters;
  sentinel queries drive error paths (`nowhere`â†’422, `provider-outage`â†’503)
- Commit after each task or logical group


