import type { RoutingAdapter, WalkingMeasurement } from './routing-adapter';
import type { LatLng } from '../places/places-adapter';
import { ScoringUnavailable } from '../../domain/errors';
import { ROUTING } from '../../domain/constants';

interface OrsMatrixResponse {
  durations?: number[][];
  distances?: number[][];
}

export interface OrsOptions {
  baseUrl: string;
  apiKey: string | undefined;
  timeoutMs?: number;
  retries?: number;
}

/**
 * Routing adapter backed by OpenRouteService. A single matrix call returns walking
 * durations AND distances from the origin to every destination. Any failure (timeout,
 * non-2xx, network) is surfaced as `ScoringUnavailable` so the system fails closed
 * (FR-012).
 */
export class OrsRoutingAdapter implements RoutingAdapter {
  private readonly timeoutMs: number;
  private readonly retries: number;

  constructor(private readonly options: OrsOptions) {
    this.timeoutMs = options.timeoutMs ?? ROUTING.timeoutMs;
    this.retries = options.retries ?? ROUTING.retries;
  }

  async walkingMatrix(origin: LatLng, destinations: LatLng[]): Promise<WalkingMeasurement[]> {
    if (destinations.length === 0) return [];

    const data = await this.postMatrix({
      // ORS expects [lng, lat] order.
      locations: [toCoord(origin), ...destinations.map(toCoord)],
      sources: [0],
      destinations: destinations.map((_, index) => index + 1),
      metrics: ['duration', 'distance'],
    });

    const durations = data.durations?.[0] ?? [];
    const distances = data.distances?.[0] ?? [];
    return destinations.map((_, index) => ({
      walkingSeconds: durations[index] ?? Number.POSITIVE_INFINITY,
      walkingMeters: distances[index] ?? Number.POSITIVE_INFINITY,
    }));
  }

  private async postMatrix(body: unknown): Promise<OrsMatrixResponse> {
    const url = `${this.options.baseUrl}/v2/matrix/foot-walking`;
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        return await this.attempt(url, body);
      } catch (error) {
        lastError = error;
      }
    }
    throw new ScoringUnavailable(
      `Routing provider unavailable: ${describeError(lastError)}`,
    );
  }

  private async attempt(url: string, body: unknown): Promise<OrsMatrixResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.apiKey ? { Authorization: this.options.apiKey } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      return (await response.json()) as OrsMatrixResponse;
    } finally {
      clearTimeout(timer);
    }
  }
}

const toCoord = (point: LatLng): [number, number] => [point.lng, point.lat];

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : 'unknown error';
