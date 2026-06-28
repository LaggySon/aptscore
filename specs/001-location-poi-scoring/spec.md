# Feature Specification: Location POI Scoring

**Feature Branch**: `001-location-poi-scoring`

**Created**: 2026-06-28

**Status**: Draft (refined via grilling session)

**Input**: User description: "score a single location against a user-defined set of points of interest."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Score a location against chosen points of interest (Priority: P1)

A person evaluating where to live picks the kinds of places that matter to them (for example
bookstores, public transit, and breweries/pubs), provides a single location (such as an address),
and receives an overall score reflecting how well that location is served by the things they care
about within walking distance.

**Why this priority**: This is the core value of the product and the smallest slice that delivers
it. Without an overall score for a single location against chosen interests, nothing else matters.
It is a complete, demonstrable MVP on its own.

**Independent Test**: Select two or more interest types, enter a known address, and confirm the
system returns an overall score for that address. A location surrounded by the chosen interests
scores noticeably higher than one where those interests are far away or absent.

**Acceptance Scenarios**:

1. **Given** a user has selected at least one interest type, **When** they submit a valid location,
   **Then** the system returns an overall score for that location.
2. **Given** a location with many of the chosen interests within walking range, **When** it is
   scored, **Then** its score is higher than that of a location with few or none in range.
3. **Given** a user has selected no interest types, **When** they attempt to score a location,
   **Then** the system prevents scoring and prompts them to choose at least one interest.

---

### User Story 2 - Understand why a location scored the way it did (Priority: P2)

After scoring a location, the user can see a breakdown showing how each selected interest type
contributed, including which nearby places counted and their walking time/distance, alongside a
secondary normalized (0–100) view of the score to aid interpretation.

**Why this priority**: A bare number — especially the unbounded primary score — is not trustworthy
or interpretable on its own. Users need to understand and verify the result before acting on it.
This builds directly on US1 and makes the result credible, but the product still delivers value
without it.

**Independent Test**: Score a location, open the breakdown, and confirm each selected interest type
shows its own contribution, the specific nearby places and their walking time/distance that drove
it, and that the per-type contributions reconcile with the overall score(s).

**Acceptance Scenarios**:

1. **Given** a scored location, **When** the user views the breakdown, **Then** each selected
   interest type shows its individual contribution to the overall score.
2. **Given** a scored location, **When** the user views the breakdown, **Then** for each interest
   type the system shows the contributing places and their walking time/distance from the location.
3. **Given** an interest type with no places within range, **When** the user views the breakdown,
   **Then** that type is shown as contributing zero rather than being omitted.
4. **Given** a scored location, **When** the user views the breakdown, **Then** both the primary
   (unbounded) score and the secondary normalized 0–100 score are shown and clearly labeled.

---

### User Story 3 - Weight interests by personal importance (Priority: P3)

The user assigns an importance level (low, medium, high) to each selected interest type so the
overall score reflects their personal priorities (for example, public transit matters far more than
pubs). Every selected type defaults to medium, so untouched selections are weighted equally.

**Why this priority**: Personalization meaningfully improves relevance, but the product is usable
with equal weighting first. This layers on top of US1/US2 once core scoring and explanation exist.

**Independent Test**: Score a location with default (equal) importance, then raise the importance of
one well-served interest type and confirm the overall score rises; lower a well-served type and
confirm it falls — without the underlying nearby places changing.

**Acceptance Scenarios**:

1. **Given** multiple selected interest types, **When** the user raises one type's importance,
   **Then** that type's influence on the overall score increases relative to the others.
2. **Given** a location already scored, **When** the user changes importance levels, **Then** both
   overall scores update to reflect the new priorities.
3. **Given** the user has not changed any importance levels, **When** a location is scored, **Then**
   all selected interest types are treated as equally important (medium) by default.

---

### Edge Cases

- **Location not resolvable**: If the provided location cannot be recognized/resolved, the system
  rejects it with a clear message and returns no score.
- **No places in range for a type**: That type contributes zero (lowest), shown explicitly in the
  breakdown; it is not an error.
- **No places in range for any type**: The location receives the lowest possible score, with a
  breakdown showing zero contributions across the board.
- **Routing unavailable**: Because range and proximity depend on actual walking measurement, if the
  routing capability is unavailable or times out the system fails closed — it produces no score and
  tells the user it cannot be produced right now (it does NOT silently fall back to an approximation).
- **Place has no rating or too few reviews**: Treated as a neutral mid-scale rating, neither
  rewarded nor penalized.
- **Interest type has no data coverage for the area**: The user is told that type cannot be scored
  for this location.
- **Very dense areas**: The number of places evaluated per type is capped to bound response time;
  the primary score remains unbounded by design while the secondary score saturates at 100.
- **Near-identical locations**: Given the same underlying data, two near-identical locations score
  consistently (determinism).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let a user select one or more interest types from a curated supported set
  (see Supported Interest Types below) before scoring.
- **FR-002**: System MUST accept a single location identified by the user (such as an address) and
  resolve it to a point, or reject it with a clear message if it cannot be resolved.
- **FR-003**: System MUST evaluate each selected interest type within an effective range that
  defaults to a **20-minute walk**, and MUST let the user override the range to a different number of
  walking minutes or to a fixed physical distance. Both range modes are measured by actual walking
  (routing), not straight-line distance.
- **FR-004**: System MUST identify places of each selected type within the effective range. Places
  outside the range MUST contribute nothing to the score.
- **FR-005**: Each in-range place MUST contribute a value combining proximity and quality, weighted
  **80% proximity / 20% rating**, where the proximity component scales linearly from full value at
  the location to zero at the edge of the range based on walking time/distance.
- **FR-006**: The rating component MUST use the place's provider rating normalized to its scale; a
  place with no rating, or with fewer reviews than a configurable minimum-review threshold, MUST be
  treated as a neutral mid-scale rating.
- **FR-007**: Each interest type's per-type score MUST be the linear sum of its in-range place
  values (no diminishing returns).
- **FR-008**: System MUST compute two overall scores per request from the same per-type data:
  - **Primary (user-facing), unbounded**: the importance-weighted sum of per-type raw sums.
  - **Secondary, bounded 0–100**: each type scaled against a configurable per-type "ideal places"
    ceiling (K), combined as an importance-weighted average.
  Both are returned; the primary is presented as the headline score and the secondary supports
  interpretation and calibration. (See Assumptions: the dual-score arrangement is temporary with a
  defined sunset.)
- **FR-009**: System MUST let the user assign relative importance (low / medium / high) to each
  selected interest type, defaulting to medium for all. Changing weights MUST change both overall
  scores.
- **FR-010**: System MUST require at least one selected interest type and prevent scoring otherwise.
- **FR-011**: System MUST show every selected interest type in the breakdown, including those that
  contribute zero, rather than omitting them.
- **FR-012**: When the routing capability needed to measure walking range/proximity is unavailable
  or times out, System MUST fail closed: produce no score and inform the user, rather than returning
  a partial, approximate, or misleading score.
- **FR-013**: System MUST provide a per-interest-type breakdown including each type's contribution,
  the contributing places with their walking time/distance, and both overall scores.
- **FR-014**: System MUST ensure that, given the same location, the same selected interests and
  weights, and the same underlying provider responses, repeated scoring produces identical results.
- **FR-015**: System MUST clearly indicate when a selected interest type has no data coverage for the
  given location.
- **FR-016**: System MUST bound response time by limiting the number of candidate places evaluated
  per interest type to a configurable maximum (the nearest candidates).

### Supported Interest Types (v1)

A curated set, each mapped onto the underlying place-data provider's categories:

1. Groceries / supermarkets
2. Public transit
3. Cafés
4. Restaurants
5. Parks / green space
6. Pharmacy
7. Bookstores
8. Bars / pubs
9. Gyms / fitness
10. Schools (childcare, primary, secondary)
11. Healthcare (GP / clinic)
12. Libraries
13. Bakeries
14. Banks / ATMs

User-defined custom categories beyond this set are out of scope for v1.

### Key Entities *(include if feature involves data)*

- **Location**: The single place being evaluated, identified by user input and resolved to a point.
- **Interest Type**: A supported category the user cares about, carrying an importance level
  (low/medium/high) and contributing via its in-range places.
- **Range Setting**: The effective catchment — default 20-minute walk, overridable to other walking
  minutes or a fixed physical distance; always measured by walking.
- **Nearby Place**: An individual place of a given interest type within range, with its walking
  time/distance from the location, provider rating, and review count.
- **Score Result**: The primary (unbounded) overall score, the secondary (0–100) overall score, and
  the per-type contributions plus the contributing places that produced them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from selecting interest types and entering a location to seeing a score
  in under 1 minute.
- **SC-002**: Against a curated calibration set of locations with known surroundings, the score ranks
  well-served locations above poorly-served ones in at least 95% of pairwise comparisons. This set is
  also the basis for deciding which of the two scoring modes to keep (see Assumptions).
- **SC-003**: For any scored location, a user can identify which interest type contributed most
  within 15 seconds of opening the breakdown (aided by the secondary 0–100 view).
- **SC-004**: Scoring the same location with the same inputs and underlying data returns identical
  results 100% of the time.
- **SC-005**: At least 90% of first-time users successfully produce a score and locate the top
  contributing interest type in the breakdown without external help.

## Assumptions

- **Scope**: A single location at a time; comparing or ranking multiple locations side by side is out
  of scope for this feature.
- **Scoring model is intentionally dual and temporary**: The unbounded primary and bounded (0–100)
  secondary scores run in parallel during calibration. Sunset condition: after scoring the SC-002
  calibration set, retain whichever mode ranks locations more sensibly and drop the other.
- **Tunable constants** (named, changeable without a spec change): the 80/20 proximity/rating split;
  the per-type "ideal places" ceiling K (initial value 5); the minimum-review threshold for a rating
  to count; the default 20-minute walking range; and the per-type cap on candidate places evaluated.
- **Rating scale**: Assumed to be a provider 1–5 rating; unrated or below-threshold places are
  treated as neutral (3/5).
- **Walking measurement**: Both range modes (minutes and fixed distance) use actual walking via a
  routing capability; straight-line distance may be used only internally to pre-select candidates
  before routing.
- **External dependencies**: Two external capabilities are assumed — place/POI data and walking-route
  measurement — each isolated behind an adapter and mockable for testing. Data coverage and
  availability depend on these providers.
- **Importance weighting** uses relative levels (low/medium/high → ×1/×2/×3) with medium as the
  default, rather than precise percentages.
- **Out of scope**: Authentication, saving/sharing scores, multi-location comparison, user-defined
  custom categories, and offline use.
