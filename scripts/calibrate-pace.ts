import { OverpassPaceAdapter } from '../src/server/adapters/pace/overpass-pace-adapter';
import { PACE_MODEL_V1 } from '../src/server/domain/pace-constants';
import { computeLocalPace } from '../src/server/domain/pace-score';
import type { PaceData } from '../src/server/domain/pace-types';

const locations = [
  { name: 'Lee', lat: 51.4497, lng: 0.0135, role: 'anchor' },
  { name: 'Blackheath', lat: 51.4657, lng: 0.0089, role: 'anchor' },
  { name: 'Ealing Broadway', lat: 51.5149, lng: -0.3015, role: 'anchor' },
  { name: 'Chiswick', lat: 51.4927, lng: -0.2633, role: 'anchor' },
  { name: 'Paddington', lat: 51.5154, lng: -0.1755, role: 'anchor' },
  { name: 'Oxford Circus', lat: 51.5154, lng: -0.141, role: 'anchor' },
  { name: 'Richmond', lat: 51.4613, lng: -0.3037, role: 'validation' },
  { name: 'Stratford', lat: 51.5413, lng: -0.0032, role: 'validation' },
  { name: 'Canary Wharf', lat: 51.5054, lng: -0.0235, role: 'validation' },
] as const;

const increment = (record: Record<string, number>, key: string, amount: number): void => {
  record[key] = (record[key] ?? 0) + amount;
};

const summarize = (data: PaceData) => {
  const street = { inner: {} as Record<string, number>, outer: {} as Record<string, number> };
  const transit = { inner: {} as Record<string, number>, outer: {} as Record<string, number> };
  const roads = { inner: {} as Record<string, number>, outer: {} as Record<string, number> };
  for (const feature of data.streetFeatures) {
    increment(
      street[feature.distanceMeters <= PACE_MODEL_V1.innerRadiusMeters ? 'inner' : 'outer'],
      feature.kind,
      feature.quantity ?? 1,
    );
  }
  for (const feature of data.transitFeatures) {
    increment(
      transit[feature.distanceMeters <= PACE_MODEL_V1.innerRadiusMeters ? 'inner' : 'outer'],
      feature.kind,
      feature.quantity ?? 1,
    );
  }
  for (const segment of data.roadSegments) {
    increment(
      roads[segment.distanceMeters <= PACE_MODEL_V1.innerRadiusMeters ? 'inner' : 'outer'],
      segment.roadClass,
      segment.lengthMeters,
    );
  }
  for (const ring of [roads.inner, roads.outer]) {
    for (const key of Object.keys(ring)) ring[key] = Math.round(ring[key] * 1000) / 1000;
  }
  return { street, transit, roads };
};

const main = async (): Promise<void> => {
  const adapter = new OverpassPaceAdapter({
    overpassUrl: process.env.PLACES_BASE_URL ?? 'https://overpass-api.de/api/interpreter',
    userAgent: 'aptscore-calibration/1.0',
  });

  const requestedNames = new Set(process.argv.slice(2));
  const selectedLocations = requestedNames.size
    ? locations.filter((location) => requestedNames.has(location.name))
    : locations;

  for (const location of selectedLocations) {
    const data = await adapter.getPaceData(location);
    process.stdout.write(
      `${JSON.stringify({ ...location, summary: summarize(data), result: computeLocalPace(data) })}\n`,
    );
  }
};

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
