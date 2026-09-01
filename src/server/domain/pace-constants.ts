import type { PaceRoadClass, PaceStreetKind, PaceTransitKind } from './pace-types';

/**
 * Pace Model v1 is intentionally fixed: changing any value creates a new model version.
 * Normalization constants are calibrated against the snapshots documented in
 * specs/003-local-pace/calibration.md.
 */
export const PACE_MODEL_V1 = {
  modelVersion: 1,
  radiusMeters: 800,
  innerRadiusMeters: 400,
  ringWeights: { inner: 1, outer: 0.5 },
  componentWeights: { streetActivity: 0.5, transitIntensity: 0.3, roadIntensity: 0.2 },
  streetWeights: {
    shop: 1,
    cafe: 1.25,
    restaurant: 1.25,
    pub: 1.25,
    bar: 1.25,
    fast_food: 1.25,
    pharmacy: 0.75,
    bank: 0.75,
    post_office: 0.75,
    library: 0.75,
    cinema: 0.75,
    theatre: 0.75,
    museum: 0.75,
    gallery: 0.75,
    attraction: 0.75,
    leisure: 0.5,
    office: 0.25,
  } satisfies Record<PaceStreetKind, number>,
  transitWeights: {
    station: 5,
    rail_platform: 1.5,
    tram_stop: 1,
    station_entrance: 0.5,
    bus_stop: 0.25,
  } satisfies Record<PaceTransitKind, number>,
  roadWeights: {
    motorway_trunk: 5,
    primary: 4,
    secondary: 2.5,
    tertiary: 1.5,
    residential_unclassified: 0.25,
  } satisfies Record<PaceRoadClass, number>,
  normalization: {
    streetActivity: [
      { raw: 0, score: 0 },
      { raw: 28.75, score: 1 },
      { raw: 111.5, score: 13 },
      { raw: 252.75, score: 18 },
      { raw: 269.25, score: 20 },
      { raw: 438.375, score: 20 },
      { raw: 2080.625, score: 100 },
    ],
    transitIntensity: [
      { raw: 0, score: 0 },
      { raw: 8.875, score: 21.667 },
      { raw: 11, score: 21.667 },
      { raw: 12.75, score: 36.667 },
      { raw: 21.375, score: 43.333 },
      { raw: 65.625, score: 100 },
    ],
    roadIntensity: [
      { raw: 0, score: 0 },
      { raw: 11_460.521, score: 35 },
      { raw: 17_342.781, score: 45 },
      { raw: 19_865.752, score: 55 },
      { raw: 21_388.644, score: 55 },
      { raw: 40_567.961, score: 100 },
    ],
  },
  labels: [
    { max: 9, label: 'Extremely quiet' },
    { max: 19, label: 'Quiet neighbourhood' },
    { max: 29, label: 'Village / neighbourhood centre' },
    { max: 44, label: 'Busy town centre' },
    { max: 64, label: 'Major urban centre' },
    { max: 84, label: 'Very intense urban centre' },
    { max: 100, label: 'Hyper-central' },
  ],
} as const;
