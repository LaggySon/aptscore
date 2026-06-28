/** Domain & transfer types for location scoring (see specs/.../data-model.md). */

export type ImportanceLevel = 'low' | 'medium' | 'high';

export type RangeMode = 'minutes' | 'distance';
export type DistanceUnit = 'm' | 'km' | 'mi';

/** A supported interest type from the closed catalog (FR-001). */
export interface InterestType {
  id: string;
  label: string;
  /** Provider category/tag identifiers; mapping lives in the places adapter. */
  providerMapping: string[];
  /** Per-type "ideal places" ceiling for the bounded score. */
  idealCeilingK: number;
}

/** The catchment for a request (FR-003). */
export interface RangeSetting {
  mode: RangeMode;
  value: number;
  distanceUnit?: DistanceUnit;
}

/** One user-selected interest type with its importance (FR-009). */
export interface InterestSelection {
  typeId: string;
  importance: ImportanceLevel;
}

/** A location resolved to a geographic point (FR-002). */
export interface ResolvedLocation {
  query?: string;
  lat: number;
  lng: number;
  resolved: boolean;
}

/** A raw place from the places provider, before walking measurement (internal). */
export interface CandidatePlace {
  id: string;
  name: string;
  typeId: string;
  lat: number;
  lng: number;
  /** Straight-line distance from the location — used only for pre-filter/capping. */
  straightLineMeters: number;
  rating: number | null;
  reviewCount: number;
}

/** Places of one type returned by the provider, with coverage status (FR-015). */
export interface TypeCandidates {
  typeId: string;
  coverage: 'ok' | 'no-data';
  places: CandidatePlace[];
}

/** A candidate enriched with authoritative routed walking measurements (FR-003/005). */
export interface NearbyPlace {
  id: string;
  name: string;
  typeId: string;
  walkingSeconds: number;
  walkingMeters: number;
  straightLineMeters: number;
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

/** How one interest type contributed to the overall score (FR-008/011/013). */
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

/** The full scoring result for a single location (FR-008/013). */
export interface ScoreResult {
  location: ResolvedLocation;
  range: RangeSetting;
  /** Unbounded headline score (FR-008 primary). */
  primaryScore: number;
  /** Bounded 0–100 score (FR-008 secondary). */
  secondaryScore: number;
  contributions: TypeContribution[];
  /** Observability only — never an input to scoring, preserving determinism (FR-014). */
  generatedAt: string;
}
