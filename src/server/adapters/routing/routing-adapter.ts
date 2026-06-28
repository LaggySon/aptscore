import type { LatLng } from '../places/places-adapter';

/** Authoritative routed walking measurement for one destination. */
export interface WalkingMeasurement {
  walkingSeconds: number;
  walkingMeters: number;
}

/**
 * Source of walking-route measurements. Implementations isolate the routing provider
 * and MUST throw `ScoringUnavailable` when measurement cannot be obtained, so the
 * system fails closed (FR-012).
 */
export interface RoutingAdapter {
  /**
   * Walking time AND distance from `origin` to each destination. The result is aligned
   * to the input order (one measurement per destination) (FR-003).
   */
  walkingMatrix(origin: LatLng, destinations: LatLng[]): Promise<WalkingMeasurement[]>;
}
