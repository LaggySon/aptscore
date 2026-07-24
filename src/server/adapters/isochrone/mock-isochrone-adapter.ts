import type {
  GeoPosition,
  IsochroneAdapter,
  IsochroneArea,
  IsochroneQuery,
} from './isochrone-adapter';
import type { LatLng } from '../places/places-adapter';
import { ScoringUnavailable } from '../../domain/errors';

/** Deterministic reachable-area polygons for tests — no network, no clock. */
export interface MockIsochroneConfig {
  /** When true, every call fails closed (FR-012). */
  outage?: boolean;
  /** Walking speed used to size the polygon from the time budget. Default ~1.4 m/s. */
  metersPerSecond?: number;
  /** Number of boundary vertices to emit. */
  vertices?: number;
}

const METERS_PER_DEGREE_LAT = 111_320;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Produces an irregular "cloud"-shaped polygon around the origin whose size scales with
 * the travel-time budget. The lobes come from a fixed sum of sines, so the shape is fully
 * deterministic (FR-014) yet looks like a real road-network isochrone rather than a plain
 * circle. Set `outage` to exercise the fail-closed path (FR-012).
 */
export class MockIsochroneAdapter implements IsochroneAdapter {
  constructor(private readonly config: MockIsochroneConfig = {}) {}

  async reachableArea(origin: LatLng, query: IsochroneQuery): Promise<IsochroneArea> {
    if (this.config.outage) {
      throw new ScoringUnavailable('Isochrone provider unavailable (mock outage)');
    }

    const speed = this.config.metersPerSecond ?? 1.4;
    const vertices = this.config.vertices ?? 48;
    const baseRadiusMeters = query.durationSeconds * speed;
    const metersPerDegreeLng =
      METERS_PER_DEGREE_LAT * Math.cos(toRadians(origin.lat)) || METERS_PER_DEGREE_LAT;

    const ring: GeoPosition[] = [];
    for (let i = 0; i < vertices; i += 1) {
      const angle = (i / vertices) * 2 * Math.PI;
      // Deterministic lobing in [0.7, 1.0] so the boundary is irregular but always convex-ish.
      const wobble = 0.85 + 0.1 * Math.sin(3 * angle) + 0.05 * Math.sin(5 * angle + 1);
      const radiusMeters = baseRadiusMeters * wobble;
      const lng = origin.lng + (radiusMeters * Math.cos(angle)) / metersPerDegreeLng;
      const lat = origin.lat + (radiusMeters * Math.sin(angle)) / METERS_PER_DEGREE_LAT;
      ring.push([lng, lat]);
    }
    ring.push(ring[0]!); // GeoJSON rings are closed (first == last).

    return { durationSeconds: query.durationSeconds, travelMode: 'walking', rings: [ring] };
  }
}
