export type PaceStreetKind =
  | 'shop'
  | 'cafe'
  | 'restaurant'
  | 'pub'
  | 'bar'
  | 'fast_food'
  | 'pharmacy'
  | 'bank'
  | 'post_office'
  | 'library'
  | 'cinema'
  | 'theatre'
  | 'museum'
  | 'gallery'
  | 'attraction'
  | 'leisure'
  | 'office';

export type PaceTransitKind =
  'station' | 'rail_platform' | 'tram_stop' | 'station_entrance' | 'bus_stop';

export type PaceRoadClass =
  'motorway_trunk' | 'primary' | 'secondary' | 'tertiary' | 'residential_unclassified';

export interface PaceStreetFeature {
  kind: PaceStreetKind;
  distanceMeters: number;
  /** Compact deterministic fixtures may represent repeated identical features. */
  quantity?: number;
}

export interface PaceTransitFeature {
  kind: PaceTransitKind;
  distanceMeters: number;
  /** Compact deterministic fixtures may represent repeated identical features. */
  quantity?: number;
}

/** One adjacent pair of OSM way geometry points, classified by its midpoint. */
export interface PaceRoadSegment {
  roadClass: PaceRoadClass;
  lengthMeters: number;
  distanceMeters: number;
}

/** Provider-neutral input accepted by the pure Pace Model v1 scorer. */
export interface PaceData {
  streetFeatures: PaceStreetFeature[];
  transitFeatures: PaceTransitFeature[];
  roadSegments: PaceRoadSegment[];
}

export interface PaceComponents {
  streetActivity: number;
  transitIntensity: number;
  roadIntensity: number;
}

export interface LocalPaceResult {
  paceMph: number;
  paceLabel: string;
  modelVersion: number;
  radiusMeters: number;
  components: PaceComponents;
  raw: PaceComponents;
}
