import type { RoutingAdapter, WalkingMeasurement } from './routing-adapter';
import type { LatLng } from '../places/places-adapter';
import { ScoringUnavailable } from '../../domain/errors';
import { haversineMeters } from '../../lib/geo';

/** Deterministic walking measurements for tests; can simulate a provider outage. */
export interface MockRoutingConfig {
  /** When true, every call fails closed (FR-012). */
  outage?: boolean;
  /** Walking speed used to derive duration from distance. Default ~1.4 m/s. */
  metersPerSecond?: number;
}

export class MockRoutingAdapter implements RoutingAdapter {
  constructor(private readonly config: MockRoutingConfig = {}) {}

  async walkingMatrix(origin: LatLng, destinations: LatLng[]): Promise<WalkingMeasurement[]> {
    if (this.config.outage) {
      throw new ScoringUnavailable('Routing provider unavailable (mock outage)');
    }
    const speed = this.config.metersPerSecond ?? 1.4;
    return destinations.map((destination) => {
      const walkingMeters = haversineMeters(origin, destination);
      return { walkingMeters, walkingSeconds: walkingMeters / speed };
    });
  }
}
