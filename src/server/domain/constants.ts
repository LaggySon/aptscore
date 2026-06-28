/**
 * Tunable scoring constants — the single source of truth for the scoring model.
 *
 * These are centralized (per spec Assumptions) so the model can be calibrated without
 * touching logic. Changing a value here changes behavior everywhere it is used.
 */

/** Weights and thresholds that shape a single place's contribution and the bounded score. */
export const SCORING = {
  /** Share of a place's value from walking proximity vs. rating (FR-005). Must sum to 1. */
  proximityWeight: 0.8,
  ratingWeight: 0.2,
  /** Rating scale assumed from the data provider (1–5). */
  maxRating: 5,
  /** Neutral rating applied to unrated / low-review places (FR-006). */
  neutralRating: 3,
  /** Minimum reviews before a rating counts; below this it is treated as unrated (FR-006). */
  minReviewsForRating: 5,
  /** Per-type "ideal places" ceiling K for the bounded 0–100 score (FR-008 secondary). */
  idealPlacesCeiling: 5,
  /** Max candidate places routed per type, to bound response time (FR-016). */
  candidateCapPerType: 20,
} as const;

/** Catchment defaults and the walking-speed used only to pre-filter candidates. */
export const RANGE = {
  /** Default catchment when the user does not override it (FR-003). */
  defaultMinutes: 20,
  /** Walking speed used ONLY to size the straight-line candidate pre-filter (not scoring). */
  walkingMetersPerMinute: 85,
} as const;

/** Importance level → score multiplier (FR-009 / US3). */
export const IMPORTANCE_MULTIPLIER = { low: 1, medium: 2, high: 3 } as const;

/** Default importance when the user has not chosen one (FR-009). */
export const DEFAULT_IMPORTANCE = 'medium' as const;

/** Routing call budget before failing closed (FR-012). */
export const ROUTING = { timeoutMs: 5000, retries: 2 } as const;
