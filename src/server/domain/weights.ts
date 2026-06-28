import { IMPORTANCE_MULTIPLIER } from './constants';
import type { ImportanceLevel } from './types';

/** Importance level → its score multiplier (FR-009): low=1, medium=2, high=3. */
export const importanceMultiplier = (level: ImportanceLevel): number =>
  IMPORTANCE_MULTIPLIER[level];
