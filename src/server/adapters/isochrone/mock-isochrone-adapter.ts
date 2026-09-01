import { ScoringUnavailable } from '../../domain/errors';
import type { LatLng } from '../places/places-adapter';
import type {
  GeoPosition,
  IsochroneAdapter,
  IsochroneArea,
  IsochroneQuery,
} from './isochrone-adapter';

export interface MockIsochroneConfig {
  outage?: boolean;
  metersPerSecond?: number;
  vertices?: number;
}

const METERS_PER_DEGREE_LAT = 111_320;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Deterministic irregular polygon for browser and API tests. */
export class MockIsochroneAdapter implements IsochroneAdapter {
  constructor(private readonly config: MockIsochroneConfig = {}) {}

  async reachableArea(origin: LatLng, query: IsochroneQuery): Promise<IsochroneArea> {
    if (this.config.outage) {
      throw new ScoringUnavailable('Isochrone provider unavailable (mock outage)');
    }

    const radiusMeters =
      query.rangeType === 'distance'
        ? query.rangeValue
        : query.rangeValue * (this.config.metersPerSecond ?? 1.4);
    const vertices = this.config.vertices ?? 72;
    const metersPerDegreeLng =
      METERS_PER_DEGREE_LAT * Math.cos(toRadians(origin.lat)) || METERS_PER_DEGREE_LAT;
    const ring: GeoPosition[] = [];

    for (let i = 0; i < vertices; i += 1) {
      const angle = (i / vertices) * Math.PI * 2;
      const wobble =
        0.78 +
        0.12 * Math.sin(3 * angle + 0.4) +
        0.07 * Math.sin(5 * angle + 1.2) +
        0.03 * Math.cos(9 * angle);
      const localRadius = radiusMeters * wobble;
      ring.push([
        origin.lng + (localRadius * Math.cos(angle)) / metersPerDegreeLng,
        origin.lat + (localRadius * Math.sin(angle)) / METERS_PER_DEGREE_LAT,
      ]);
    }
    ring.push(ring[0]!);

    return { travelMode: 'walking', rings: [ring] };
  }
}
