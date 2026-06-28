/** Typed domain errors. The API layer maps these to HTTP status codes. */

/** The provided location could not be resolved to a point (FR-002 → HTTP 422). */
export class LocationUnresolved extends Error {
  readonly code = 'location_unresolved';
  constructor(query: string) {
    super(`Could not resolve location: "${query}"`);
    this.name = 'LocationUnresolved';
  }
}

/**
 * A score cannot be produced right now — e.g. the routing/places provider is
 * unavailable. The system fails closed rather than returning a partial score
 * (FR-012 → HTTP 503).
 */
export class ScoringUnavailable extends Error {
  readonly code = 'scoring_unavailable';
  constructor(message = 'Scoring is temporarily unavailable') {
    super(message);
    this.name = 'ScoringUnavailable';
  }
}
