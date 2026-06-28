import type { LatLng, PlacesAdapter } from './places-adapter';
import type { CandidatePlace, ResolvedLocation, TypeCandidates } from '../../domain/types';
import { LocationUnresolved, ScoringUnavailable } from '../../domain/errors';
import { haversineMeters } from '../../lib/geo';
import { providerTagsForType, type ProviderTag } from './category-mapping';

/** Transient statuses worth retrying with backoff (rate-limit / gateway hiccups). */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 2;
const BACKOFF_BASE_MS = 600;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}
interface OverpassResponse {
  elements: OverpassElement[];
}

/** A provider tag annotated with the interest type that requested it. */
interface TypedTag extends ProviderTag {
  typeId: string;
}

/** Assign an element to the first selected type whose tag it matches. */
const classify = (element: OverpassElement, tags: TypedTag[]): string | undefined =>
  element.tags ? tags.find((tag) => element.tags?.[tag.key] === tag.value)?.typeId : undefined;

export interface OverpassOptions {
  overpassUrl: string;
  geocodeUrl: string;
  /** Sent as User-Agent — required by the public OSM endpoints' usage policy. */
  userAgent?: string;
}

/**
 * Places adapter backed by OpenStreetMap: Nominatim for geocoding, Overpass for nearby
 * places. OSM has no ratings, so `rating` is null (the scorer treats this as neutral).
 */
export class OverpassPlacesAdapter implements PlacesAdapter {
  private readonly userAgent: string;

  constructor(private readonly options: OverpassOptions) {
    this.userAgent = options.userAgent ?? 'aptscore/0.1';
  }

  async resolveLocation(query: string): Promise<ResolvedLocation> {
    const url = `${this.options.geocodeUrl}/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const response = await this.fetchJson<Array<{ lat: string; lon: string }>>(url);
    const first = response[0];
    if (!first) throw new LocationUnresolved(query);
    return { query, lat: Number(first.lat), lng: Number(first.lon), resolved: true };
  }

  async findNearby(
    center: LatLng,
    typeIds: string[],
    radiusMeters: number,
  ): Promise<TypeCandidates[]> {
    // One batched Overpass query for ALL selected types — a request per type would
    // hammer the rate-limited endpoint and trip 429s.
    const tags: TypedTag[] = typeIds.flatMap((typeId) =>
      providerTagsForType(typeId).map((tag) => ({ typeId, ...tag })),
    );
    if (tags.length === 0) {
      return typeIds.map((typeId) => ({ typeId, coverage: 'no-data', places: [] }));
    }

    const data = await this.queryOverpass(center, radiusMeters, tags);

    const placesByType = new Map<string, CandidatePlace[]>(typeIds.map((id) => [id, []]));
    for (const element of data.elements) {
      const typeId = classify(element, tags);
      if (!typeId) continue;
      const candidate = this.toCandidate(typeId, center, element);
      if (candidate) placesByType.get(typeId)?.push(candidate);
    }

    return typeIds.map((typeId) => ({
      typeId,
      coverage: providerTagsForType(typeId).length > 0 ? 'ok' : 'no-data',
      places: placesByType.get(typeId) ?? [],
    }));
  }

  /** Build one Overpass QL query unioning every selected tag within the radius. */
  private buildQuery(center: LatLng, radiusMeters: number, tags: TypedTag[]): string {
    const around = `(around:${Math.round(radiusMeters)},${center.lat},${center.lng})`;
    const clauses = tags
      .map(({ key, value }) => {
        const filter = `["${key}"="${value}"]`;
        return `node${filter}${around};way${filter}${around};`;
      })
      .join('');
    return `[out:json][timeout:25];(${clauses});out center;`;
  }

  private async queryOverpass(
    center: LatLng,
    radiusMeters: number,
    tags: TypedTag[],
  ): Promise<OverpassResponse> {
    return this.fetchJson<OverpassResponse>(this.options.overpassUrl, {
      method: 'POST',
      body: this.buildQuery(center, radiusMeters, tags),
    });
  }

  private toCandidate(
    typeId: string,
    center: LatLng,
    element: OverpassElement,
  ): CandidatePlace | undefined {
    const point = element.center ?? { lat: element.lat, lon: element.lon };
    if (point.lat === undefined || point.lon === undefined) return undefined;
    const location: LatLng = { lat: point.lat, lng: point.lon };
    return {
      id: String(element.id),
      name: element.tags?.name ?? typeId,
      typeId,
      lat: location.lat,
      lng: location.lng,
      straightLineMeters: haversineMeters(center, location),
      rating: null,
      reviewCount: 0,
    };
  }

  /**
   * Fetch JSON, retrying transient throttling/gateway errors with exponential backoff.
   * After retries are exhausted the request fails closed as `ScoringUnavailable` (FR-012).
   */
  private async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    let lastStatus = 0;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(url, {
          ...init,
          headers: { 'User-Agent': this.userAgent, ...init?.headers },
        });
      } catch {
        throw new ScoringUnavailable('Places provider unreachable');
      }
      if (response.ok) return (await response.json()) as T;

      lastStatus = response.status;
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_RETRIES) break;
      await sleep(BACKOFF_BASE_MS * 2 ** attempt);
    }
    throw new ScoringUnavailable(`Places provider error (${lastStatus})`);
  }
}
