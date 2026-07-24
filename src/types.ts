/** API types mirroring the backend contract (contracts/openapi.yaml). */

export type ImportanceLevel = 'low' | 'medium' | 'high';
export type RangeMode = 'minutes' | 'distance';
export type DistanceUnit = 'm' | 'km' | 'mi';

export interface InterestTypeOption {
  id: string;
  label: string;
}

export interface RangeSetting {
  mode: RangeMode;
  value: number;
  distanceUnit?: DistanceUnit;
}

export interface InterestSelection {
  typeId: string;
  importance?: ImportanceLevel;
}

export interface NearbyPlace {
  id: string;
  name: string;
  typeId: string;
  walkingSeconds: number;
  walkingMeters: number;
  rating: number | null;
  reviewCount: number;
}

/** A nearby place with its computed value components, for full explainability. */
export interface ScoredPlace extends NearbyPlace {
  value: number;
  proximityPart: number;
  ratingPart: number;
  effectiveRating: number;
}

export interface TypeContribution {
  typeId: string;
  importance: ImportanceLevel;
  /** Importance multiplier applied to this type (low/med/high → 1/2/3). */
  weight: number;
  rawSum: number;
  boundedScore: number;
  /** "Ideal places" ceiling K used for the bounded score (rawSum / K × 100). */
  idealCeilingK: number;
  coverage: 'ok' | 'no-data';
  contributingPlaces: ScoredPlace[];
}

export interface ScoreResult {
  location: { query?: string; lat: number; lng: number; resolved: boolean };
  range: RangeSetting;
  primaryScore: number;
  secondaryScore: number;
  contributions: TypeContribution[];
  generatedAt: string;
}

export interface ScoreRequest {
  location: { query?: string; lat?: number; lng?: number };
  interests: InterestSelection[];
  range?: RangeSetting;
}

/** A GeoJSON position, `[longitude, latitude]` per RFC 7946. */
export type GeoPosition = [number, number];

/** Reachable-area ("isochrone") polygon for the map visualization. */
export interface IsochroneResult {
  location: { query?: string; lat: number; lng: number; resolved: boolean };
  range: RangeSetting;
  durationSeconds: number;
  travelMode: 'walking';
  /** GeoJSON Polygon rings ([lng, lat]); outer boundary first, then holes. */
  rings: GeoPosition[][];
  attribution: string;
  generatedAt: string;
}

export interface IsochroneRequest {
  location: { query?: string; lat?: number; lng?: number };
  range?: RangeSetting;
}
