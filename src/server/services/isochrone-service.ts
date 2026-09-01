import type { IsochroneAdapter, IsochroneQuery } from '../adapters/isochrone/isochrone-adapter';
import type { LatLng, PlacesAdapter } from '../adapters/places/places-adapter';
import type { Logger } from '../config/logger';
import { RANGE } from '../domain/constants';
import { LocationUnresolved } from '../domain/errors';
import type { IsochroneResult, RangeSetting } from '../domain/types';

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

export class IsochroneService {
  constructor(private readonly deps: IsochroneDeps) {}

  async isochrone(command: IsochroneCommand): Promise<IsochroneResult> {
    const range = command.range ?? { mode: 'minutes', value: RANGE.defaultMinutes };
    const location = await this.resolveLocation(command.location);
    const query = toProviderQuery(range);
    const area = await this.deps.isochrone.reachableArea(location, query);
    const result: IsochroneResult = {
      location,
      range,
      travelMode: area.travelMode,
      rings: area.rings,
      attribution: this.deps.attribution ?? 'openrouteservice · OpenStreetMap',
      generatedAt: new Date().toISOString(),
    };
    this.deps.logger.info({ location, range, ringCount: area.rings.length }, 'isochrone computed');
    return result;
  }

  private async resolveLocation(
    input: IsochroneCommand['location'],
  ): Promise<LatLng & { query?: string; resolved: true }> {
    if (typeof input.lat === 'number' && typeof input.lng === 'number') {
      return { lat: input.lat, lng: input.lng, resolved: true };
    }
    if (input.query) {
      const resolved = await this.deps.places.resolveLocation(input.query);
      return { ...resolved, resolved: true };
    }
    throw new LocationUnresolved('(no location provided)');
  }
}

const toProviderQuery = (range: RangeSetting): IsochroneQuery => {
  if (range.mode === 'minutes') {
    return { rangeType: 'time', rangeValue: range.value * 60 };
  }
  return {
    rangeType: 'distance',
    rangeValue: range.value * METERS_PER_UNIT[range.distanceUnit ?? 'm'],
  };
};
