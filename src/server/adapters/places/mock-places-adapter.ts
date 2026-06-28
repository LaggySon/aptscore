import type { LatLng, PlacesAdapter } from './places-adapter';
import type { CandidatePlace, ResolvedLocation, TypeCandidates } from '../../domain/types';
import { LocationUnresolved, ScoringUnavailable } from '../../domain/errors';
import { haversineMeters } from '../../lib/geo';

/** Deterministic fixtures for tests — no network, no clock. */
export interface MockPlacesConfig {
  /** Default point that resolvable queries map to. */
  point?: LatLng;
  /** Per-query coordinate overrides (e.g. a far-away "poorly-served" location). */
  points?: Record<string, LatLng>;
  /** Queries that should fail to resolve (FR-002 → 422). */
  unresolvedQueries?: string[];
  /** Queries that simulate a provider outage (FR-012 → 503). */
  outageQueries?: string[];
  /** Candidate places keyed by interest type id. */
  candidates?: Record<string, CandidatePlace[]>;
  /** Types reported as having no provider coverage (FR-015). */
  noDataTypes?: string[];
}

export class MockPlacesAdapter implements PlacesAdapter {
  constructor(private readonly config: MockPlacesConfig = {}) {}

  async resolveLocation(query: string): Promise<ResolvedLocation> {
    if (this.config.outageQueries?.includes(query)) throw new ScoringUnavailable();
    if (this.config.unresolvedQueries?.includes(query)) throw new LocationUnresolved(query);
    const point = this.config.points?.[query] ?? this.config.point ?? { lat: 0, lng: 0 };
    return { query, lat: point.lat, lng: point.lng, resolved: true };
  }

  async findNearby(
    center: LatLng,
    typeIds: string[],
    radiusMeters: number,
  ): Promise<TypeCandidates[]> {
    const noData = new Set(this.config.noDataTypes ?? []);
    return typeIds.map((typeId) => {
      if (noData.has(typeId)) return { typeId, coverage: 'no-data', places: [] };
      const places = (this.config.candidates?.[typeId] ?? [])
        .map((place) => ({ ...place, straightLineMeters: haversineMeters(center, place) }))
        .filter((place) => place.straightLineMeters <= radiusMeters);
      return { typeId, coverage: 'ok', places };
    });
  }
}
