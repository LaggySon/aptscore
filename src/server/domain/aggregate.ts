import { importanceMultiplier } from './weights';
import type { TypeContribution } from './types';

/** Primary (unbounded) overall score: importance-weighted sum of per-type raw sums (FR-008). */
export const computePrimaryScore = (contributions: TypeContribution[]): number =>
  contributions.reduce(
    (sum, c) => sum + importanceMultiplier(c.importance) * c.rawSum,
    0,
  );

/**
 * Secondary (0–100) overall score: importance-weighted average of bounded per-type
 * scores (FR-008). Returns 0 when there are no weighted contributions.
 */
export const computeSecondaryScore = (contributions: TypeContribution[]): number => {
  const totalWeight = contributions.reduce(
    (w, c) => w + importanceMultiplier(c.importance),
    0,
  );
  if (totalWeight === 0) return 0;
  const weightedSum = contributions.reduce(
    (s, c) => s + importanceMultiplier(c.importance) * c.boundedScore,
    0,
  );
  return weightedSum / totalWeight;
};
