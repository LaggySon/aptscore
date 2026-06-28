import { SCORING } from './constants';
import type { NearbyPlace, RangeMode } from './types';

/** The scoring budget along the active range dimension (FR-003). */
export interface RangeBudget {
  mode: RangeMode;
  /** Max walking seconds (minutes mode) or meters (distance mode). */
  max: number;
}

/** A place's distance along the active range dimension (walking time or distance). */
export const distanceInBudget = (place: NearbyPlace, budget: RangeBudget): number =>
  budget.mode === 'minutes' ? place.walkingSeconds : place.walkingMeters;

/** Whether a place falls within the catchment (FR-004). */
export const isInRange = (place: NearbyPlace, budget: RangeBudget): boolean =>
  distanceInBudget(place, budget) <= budget.max;

/** Rating used for scoring; unrated or low-review places fall back to neutral (FR-006). */
export const effectiveRating = (place: NearbyPlace): number => {
  const hasUsableRating =
    place.rating !== null && place.reviewCount >= SCORING.minReviewsForRating;
  return hasUsableRating ? (place.rating as number) : SCORING.neutralRating;
};

/** The components behind a single place's value — surfaced for full explainability. */
export interface PlaceValueBreakdown {
  /** Final value in [0,1] (FR-005). */
  value: number;
  /** Proximity component in [0,1]: 1 at the location, 0 at the range edge. */
  proximityPart: number;
  /** Rating component in [0,1]: effectiveRating / maxRating. */
  ratingPart: number;
  /** The rating actually used (neutral when unrated/low-review). */
  effectiveRating: number;
}

/**
 * Value of a single place and its components (FR-005): 80% walking proximity + 20%
 * rating. Proximity decays linearly from 1 at the location to 0 at the range edge over
 * the active dimension. Places outside the range contribute nothing (FR-004).
 */
export const computePlaceValueBreakdown = (
  place: NearbyPlace,
  budget: RangeBudget,
): PlaceValueBreakdown => {
  const rating = effectiveRating(place);
  const ratingPart = rating / SCORING.maxRating;
  if (!isInRange(place, budget)) {
    return { value: 0, proximityPart: 0, ratingPart, effectiveRating: rating };
  }
  const proximityPart = 1 - distanceInBudget(place, budget) / budget.max;
  const value = SCORING.proximityWeight * proximityPart + SCORING.ratingWeight * ratingPart;
  return { value, proximityPart, ratingPart, effectiveRating: rating };
};

/** Value of a single place in [0,1] (FR-005). */
export const computePlaceValue = (place: NearbyPlace, budget: RangeBudget): number =>
  computePlaceValueBreakdown(place, budget).value;
