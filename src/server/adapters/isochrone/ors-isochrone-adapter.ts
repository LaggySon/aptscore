import { ROUTING } from '../../domain/constants';
import { ScoringUnavailable } from '../../domain/errors';
import type { LatLng } from '../places/places-adapter';
import type {
  GeoPosition,
  IsochroneAdapter,
  IsochroneArea,
  IsochroneQuery,
} from './isochrone-adapter';

type GeoJsonGeometry =
  | { type: 'Polygon'; coordinates: GeoPosition[][] }
  | { type: 'MultiPolygon'; coordinates: GeoPosition[][][] };

interface OrsIsochroneResponse {
  features?: Array<{ geometry?: GeoJsonGeometry | null }>;
}

export interface OrsIsochroneOptions {
  baseUrl: string;
  apiKey: string | undefined;
  timeoutMs?: number;
  retries?: number;
}

/** Walking isochrones from the same OpenRouteService graph used by scoring. */
export class OrsIsochroneAdapter implements IsochroneAdapter {
  private readonly timeoutMs: number;
  private readonly retries: number;

  constructor(private readonly options: OrsIsochroneOptions) {
    this.timeoutMs = options.timeoutMs ?? ROUTING.timeoutMs;
    this.retries = options.retries ?? ROUTING.retries;
  }

  async reachableArea(origin: LatLng, query: IsochroneQuery): Promise<IsochroneArea> {
    const data = await this.post({
      locations: [[origin.lng, origin.lat]],
      range: [Math.round(query.rangeValue)],
      range_type: query.rangeType,
      location_type: 'start',
      smoothing: 3,
    });
    const rings = extractLargestPolygon(data);
    if (rings.length === 0) {
      throw new ScoringUnavailable('Isochrone provider returned no polygon geometry');
    }
    return { travelMode: 'walking', rings };
  }

  private async post(body: unknown): Promise<OrsIsochroneResponse> {
    const url = `${this.options.baseUrl}/v2/isochrones/foot-walking`;
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
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
          return (await response.json()) as OrsIsochroneResponse;
        } finally {
          clearTimeout(timer);
        }
      } catch (error) {
        lastError = error;
      }
    }

    const detail = lastError instanceof Error ? lastError.message : 'unknown error';
    throw new ScoringUnavailable(`Isochrone provider unavailable: ${detail}`);
  }
}

const extractLargestPolygon = (data: OrsIsochroneResponse): GeoPosition[][] => {
  const polygons = (data.features ?? []).flatMap((feature) => {
    const geometry = feature.geometry;
    if (!geometry) return [];
    return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  });

  return polygons.reduce<GeoPosition[][]>(
    (largest, polygon) =>
      (polygon[0]?.length ?? 0) > (largest[0]?.length ?? 0) ? polygon : largest,
    [],
  );
};
