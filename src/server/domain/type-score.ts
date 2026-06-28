import { computePlaceValue, type RangeBudget } from './place-value';
import type { NearbyPlace } from './types';

/** Per-type raw score: linear sum of in-range place values, no diminishing returns (FR-007). */
export const computeTypeRawSum = (places: NearbyPlace[], budget: RangeBudget): number =>
  places.reduce((sum, place) => sum + computePlaceValue(place, budget), 0);

/** Bounded 0–100 per-type score against the per-type ideal ceiling K (FR-008 secondary). */
export const computeTypeBoundedScore = (rawSum: number, idealCeilingK: number): number =>
  Math.min(100, (rawSum / idealCeilingK) * 100);
