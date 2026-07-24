/** Application configuration, sourced only from the environment (secrets never committed). */
export interface AppConfig {
  routingApiKey: string | undefined;
  placesBaseUrl: string;
  geocodeBaseUrl: string;
  routingBaseUrl: string;
  /** Google Maps Platform key for the Isochrones API (reachable-area map). */
  isochroneApiKey: string | undefined;
  isochroneBaseUrl: string;
  logLevel: string;
  /** When true, the container wires deterministic fixture adapters instead of real providers. */
  testMode: boolean;
}

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => ({
  routingApiKey: env.ROUTING_API_KEY,
  placesBaseUrl: env.PLACES_BASE_URL ?? 'https://overpass-api.de/api/interpreter',
  geocodeBaseUrl: env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org',
  routingBaseUrl: env.ROUTING_BASE_URL ?? 'https://api.openrouteservice.org',
  isochroneApiKey: env.ISOCHRONE_API_KEY,
  isochroneBaseUrl: env.ISOCHRONE_BASE_URL ?? 'https://isochrones.googleapis.com',
  logLevel: env.LOG_LEVEL ?? 'info',
  testMode: env.APTSCORE_TEST_MODE === '1',
});
