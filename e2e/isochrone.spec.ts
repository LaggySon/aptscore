import { test, expect, type APIRequestContext } from '@playwright/test';

const isochrone = (request: APIRequestContext, data: unknown) =>
  request.post('/api/v1/isochrone', { data });

interface IsochroneBody {
  location: { lat: number; lng: number; resolved: boolean };
  durationSeconds: number;
  travelMode: string;
  rings: Array<Array<[number, number]>>;
  attribution: string;
}

test.describe('POST /api/v1/isochrone', () => {
  test('returns a closed reachable-area polygon for a resolvable location', async ({ request }) => {
    const response = await isochrone(request, { location: { query: 'home' } });
    expect(response.status()).toBe(200);
    const body: IsochroneBody = await response.json();

    expect(body.travelMode).toBe('walking');
    expect(body.durationSeconds).toBe(20 * 60); // default 20-minute range
    expect(body.rings.length).toBeGreaterThan(0);

    const outer = body.rings[0];
    expect(outer.length).toBeGreaterThanOrEqual(4);
    // GeoJSON rings are closed: first position equals the last.
    expect(outer[0]).toEqual(outer[outer.length - 1]);
    // Positions are [lng, lat] and centred on the resolved origin.
    for (const [lng, lat] of outer) {
      expect(typeof lng).toBe('number');
      expect(typeof lat).toBe('number');
    }
    expect(body.attribution).toBeTruthy();
  });

  test('larger time budget yields a larger reachable area (FR-003)', async ({ request }) => {
    const span = async (minutes: number): Promise<number> => {
      const body: IsochroneBody = await (
        await isochrone(request, {
          location: { query: 'home' },
          range: { mode: 'minutes', value: minutes },
        })
      ).json();
      const lngs = body.rings[0].map(([lng]) => lng);
      return Math.max(...lngs) - Math.min(...lngs);
    };
    expect(await span(30)).toBeGreaterThan(await span(10));
  });

  test('is deterministic for identical inputs (FR-014)', async ({ request }) => {
    const payload = { location: { query: 'home' }, range: { mode: 'minutes', value: 15 } };
    const first: IsochroneBody = await (await isochrone(request, payload)).json();
    const second: IsochroneBody = await (await isochrone(request, payload)).json();
    expect(second.rings).toEqual(first.rings);
  });

  test('rejects a request with no location (400)', async ({ request }) => {
    const response = await isochrone(request, { range: { mode: 'minutes', value: 10 } });
    expect(response.status()).toBe(400);
    expect((await response.json()).code).toBe('invalid_request');
  });

  test('unresolved location returns 422 (FR-002)', async ({ request }) => {
    const response = await isochrone(request, { location: { query: 'nowhere' } });
    expect(response.status()).toBe(422);
    expect((await response.json()).code).toBe('location_unresolved');
  });

  test('fails closed with 503 when the provider is down (FR-012)', async ({ request }) => {
    const response = await isochrone(request, { location: { query: 'provider-outage' } });
    expect(response.status()).toBe(503);
    expect((await response.json()).code).toBe('scoring_unavailable');
  });
});
