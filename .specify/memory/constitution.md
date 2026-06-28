<!--
Sync Impact Report
Version change: 1.0.0 → 1.1.0
Bump rationale: MINOR — added a new principle (V. Code Quality & Reuse) and a frontend styling
  constraint; existing principles unchanged.
Modified principles: none renamed/redefined.
Added sections:
  - Principle "V. Code Quality & Reuse"
  - Technology & Data Constraints: Tailwind CSS styling + reusable-component constraint
Removed sections: none
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ aligned (Constitution Check gate reads this file dynamically)
  - .specify/templates/spec-template.md ✅ aligned (principle-agnostic; standards stay out of spec)
  - .specify/templates/tasks-template.md ⚠ "Tests are OPTIONAL" still conflicts with Principle I; tasks
    generation MUST continue to emit test tasks.
Downstream artifacts updated for v1.1.0:
  - specs/001-location-poi-scoring/plan.md (Tailwind in dependencies; Principle V in Constitution Check)
  - specs/001-location-poi-scoring/tasks.md (Tailwind setup; reusable-component framing)
Follow-up TODOs: none.

Prior history:
- 1.0.0 (2026-06-28): Initial ratification. I. Test-First, II. Simplicity & YAGNI, III. Observability,
  IV. API & Contract Stability; sections Technology & Data Constraints and Development Workflow.
-->

# aptscore Constitution
<!-- Location-aware apartment scoring: users define the points of interest that matter to them
     (bookstores, public transit, breweries/pubs, etc.) and receive a proximity score for any location. -->

## Core Principles

### I. Test-First (NON-NEGOTIABLE)

Every behavioral change MUST be driven by a test written before the implementation.
The cycle is Red → Green → Refactor: write a failing test, get it approved as the
correct specification of behavior, watch it fail, then write the minimum code to pass.

- Scoring logic (distance calculation, weighting, ranking) MUST have unit tests covering
  representative and boundary inputs before the logic is written.
- Every API endpoint MUST have a contract test asserting its request/response shape.
- A pull request that adds or changes behavior without an accompanying test that would have
  failed beforehand MUST NOT be merged.

**Rationale**: Scores drive user decisions about where to live; silent regressions in scoring
math erode trust irrecoverably. Tests written first are the only durable specification of
correct scoring behavior.

### II. Simplicity & YAGNI

Build the simplest thing that satisfies the current, agreed requirement. Speculative
generality, premature abstraction, and "we might need it later" features are prohibited.

- Add a dependency, service, or abstraction only when a concrete present requirement demands it.
- Prefer flat, obvious data flow over configurable indirection.
- Any deviation that adds structural complexity MUST be recorded in the plan's Complexity
  Tracking table with the rejected simpler alternative and why it was insufficient.

**Rationale**: A scoring app's value is in correct, legible logic. Accidental complexity hides
bugs in exactly the math users rely on and slows every future change.

### III. Observability

System behavior MUST be inspectable without a debugger. Structured, leveled logging is required,
and scoring outcomes MUST be explainable.

- Use structured (JSON-serializable) logs with explicit levels; no bare `console.log` in
  committed code paths.
- A computed score MUST be traceable: which points of interest, distances, and weights produced
  it MUST be reconstructable from logs or an explain/debug output.
- Errors MUST be logged with enough context (inputs, location, failing external call) to
  reproduce them.

**Rationale**: "Why did this location score 72?" is the core user and support question. The
system must be able to answer it from its own records.

### IV. API & Contract Stability

External contracts (HTTP API request/response shapes, persisted data schemas) are versioned and
backward-compatible within a major version.

- Every endpoint has an explicit, documented contract; the contract test is the source of truth.
- Breaking changes (removing/renaming fields, changing types or semantics) require a major
  version bump and a documented migration path.
- Additive, backward-compatible changes are minor; clarifications and fixes are patch.

**Rationale**: A web frontend and any future integrations depend on stable contracts; uncoordinated
breakage produces hard-to-diagnose failures across layers.

### V. Code Quality & Reuse

Code MUST be DRY, self-documenting, and organized for reuse.

- **DRY**: A piece of knowledge (logic, constant, type, UI pattern) has a single source of truth.
  Duplicated logic MUST be extracted into a shared function/module/component rather than copied.
- **Self-documenting**: Names reveal intent; functions are small and single-purpose. Comments
  explain *why*, not *what* — if code needs a comment to explain what it does, prefer clearer code.
- **Organization**: Clear module boundaries and one responsibility per module; related code lives
  together and follows a consistent, predictable structure.
- **Reusable components**: UI is composed of small, reusable components; shared primitives are
  extracted instead of repeating markup or styling. Build the reusable component when a pattern
  appears a second time (consistent with II — do not over-abstract on first use).

**Rationale**: aptscore's value is correct, legible scoring logic and a coherent UI; duplication and
sprawl hide bugs and slow every change. Reuse and clarity keep the codebase changeable as it grows.

## Technology & Data Constraints

- **Stack**: TypeScript on Node.js, delivered as a single Next.js (App Router) application — React
  UI plus Route Handlers for the API. TypeScript `strict` mode MUST be enabled; new code MUST NOT
  introduce `any` without an inline justification comment.
- **Frontend styling**: Tailwind CSS (utility-first). Repeated class combinations or markup MUST be
  extracted into reusable components (per Principle V) rather than copy-pasted across the UI.
- **External geo/POI data**: Calls to map, geocoding, or points-of-interest providers MUST be
  isolated behind a single adapter module, mockable in tests, and resilient to provider
  failure (timeouts, retries, graceful degradation rather than crashing a score request).
- **Determinism**: Given the same inputs and the same provider responses, a score MUST be
  reproducible. Non-deterministic inputs (time, randomness) MUST be injected, not read ambiently.
- **Secrets**: API keys and credentials MUST come from environment configuration, never committed
  to the repository.

## Development Workflow & Quality Gates

- **Constitution Check**: `/speckit-plan` MUST evaluate the feature against these principles
  before Phase 0 and again after design. Violations block progress until justified in the
  Complexity Tracking table.
- **Tests gate**: CI MUST run the test suite; merges require a green suite. Per Principle I, test
  tasks are mandatory for behavioral work even though the generic tasks template marks them optional.
- **Review**: Every change is reviewed against this constitution. Reviewers MUST confirm
  test-first evidence, simplicity, observability, contract stability, and code quality & reuse
  (DRY, self-documenting, reusable components) before approval.
- **Lint/format**: Linting and formatting MUST pass in CI; style is not a review discussion.

## Governance

This constitution supersedes other process conventions. Where guidance conflicts, the constitution
wins.

- **Amendments** require a documented change (this file), a version bump per the policy below, and
  an updated Sync Impact Report. Amendments that change mandated practice also require updating any
  affected `.specify/templates/*` files.
- **Versioning policy** (semantic):
  - MAJOR: removing or redefining a principle in a backward-incompatible way.
  - MINOR: adding a principle/section or materially expanding mandated guidance.
  - PATCH: clarifications, wording, and non-semantic refinements.
- **Compliance**: All plans, specs, tasks, and pull requests MUST be checkable against these
  principles. Unjustifiable complexity is grounds for rejection.

**Version**: 1.1.0 | **Ratified**: 2026-06-28 | **Last Amended**: 2026-06-28
