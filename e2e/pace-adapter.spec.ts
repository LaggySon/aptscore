import { test, expect } from '@playwright/test';
import { parseOverpassPaceResponse } from '../src/server/adapters/pace/overpass-pace-adapter';

const center = { lat: 51.5, lng: -0.1 };

test.describe('Overpass Local Pace mapping', () => {
  test('maps OSM tags to domain kinds without leaking provider tags into scoring', () => {
    const data = parseOverpassPaceResponse(center, {
      elements: [
        { type: 'node', id: 1, lat: 51.5, lon: -0.1, tags: { shop: 'bakery' } },
        { type: 'node', id: 2, lat: 51.5, lon: -0.1, tags: { amenity: 'cafe' } },
        { type: 'node', id: 3, lat: 51.5, lon: -0.1, tags: { tourism: 'museum' } },
        { type: 'node', id: 4, lat: 51.5, lon: -0.1, tags: { leisure: 'park' } },
        { type: 'node', id: 5, lat: 51.5, lon: -0.1, tags: { office: 'company' } },
        { type: 'node', id: 6, lat: 51.5, lon: -0.1, tags: { railway: 'station' } },
        { type: 'node', id: 7, lat: 51.5, lon: -0.1, tags: { railway: 'platform' } },
        { type: 'node', id: 8, lat: 51.5, lon: -0.1, tags: { railway: 'tram_stop' } },
        { type: 'node', id: 9, lat: 51.5, lon: -0.1, tags: { railway: 'subway_entrance' } },
        { type: 'node', id: 10, lat: 51.5, lon: -0.1, tags: { highway: 'bus_stop' } },
      ],
    });

    expect(data.streetFeatures.map((feature) => feature.kind)).toEqual([
      'shop',
      'cafe',
      'museum',
      'leisure',
      'office',
    ]);
    expect(data.transitFeatures.map((feature) => feature.kind)).toEqual([
      'station',
      'rail_platform',
      'tram_stop',
      'station_entrance',
      'bus_stop',
    ]);
  });

  test('turns road geometry into deterministic, midpoint-weighted domain segments', () => {
    const response = {
      elements: [
        {
          type: 'way' as const,
          id: 20,
          tags: { highway: 'primary' },
          geometry: [
            { lat: 51.5, lon: -0.1 },
            { lat: 51.501, lon: -0.1 },
            { lat: 51.502, lon: -0.1 },
          ],
        },
      ],
    };

    const first = parseOverpassPaceResponse(center, response);
    const second = parseOverpassPaceResponse(center, response);
    expect(second).toEqual(first);
    expect(first.roadSegments).toHaveLength(2);
    expect(first.roadSegments.every((segment) => segment.roadClass === 'primary')).toBe(true);
    expect(first.roadSegments.every((segment) => segment.lengthMeters > 100)).toBe(true);
    expect(first.roadSegments[0].distanceMeters).toBeLessThan(first.roadSegments[1].distanceMeters);
  });

  test('ignores unsupported roads and features outside 800m', () => {
    const data = parseOverpassPaceResponse(center, {
      elements: [
        { type: 'node', id: 1, lat: 51.51, lon: -0.1, tags: { amenity: 'cafe' } },
        {
          type: 'way',
          id: 2,
          tags: { highway: 'service' },
          geometry: [
            { lat: 51.5, lon: -0.1 },
            { lat: 51.501, lon: -0.1 },
          ],
        },
      ],
    });
    expect(data).toEqual({ streetFeatures: [], transitFeatures: [], roadSegments: [] });
  });
});
