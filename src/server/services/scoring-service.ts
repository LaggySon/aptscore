import { computeTypeBoundedScore } from '../domain/type-score';
import { computePrimaryScore, computeSecondaryScore } from '../domain/aggregate';
import { computePlaceValueBreakdown, isInRange, type RangeBudget } from '../domain/place-value';
import { importanceMultiplier } from '../domain/weights';
import { RANGE, SCORING, DEFAULT_IMPORTANCE } from '../domain/constants';
import { interestTypeById } from '../config/interest-types';
import { LocationUnresolved } from '../domain/errors';
import type { PlacesAdapter, LatLng } from '../adapters/places/places-adapter';
import type { RoutingAdapter } from '../adapters/routing/routing-adapter';
import type { Logger } from '../config/logger';
import type {
  CandidatePlace,
  ImportanceLevel,
  NearbyPlace,
  RangeSetting,
  ScoredPlace,
  ScoreResult,
  TypeCandidates,
  TypeContribution,
} from '../domain/types';

/** A scoring request after API validation but before domain resolution. */
export interface ScoreCommand {
  location: { query?: string; lat?: number; lng?: number };
  interests: Array<{ typeId: string; importance?: ImportanceLevel }>;
  range?: RangeSetting;
}

export interface ScoringDeps {
  places: PlacesAdapter;
  routing: RoutingAdapter;
  logger: Logger;
}

const METERS_PER_UNIT = { m: 1, km: 1000, mi: 1609.34 } as const;

const defaultRange = (): RangeSetting => ({ mode: 'minutes', value: RANGE.defaultMinutes });

/** A candidate paired with the type it was found under (types may share a place). */
interface TypedCandidate {
  typeId: string;
  candidate: CandidatePlace;
}

/**
 * Orchestrates scoring: resolve location → fetch candidates → route → run the pure
 * domain scoring. All external I/O lives in the injected adapters, so this service
 * (and the domain it calls) is deterministic given the same provider responses.
 */
export class ScoringService {
  constructor(private readonly deps: ScoringDeps) {}

  async score(command: ScoreCommand): Promise<ScoreResult> {
    const range = command.range ?? defaultRange();
    const { budget, prefilterRadiusMeters } = resolveRange(range);
    const selections = command.interests.map((interest) => ({
      typeId: interest.typeId,
      importance: interest.importance ?? DEFAULT_IMPORTANCE,
    }));

    const location = await this.resolveLocation(command.location);
    const candidatesByType = await this.deps.places.findNearby(
      location,
      selections.map((s) => s.typeId),
      prefilterRadiusMeters,
    );
    const nearbyByType = await this.measureWalking(location, candidatesByType);

    const contributions = selections.map((selection) =>
      scoreType(
        selection.typeId,
        selection.importance,
        candidatesByType,
        nearbyByType.get(selection.typeId) ?? [],
        budget,
      ),
    );

    const result: ScoreResult = {
      location,
      range,
      primaryScore: computePrimaryScore(contributions),
      secondaryScore: computeSecondaryScore(contributions),
      contributions,
      generatedAt: new Date().toISOString(),
    };
    this.logExplanation(result);
    return result;
  }

  /** Resolve coordinates directly, or geocode a text query (FR-002). */
  private async resolveLocation(input: ScoreCommand['location']): Promise<LatLng & { query?: string; resolved: true }> {
    if (typeof input.lat === 'number' && typeof input.lng === 'number') {
      return { lat: input.lat, lng: input.lng, resolved: true };
    }
    if (input.query) {
      const resolved = await this.deps.places.resolveLocation(input.query);
      return { lat: resolved.lat, lng: resolved.lng, query: resolved.query, resolved: true };
    }
    throw new LocationUnresolved('(no location provided)');
  }

  /**
   * Cap candidates per type (FR-016), route them in one batched matrix call, and
   * return the routed places grouped by type.
   */
  private async measureWalking(
    origin: LatLng,
    candidatesByType: TypeCandidates[],
  ): Promise<Map<string, NearbyPlace[]>> {
    const flat: TypedCandidate[] = candidatesByType.flatMap((type) =>
      nearestN(type.places, SCORING.candidateCapPerType).map((candidate) => ({
        typeId: type.typeId,
        candidate,
      })),
    );

    const measurements = await this.deps.routing.walkingMatrix(
      origin,
      flat.map(({ candidate }) => ({ lat: candidate.lat, lng: candidate.lng })),
    );

    const byType = new Map<string, NearbyPlace[]>();
    flat.forEach(({ typeId, candidate }, index) => {
      const measurement = measurements[index];
      if (!measurement) return;
      const nearby: NearbyPlace = {
        id: candidate.id,
        name: candidate.name,
        typeId,
        walkingSeconds: measurement.walkingSeconds,
        walkingMeters: measurement.walkingMeters,
        straightLineMeters: candidate.straightLineMeters,
        rating: candidate.rating,
        reviewCount: candidate.reviewCount,
      };
      const list = byType.get(typeId);
      if (list) list.push(nearby);
      else byType.set(typeId, [nearby]);
    });
    return byType;
  }

  private logExplanation(result: ScoreResult): void {
    this.deps.logger.info(
      {
        location: result.location,
        range: result.range,
        primaryScore: result.primaryScore,
        secondaryScore: result.secondaryScore,
        contributions: result.contributions.map((c) => ({
          typeId: c.typeId,
          importance: c.importance,
          rawSum: c.rawSum,
          boundedScore: c.boundedScore,
          coverage: c.coverage,
          placeCount: c.contributingPlaces.length,
        })),
      },
      'score computed',
    );
  }
}

/** Convert a user range into a scoring budget plus a straight-line pre-filter radius. */
const resolveRange = (
  range: RangeSetting,
): { budget: RangeBudget; prefilterRadiusMeters: number } => {
  if (range.mode === 'minutes') {
    return {
      budget: { mode: 'minutes', max: range.value * 60 },
      prefilterRadiusMeters: range.value * RANGE.walkingMetersPerMinute,
    };
  }
  const maxMeters = range.value * METERS_PER_UNIT[range.distanceUnit ?? 'm'];
  // Walking distance ≥ straight-line distance, so a radius of maxMeters is a safe superset.
  return { budget: { mode: 'distance', max: maxMeters }, prefilterRadiusMeters: maxMeters };
};

/** The N nearest candidates by straight-line distance (FR-016). */
const nearestN = (places: CandidatePlace[], n: number): CandidatePlace[] =>
  [...places].sort((a, b) => a.straightLineMeters - b.straightLineMeters).slice(0, n);

/** Score one interest type from its routed places (FR-007/008/011/015). */
const scoreType = (
  typeId: string,
  importance: ImportanceLevel,
  candidatesByType: TypeCandidates[],
  nearby: NearbyPlace[],
  budget: RangeBudget,
): TypeContribution => {
  const coverage = candidatesByType.find((c) => c.typeId === typeId)?.coverage ?? 'ok';
  const idealCeilingK = interestTypeById(typeId)?.idealCeilingK ?? SCORING.idealPlacesCeiling;

  // Attach each in-range place's value components, ordered by contribution (highest first).
  const contributingPlaces: ScoredPlace[] = nearby
    .filter((place) => isInRange(place, budget))
    .map((place) => ({ ...place, ...computePlaceValueBreakdown(place, budget) }))
    .sort((a, b) => b.value - a.value);

  const rawSum = contributingPlaces.reduce((sum, place) => sum + place.value, 0);

  return {
    typeId,
    importance,
    weight: importanceMultiplier(importance),
    rawSum,
    boundedScore: computeTypeBoundedScore(rawSum, idealCeilingK),
    idealCeilingK,
    coverage,
    contributingPlaces,
  };
};
