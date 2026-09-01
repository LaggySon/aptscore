import type { LatLng } from '../places/places-adapter';

/** A GeoJSON position in RFC 7946 `[longitude, latitude]` order. */
export type GeoPosition = [number, number];

export interface IsochroneArea {
  travelMode: 'walking';
  /** Polygon rings: outer boundary first, followed by any holes. */
  rings: GeoPosition[][];
}

export interface IsochroneQuery {
  rangeType: 'time' | 'distance';
  /** Seconds for time ranges and metres for distance ranges. */
  rangeValue: number;
}

/** Provider boundary for a real, routed walking catchment. */
export interface IsochroneAdapter {
  reachableArea(origin: LatLng, query: IsochroneQuery): Promise<IsochroneArea>;
}
