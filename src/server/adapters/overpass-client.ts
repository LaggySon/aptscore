import { ScoringUnavailable } from '../domain/errors';

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 2;
const BACKOFF_BASE_MS = 600;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Shared resilient JSON client for OSM Overpass and Nominatim requests. */
export class OsmClient {
  constructor(private readonly userAgent: string) {}

  async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    let lastStatus = 0;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(url, {
          ...init,
          headers: { 'User-Agent': this.userAgent, ...init?.headers },
        });
      } catch {
        throw new ScoringUnavailable('OpenStreetMap provider unreachable');
      }
      if (response.ok) return (await response.json()) as T;

      lastStatus = response.status;
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_RETRIES) break;
      await sleep(BACKOFF_BASE_MS * 2 ** attempt);
    }
    throw new ScoringUnavailable(`OpenStreetMap provider error (${lastStatus})`);
  }
}
