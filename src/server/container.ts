import { loadConfig } from './config/env';
import { logger } from './config/logger';
import { MockPlacesAdapter, type MockPlacesConfig } from './adapters/places/mock-places-adapter';
import { MockRoutingAdapter } from './adapters/routing/mock-routing-adapter';
import { OverpassPlacesAdapter } from './adapters/places/overpass-places-adapter';
import { OrsRoutingAdapter } from './adapters/routing/ors-routing-adapter';
import { ScoringService } from './services/scoring-service';
import type { CandidatePlace } from './domain/types';

/** Build a fixture candidate near the origin; distance is recomputed by the adapter. */
const place = (
  typeId: string,
  lngOffset: number,
  extra: Partial<CandidatePlace> = {},
): CandidatePlace => ({
  id: `${typeId}-${lngOffset}`,
  name: `${typeId} place`,
  typeId,
  lat: 0,
  lng: lngOffset,
  straightLineMeters: 0,
  rating: null,
  reviewCount: 0,
  ...extra,
});

/**
 * Deterministic fixtures for the test-mode server. Sentinel queries drive error paths:
 * `nowhere` → 422 unresolved, `provider-outage` → 503, `poorly-served` → far from everything.
 */
const TEST_FIXTURES: MockPlacesConfig = {
  unresolvedQueries: ['nowhere'],
  outageQueries: ['provider-outage'],
  points: { 'poorly-served': { lat: 50, lng: 50 } },
  noDataTypes: ['libraries'],
  candidates: {
    cafes: [place('cafes', 0.001), place('cafes', 0.007)],
    transit: [place('transit', 0.0015, { rating: 5, reviewCount: 40 })],
    groceries: [place('groceries', 0.003)],
    bookstores: [place('bookstores', 0.004, { rating: 4, reviewCount: 12 })],
  },
};

let cached: ScoringService | undefined;

/** Lazily build the scoring service, wiring fixtures in test mode and real providers otherwise. */
export const getScoringService = (): ScoringService => {
  if (cached) return cached;
  const config = loadConfig();

  cached = config.testMode
    ? new ScoringService({
        logger,
        places: new MockPlacesAdapter(TEST_FIXTURES),
        routing: new MockRoutingAdapter(),
      })
    : new ScoringService({
        logger,
        places: new OverpassPlacesAdapter({
          overpassUrl: config.placesBaseUrl,
          geocodeUrl: config.geocodeBaseUrl,
        }),
        routing: new OrsRoutingAdapter({
          baseUrl: config.routingBaseUrl,
          apiKey: config.routingApiKey,
        }),
      });
  return cached;
};
