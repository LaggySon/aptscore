import { RANGE } from '../domain/constants';
import { LocationUnresolved } from '../domain/errors';
import type { PlacesAdapter, LatLng } from '../adapters/places/places-adapter';
import type { IsochroneAdapter } from '../adapters/isochrone/isochrone-adapter';
import type { Logger } from '../config/logger';
import type { IsochroneResult, RangeSetting } from '../domain/types';

/** An isochrone request after API validation but before location resolution. */
export interface IsochroneCommand {
  location: { query?: string; lat?: number; lng?: number };
  range?: RangeSetting;
}

export interface IsochroneDeps {
  places: PlacesAdapter;
  isochrone: IsochroneAdapter;
  logger: Logger;
  attribution?: string;
}

const METERS_PER_UNIT = { m: 1, km: 1000, mi: 1609.34 } as const;

const defaultRange = (): RangeSetting => ({ mode: 'minutes', value: RANGE.defaultMinutes });

/**
 * Produces the reachable-area ("cloud") polygon for a location. It reuses the places
 * adapter to resolve the origin (so it fails closed on the same 422/503 paths as scoring),
 * then delegates the boundary to the isochrone adapter. Kept separate from scoring so the
 * map can be requested and rendered independently of the score breakdown.
 */
export class IsochroneService {
  constructor(private readonly deps: IsochroneDeps) {}

  async isochrone(command: IsochroneCommand): Promise<IsochroneResult> {
    const range = command.range ?? defaultRange();
    const durationSeconds = rangeToDurationSeconds(range);
    const location = await this.resolveLocation(command.location);

    const area = await this.deps.isochrone.reachableArea(location, { durationSeconds });

    const result: IsochroneResult = {
      location,
      range,
      durationSeconds: area.durationSeconds,
      travelMode: area.travelMode,
      rings: area.rings,
      attribution: this.deps.attribution ?? 'Isochrone',
      generatedAt: new Date().toISOString(),
    };

    this.deps.logger.info(
      { location, range, durationSeconds, ringCount: area.rings.length },
      'isochrone computed',
    );
    return result;
  }

  /** Resolve coordinates directly, or geocode a text query (mirrors ScoringService). */
  private async resolveLocation(
    input: IsochroneCommand['location'],
  ): Promise<LatLng & { query?: string; resolved: true }> {
    if (typeof input.lat === 'number' && typeof input.lng === 'number') {
      return { lat: input.lat, lng: input.lng, resolved: true };
    }
    if (input.query) {
      const resolved = await this.deps.places.resolveLocation(input.query);
      return { lat: resolved.lat, lng: resolved.lng, query: resolved.query, resolved: true };
    }
    throw new LocationUnresolved('(no location provided)');
  }
}

/**
 * Convert a user range into a walking-time budget for the isochrone. Minutes map
 * directly; a distance range is converted with the same nominal walking speed used to
 * pre-filter scoring candidates, so the polygon aligns with the scored catchment.
 */
const rangeToDurationSeconds = (range: RangeSetting): number => {
  if (range.mode === 'minutes') return range.value * 60;
  const meters = range.value * METERS_PER_UNIT[range.distanceUnit ?? 'm'];
  return (meters / RANGE.walkingMetersPerMinute) * 60;
};
