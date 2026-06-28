# Implementation Plan: Location POI Scoring

**Branch**: `001-location-poi-scoring` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-location-poi-scoring/spec.md`

## Summary

Score a single user-provided location against a curated set of interest types (groceries, transit,
cafés, …). For each selected type, find places within an effective range (default 20-minute walk,
overridable), weight each place 80% by walking proximity and 20% by rating (neutral for
unrated/low-review places), and sum them linearly per type. Combine types two ways from the same
data: a **primary unbounded** importance-weighted sum (user-facing) and a **secondary bounded
0–100** importance-weighted average (interpretation + calibration), with a defined sunset to drop
one after calibration. Walking measurement uses a routing provider and **fails closed** if routing
is unavailable.

Technical approach: a single TypeScript **Next.js (App Router)** application — the scoring API lives
in Route Handlers under `/api/v1`, and the UI is React Server/Client Components styled with Tailwind.
The pure scoring domain plus external place-data and routing capabilities sit behind mockable
adapters in `src/server`, so scoring logic is deterministic and unit-testable in isolation.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) on Node.js 20 LTS

**Primary Dependencies**: Next.js 14 (App Router) — React UI + Route Handlers for the API,
Tailwind CSS (utility-first styling), Zod (request/domain validation), Pino (structured logging),
Playwright (E2E browser + API tests), native `fetch` (provider calls). Provider choices resolved in
research.md (POI data + walking-route measurement).

**Storage**: None for v1 — scoring is stateless. The category→provider-category mapping and tunable
constants are static configuration. (No database; revisit only if saved scores/accounts are added,
which are out of scope.)

**Testing**: Playwright for everything — API tests (via the `request` fixture) cover the scoring
math, contract shapes, fail-closed, determinism, and range modes against a **test-mode server** that
uses deterministic fixture adapters; browser E2E tests cover the UI journeys. No separate unit
runner; scoring behavior is asserted through the `/api/v1` endpoints.

**Target Platform**: Node.js server (Next.js) + modern evergreen browsers

**Project Type**: Web application (single Next.js full-stack app)

**Performance Goals**: A score request completes in well under the SC-001 1-minute budget; target
p95 < 3 s end-to-end including provider calls, achieved partly via the per-type candidate cap
(FR-016) and a batched walking-duration lookup.

**Constraints**: Deterministic scoring given the same provider responses (FR-014); fail-closed on
routing outage (FR-012); provider calls isolated, timed out, and mockable; secrets via environment
only; TypeScript `strict`, no unjustified `any`.

**Scale/Scope**: Single-location scoring, single concurrent user class (no auth) for v1; ~14 interest
types; small codebase (two packages). Not optimized for high concurrency in v1.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `.specify/memory/constitution.md` v1.0.0:

- **I. Test-First (NON-NEGOTIABLE)** — PASS (planned). Playwright API tests for the scoring math
  (per-place blend, linear sum, both aggregation modes, weighting) and endpoint contracts are written
  first, run against a test-mode server with deterministic fixture adapters (no network); browser E2E
  tests cover the UI journeys.
- **II. Simplicity & YAGNI** — PASS *with one tracked exception*. Stateless, no DB, no auth, static
  config. The **dual scoring modes** add complexity; justified and time-boxed in Complexity Tracking
  (sunset after SC-002 calibration). Provider **adapters** are required by the constitution itself
  (provider isolation), so they are not speculative.
- **III. Observability** — PASS (planned). Pino structured logging; every score is explainable via
  the breakdown (contributing places, walking times, per-type contributions, both scores) and
  reconstructable from logs. No bare `console.log` in committed paths.
- **IV. API & Contract Stability** — PASS (planned). Versioned `/api/v1` Route Handlers; contracts in
  `contracts/` with contract tests (driving the handlers directly) as the source of truth;
  additive-by-default evolution.
- **V. Code Quality & Reuse** — PASS (planned). Pure-domain functions are single-responsibility and
  self-documenting; provider logic is shared behind adapters (no duplication); the UI uses Tailwind
  with repeated patterns extracted into reusable components in `src/components/`.
- **Technology & Data Constraints** — PASS. TS strict; geo/POI + routing behind a single adapter
  each, mockable, with timeouts/retries and **fail-closed** degradation; deterministic (inject
  provider responses + clock); secrets from env.
- **Development Workflow & Quality Gates** — PASS. Plan re-checked post-design; tests are a merge
  gate; lint/format in CI.

**One deliberate exception to flag**: the headline (primary) score is **intentionally unbounded**
during calibration, which runs against the spirit of an easily-interpretable bounded score. This is
accepted as time-boxed (see Complexity Tracking + spec sunset) and mitigated by always showing the
bounded secondary score in the breakdown.

## Project Structure

### Documentation (this feature)

```text
specs/001-location-poi-scoring/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI + notes)
│   ├── openapi.yaml
│   └── README.md
└── tasks.md             # Phase 2 output (/speckit-tasks - NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # root layout (loads Tailwind globals)
│   ├── page.tsx                # the scoring page (renders the client UI)
│   ├── globals.css             # Tailwind directives
│   └── api/v1/
│       ├── interest-types/route.ts   # GET /api/v1/interest-types
│       └── score/route.ts            # POST /api/v1/score
├── server/                     # Server-only code (never shipped to the browser)
│   ├── domain/                 # Pure scoring logic (no I/O) — fully unit-tested
│   │   ├── place-value.ts      # 80/20 proximity+rating blend; neutral rating handling
│   │   ├── type-score.ts       # linear sum per type (no diminishing returns)
│   │   ├── aggregate.ts        # primary (unbounded) + secondary (bounded K) scores
│   │   ├── weights.ts          # low/med/high → ×1/×2/×3
│   │   ├── constants.ts        # tunable named constants
│   │   ├── types.ts            # domain & transfer types
│   │   └── errors.ts           # typed errors → HTTP status
│   ├── adapters/               # Provider isolation (mockable)
│   │   ├── places/             # POI lookup + geocode + category mapping
│   │   └── routing/            # walking durations/distances; fail-closed
│   ├── services/scoring-service.ts   # orchestrates: resolve → candidates → route → score
│   ├── api/                    # framework-agnostic handlers + Zod schemas
│   ├── config/                 # interest-type registry, env, logger
│   ├── lib/geo.ts              # haversine helper
│   └── container.ts            # builds the service with real adapters from env
├── components/                 # Reusable UI (ui/* primitives) + feature components
├── services/api-client.ts      # typed browser client for /api/v1
└── types.ts                    # shared API types

e2e/                            # Playwright tests
├── api.spec.ts                 # /api/v1 tests (scoring math, contract, fail-closed, determinism)
└── ui.spec.ts                  # browser journeys (pick types → score → result)
playwright.config.ts            # starts a test-mode Next server (fixture adapters)
```

**Structure Decision**: A single Next.js App Router application. The scoring **domain** stays pure and
I/O-free in `src/server/domain` (tested first, deterministic); **adapters** wrap the two external
providers behind interfaces; the **service** orchestrates them; **Route Handlers** under
`src/app/api/v1` expose the API by delegating to framework-agnostic handlers (so tests drive the
handlers directly with mock adapters — no running server needed). The UI is React + Tailwind with
reusable components.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Dual scoring modes (unbounded primary + bounded 0–100 secondary) | Stakeholder wants to empirically compare which ranking is more sensible before committing; both are computed from one shared pipeline and differ only at the final aggregation step | A single mode was rejected because the choice between "raw, comparison-meaningful" and "bounded, interpretable" is genuinely undecided; picking one now risks building the wrong one. Mitigated by a **sunset**: after scoring the SC-002 calibration set, keep the better ranker and delete the other aggregation function. |
| Unbounded headline score (tension with interpretable-score expectation) | The primary score must be raw to preserve the comparison signal during calibration | Forcing a bound now would pre-decide the very question the dual-mode experiment exists to answer. Mitigated by always showing the bounded secondary score in the breakdown for interpretability. |
