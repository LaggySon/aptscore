import { PACE_MODEL_V1 } from './pace-constants';
import type {
  LocalPaceResult,
  PaceComponents,
  PaceData,
  PaceRoadSegment,
  PaceStreetFeature,
  PaceTransitFeature,
} from './pace-types';

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const roundTo = (value: number, digits: number): number => {
  const scale = 10 ** digits;
  return Math.round((value + Number.EPSILON) * scale) / scale;
};

const distanceWeight = (distanceMeters: number): number => {
  if (distanceMeters < 0 || distanceMeters > PACE_MODEL_V1.radiusMeters) return 0;
  return distanceMeters <= PACE_MODEL_V1.innerRadiusMeters
    ? PACE_MODEL_V1.ringWeights.inner
    : PACE_MODEL_V1.ringWeights.outer;
};

export const computeStreetActivityRaw = (features: PaceStreetFeature[]): number =>
  features.reduce(
    (sum, feature) =>
      sum +
      PACE_MODEL_V1.streetWeights[feature.kind] *
        distanceWeight(feature.distanceMeters) *
        (feature.quantity ?? 1),
    0,
  );

export const computeTransitIntensityRaw = (features: PaceTransitFeature[]): number =>
  features.reduce(
    (sum, feature) =>
      sum +
      PACE_MODEL_V1.transitWeights[feature.kind] *
        distanceWeight(feature.distanceMeters) *
        (feature.quantity ?? 1),
    0,
  );

export const computeRoadIntensityRaw = (segments: PaceRoadSegment[]): number =>
  segments.reduce(
    (sum, segment) =>
      sum +
      PACE_MODEL_V1.roadWeights[segment.roadClass] *
        segment.lengthMeters *
        distanceWeight(segment.distanceMeters),
    0,
  );

interface NormalizationKnot {
  raw: number;
  score: number;
}

/** Monotone linear interpolation between the frozen v1 calibration knots. */
const normalize = (raw: number, knots: readonly NormalizationKnot[]): number => {
  const value = Math.max(0, raw);
  for (let index = 1; index < knots.length; index += 1) {
    const upper = knots[index];
    if (value > upper.raw) continue;
    const lower = knots[index - 1];
    const progress = (value - lower.raw) / (upper.raw - lower.raw);
    return clamp(lower.score + progress * (upper.score - lower.score), 0, 100);
  }
  return 100;
};

export const combinePaceComponents = (components: PaceComponents): number =>
  Math.round(
    clamp(
      PACE_MODEL_V1.componentWeights.streetActivity * components.streetActivity +
        PACE_MODEL_V1.componentWeights.transitIntensity * components.transitIntensity +
        PACE_MODEL_V1.componentWeights.roadIntensity * components.roadIntensity,
      0,
      100,
    ),
  );

export const paceLabelFor = (paceMph: number): string =>
  PACE_MODEL_V1.labels.find(({ max }) => paceMph <= max)?.label ??
  PACE_MODEL_V1.labels[PACE_MODEL_V1.labels.length - 1].label;

export const computeLocalPace = (data: PaceData): LocalPaceResult => {
  const exactRaw: PaceComponents = {
    streetActivity: computeStreetActivityRaw(data.streetFeatures),
    transitIntensity: computeTransitIntensityRaw(data.transitFeatures),
    roadIntensity: computeRoadIntensityRaw(data.roadSegments),
  };
  const exactComponents: PaceComponents = {
    streetActivity: normalize(exactRaw.streetActivity, PACE_MODEL_V1.normalization.streetActivity),
    transitIntensity: normalize(
      exactRaw.transitIntensity,
      PACE_MODEL_V1.normalization.transitIntensity,
    ),
    roadIntensity: normalize(exactRaw.roadIntensity, PACE_MODEL_V1.normalization.roadIntensity),
  };
  const paceMph = combinePaceComponents(exactComponents);

  return {
    paceMph,
    paceLabel: paceLabelFor(paceMph),
    modelVersion: PACE_MODEL_V1.modelVersion,
    radiusMeters: PACE_MODEL_V1.radiusMeters,
    components: {
      streetActivity: roundTo(exactComponents.streetActivity, 2),
      transitIntensity: roundTo(exactComponents.transitIntensity, 2),
      roadIntensity: roundTo(exactComponents.roadIntensity, 2),
    },
    raw: {
      streetActivity: roundTo(exactRaw.streetActivity, 3),
      transitIntensity: roundTo(exactRaw.transitIntensity, 3),
      roadIntensity: roundTo(exactRaw.roadIntensity, 3),
    },
  };
};
