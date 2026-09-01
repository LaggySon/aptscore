import { loadConfig } from './config/env';
import { logger } from './config/logger';
import { MockPlacesAdapter, type MockPlacesConfig } from './adapters/places/mock-places-adapter';
import { MockRoutingAdapter } from './adapters/routing/mock-routing-adapter';
import { OverpassPlacesAdapter } from './adapters/places/overpass-places-adapter';
import { OrsRoutingAdapter } from './adapters/routing/ors-routing-adapter';
import { ScoringService } from './services/scoring-service';
import type { CandidatePlace } from './domain/types';
import { MockPaceAdapter } from './adapters/pace/mock-pace-adapter';
import { OverpassPaceAdapter } from './adapters/pace/overpass-pace-adapter';
import { MockIsochroneAdapter } from './adapters/isochrone/mock-isochrone-adapter';
import { OrsIsochroneAdapter } from './adapters/isochrone/ors-isochrone-adapter';
import { IsochroneService } from './services/isochrone-service';

const TEST_ORIGIN = { lat: 51.5074, lng: -0.1278 };

/** Build a fixture candidate near central London; distance is recomputed by the adapter. */
const place = (
  typeId: string,
  lngOffset: number,
  extra: Partial<CandidatePlace> = {},
): CandidatePlace => ({
  id: `${typeId}-${lngOffset}`,
  name: `${typeId} place`,
  typeId,
  lat: TEST_ORIGIN.lat,
  lng: TEST_ORIGIN.lng + lngOffset,
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
  point: TEST_ORIGIN,
  unresolvedQueries: ['nowhere'],
  outageQueries: ['provider-outage'],
  points: { 'poorly-served': { lat: 50, lng: 50 } },
  noDataTypes: ['libraries'],
  candidates: {
    cafes: [place('cafes', 0.001), place('cafes', 0.009)],
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
        pace: new MockPaceAdapter({
          streetFeatures: [
            { kind: 'shop', distanceMeters: 150, quantity: 24 },
            { kind: 'cafe', distanceMeters: 550, quantity: 8 },
          ],
          transitFeatures: [
            { kind: 'station', distanceMeters: 300 },
            { kind: 'bus_stop', distanceMeters: 600, quantity: 6 },
          ],
          roadSegments: [
            { roadClass: 'primary', distanceMeters: 300, lengthMeters: 500 },
            { roadClass: 'residential_unclassified', distanceMeters: 600, lengthMeters: 1200 },
          ],
        }),
        routing: new MockRoutingAdapter(),
      })
    : new ScoringService({
        logger,
        places: new OverpassPlacesAdapter({
          overpassUrl: config.placesBaseUrl,
          geocodeUrl: config.geocodeBaseUrl,
        }),
        pace: new OverpassPaceAdapter({ overpassUrl: config.placesBaseUrl }),
        routing: new OrsRoutingAdapter({
          baseUrl: config.routingBaseUrl,
          apiKey: config.routingApiKey,
        }),
      });
  return cached;
};

let cachedIsochrone: IsochroneService | undefined;

/** Reachable walking area, backed by ORS in production and a deterministic fixture in tests. */
export const getIsochroneService = (): IsochroneService => {
  if (cachedIsochrone) return cachedIsochrone;
  const config = loadConfig();
  const places = new MockPlacesAdapter(TEST_FIXTURES);

  cachedIsochrone = config.testMode
    ? new IsochroneService({
        logger,
        places,
        isochrone: new MockIsochroneAdapter(),
        attribution: 'Test isochrone',
      })
    : new IsochroneService({
        logger,
        places: new OverpassPlacesAdapter({
          overpassUrl: config.placesBaseUrl,
          geocodeUrl: config.geocodeBaseUrl,
        }),
        isochrone: new OrsIsochroneAdapter({
          baseUrl: config.routingBaseUrl,
          apiKey: config.routingApiKey,
        }),
        attribution: 'openrouteservice · OpenStreetMap',
      });
  return cachedIsochrone;
};
