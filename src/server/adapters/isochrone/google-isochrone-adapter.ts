import type {
  GeoPosition,
  IsochroneAdapter,
  IsochroneArea,
  IsochroneQuery,
} from './isochrone-adapter';
import type { LatLng } from '../places/places-adapter';
import { ScoringUnavailable } from '../../domain/errors';
import { ISOCHRONE } from '../../domain/constants';

/** Shape of the `isochrones:generate` response we consume (RFC 7946 GeoJSON). */
interface GoogleIsochroneResponse {
  isochrone?: {
    geoJson?: GeoJsonObject;
  };
}

type GeoJsonObject =
  | { type: 'Polygon'; coordinates: GeoPosition[][] }
  | { type: 'MultiPolygon'; coordinates: GeoPosition[][][] }
  | { type: 'Feature'; geometry: GeoJsonObject | null }
  | { type: 'FeatureCollection'; features: Array<{ geometry: GeoJsonObject | null }> };

export interface GoogleIsochroneOptions {
  baseUrl: string;
  apiKey: string | undefined;
  timeoutMs?: number;
  retries?: number;
}

/**
 * Isochrone adapter backed by the Google Maps Platform Isochrones API
 * (`POST /v1/isochrones:generate`). It returns the walking reachable-area polygon as
 * RFC 7946 GeoJSON. Any failure (timeout, non-2xx, network, unparseable geometry) is
 * surfaced as `ScoringUnavailable` so the visualization fails closed (FR-012).
 */
export class GoogleIsochroneAdapter implements IsochroneAdapter {
  private readonly timeoutMs: number;
  private readonly retries: number;

  constructor(private readonly options: GoogleIsochroneOptions) {
    this.timeoutMs = options.timeoutMs ?? ISOCHRONE.timeoutMs;
    this.retries = options.retries ?? ISOCHRONE.retries;
  }

  async reachableArea(origin: LatLng, query: IsochroneQuery): Promise<IsochroneArea> {
    const data = await this.generate({
      location: { latitude: origin.lat, longitude: origin.lng },
      travelDuration: `${Math.round(query.durationSeconds)}s`,
      travelMode: 'WALK',
      travelDirection: 'FROM',
      enableSmoothing: true,
    });

    const rings = extractPolygonRings(data.isochrone?.geoJson);
    if (rings.length === 0) {
      throw new ScoringUnavailable('Isochrone provider returned no polygon geometry');
    }
    return { durationSeconds: query.durationSeconds, travelMode: 'walking', rings };
  }

  private async generate(body: unknown): Promise<GoogleIsochroneResponse> {
    const url = `${this.options.baseUrl}/v1/isochrones:generate`;
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        return await this.attempt(url, body);
      } catch (error) {
        lastError = error;
      }
    }
    throw new ScoringUnavailable(`Isochrone provider unavailable: ${describeError(lastError)}`);
  }

  private async attempt(url: string, body: unknown): Promise<GoogleIsochroneResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.apiKey ? { 'X-Goog-Api-Key': this.options.apiKey } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      return (await response.json()) as GoogleIsochroneResponse;
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Normalize any RFC 7946 GeoJSON the provider might return (bare geometry, Feature, or
 * FeatureCollection) into the outer-first ring list of a single Polygon. For a
 * MultiPolygon we keep the largest polygon by outer-ring vertex count, which is the
 * reachable area users expect to see for a single origin.
 */
const extractPolygonRings = (geo: GeoJsonObject | null | undefined): GeoPosition[][] => {
  if (!geo) return [];
  switch (geo.type) {
    case 'Polygon':
      return geo.coordinates;
    case 'MultiPolygon':
      return geo.coordinates.reduce<GeoPosition[][]>(
        (largest, polygon) =>
          (polygon[0]?.length ?? 0) > (largest[0]?.length ?? 0) ? polygon : largest,
        [],
      );
    case 'Feature':
      return extractPolygonRings(geo.geometry);
    case 'FeatureCollection':
      return geo.features
        .map((feature) => extractPolygonRings(feature.geometry))
        .reduce<GeoPosition[][]>(
          (largest, rings) =>
            (rings[0]?.length ?? 0) > (largest[0]?.length ?? 0) ? rings : largest,
          [],
        );
    default:
      return [];
  }
};

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : 'unknown error';
