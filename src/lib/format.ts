/** Format a walking duration (seconds) as a friendly "~N min" (at least 1). */
export const formatWalkMinutes = (seconds: number): string =>
  `${Math.max(1, Math.round(seconds / 60))} min`;
