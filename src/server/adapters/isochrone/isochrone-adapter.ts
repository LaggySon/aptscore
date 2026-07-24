import type { LatLng } from '../places/places-adapter';

/**
 * A GeoJSON position — `[longitude, latitude]` order per RFC 7946. The isochrone
 * provider (and the client map) speak this order; only the score domain uses `LatLng`.
 */
export type GeoPosition = [number, number];

/**
 * A reachable-area ("isochrone") polygon for one travel-time budget. `rings` follows
 * the GeoJSON Polygon convention: `rings[0]` is the outer boundary and any further
 * rings are holes. Coordinates are `[lng, lat]`.
 */
export interface IsochroneArea {
  /** Travel-time budget the boundary represents, in seconds. */
  durationSeconds: number;
  /** Travel mode used to compute reachability. Walking, to match the scoring model. */
  travelMode: 'walking';
  /** Polygon rings ([lng, lat]); outer boundary first, then holes. */
  rings: GeoPosition[][];
}

export interface IsochroneQuery {
  /** How far out (in travel time) to draw the reachable-area boundary. */
  durationSeconds: number;
}

/**
 * Source of reachable-area polygons. Implementations isolate the isochrone provider
 * (Constitution: providers behind a mockable adapter) and MUST throw `ScoringUnavailable`
 * when a polygon cannot be obtained, so the visualization fails closed (FR-012) rather
 * than showing a misleading fallback shape.
 */
export interface IsochroneAdapter {
  /** Reachable-area boundary from `origin` within the query's travel-time budget. */
  reachableArea(origin: LatLng, query: IsochroneQuery): Promise<IsochroneArea>;
}
