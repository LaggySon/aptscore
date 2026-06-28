import type { ResolvedLocation, TypeCandidates } from '../../domain/types';

/** Geographic point. */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Source of location resolution and nearby places. Implementations isolate the POI
 * provider (Constitution: providers behind a mockable adapter).
 */
export interface PlacesAdapter {
  /** Resolve a text query to a point, or throw `LocationUnresolved` (FR-002). */
  resolveLocation(query: string): Promise<ResolvedLocation>;

  /**
   * Find places of each given interest type within a straight-line radius (a
   * candidate pre-filter). Returns one entry per requested type, with coverage so the
   * caller can distinguish "no data here" from "covered but nothing nearby" (FR-015).
   */
  findNearby(
    center: LatLng,
    typeIds: string[],
    radiusMeters: number,
  ): Promise<TypeCandidates[]>;
}
