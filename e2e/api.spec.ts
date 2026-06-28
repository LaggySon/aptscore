import { test, expect, type APIRequestContext } from '@playwright/test';

const score = (request: APIRequestContext, data: unknown) =>
  request.post('/api/v1/score', { data });

interface Contribution {
  typeId: string;
  coverage: string;
  rawSum: number;
  weight: number;
  idealCeilingK: number;
  contributingPlaces: Array<{
    walkingMeters: number;
    walkingSeconds: number;
    value: number;
    proximityPart: number;
    ratingPart: number;
  }>;
}

test.describe('GET /api/v1/interest-types (FR-001)', () => {
  test('returns the 14-type catalog', async ({ request }) => {
    const response = await request.get('/api/v1/interest-types');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.interestTypes).toHaveLength(14);
  });
});

test.describe('POST /api/v1/score', () => {
  test('happy path returns both scores and one contribution per type (FR-008)', async ({ request }) => {
    const response = await score(request, {
      location: { query: 'home' },
      interests: [{ typeId: 'cafes' }, { typeId: 'transit' }],
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.primaryScore).toBeGreaterThan(0);
    expect(body.secondaryScore).toBeGreaterThanOrEqual(0);
    expect(body.secondaryScore).toBeLessThanOrEqual(100);
    expect(body.contributions).toHaveLength(2);
  });

  test('well-served scores higher than poorly-served (SC-002)', async ({ request }) => {
    const interests = [{ typeId: 'cafes' }, { typeId: 'transit' }];
    const home = await (await score(request, { location: { query: 'home' }, interests })).json();
    const poor = await (
      await score(request, { location: { query: 'poorly-served' }, interests })
    ).json();
    expect(home.primaryScore).toBeGreaterThan(poor.primaryScore);
  });

  test('importance weighting changes the score (FR-009)', async ({ request }) => {
    const equal = await (
      await score(request, {
        location: { query: 'home' },
        interests: [
          { typeId: 'transit', importance: 'medium' },
          { typeId: 'cafes', importance: 'medium' },
        ],
      })
    ).json();
    const weighted = await (
      await score(request, {
        location: { query: 'home' },
        interests: [
          { typeId: 'transit', importance: 'high' },
          { typeId: 'cafes', importance: 'low' },
        ],
      })
    ).json();
    expect(weighted.primaryScore).not.toBe(equal.primaryScore);
  });

  test('rejects empty interests with 400 (FR-010)', async ({ request }) => {
    const response = await score(request, { location: { query: 'home' }, interests: [] });
    expect(response.status()).toBe(400);
    expect((await response.json()).code).toBe('invalid_request');
  });

  test('unresolved location returns 422 (FR-002)', async ({ request }) => {
    const response = await score(request, {
      location: { query: 'nowhere' },
      interests: [{ typeId: 'cafes' }],
    });
    expect(response.status()).toBe(422);
    expect((await response.json()).code).toBe('location_unresolved');
  });

  test('fails closed with 503 when a provider is down (FR-012)', async ({ request }) => {
    const response = await score(request, {
      location: { query: 'provider-outage' },
      interests: [{ typeId: 'cafes' }],
    });
    expect(response.status()).toBe(503);
    expect((await response.json()).code).toBe('scoring_unavailable');
  });

  test('is deterministic for identical inputs (FR-014)', async ({ request }) => {
    const payload = {
      location: { query: 'home' },
      interests: [{ typeId: 'cafes', importance: 'high' }, { typeId: 'transit' }],
    };
    const first = await (await score(request, payload)).json();
    const second = await (await score(request, payload)).json();
    expect(second.primaryScore).toBe(first.primaryScore);
    expect(second.secondaryScore).toBe(first.secondaryScore);
    expect(second.contributions).toEqual(first.contributions);
  });

  test('distance-mode range filters by walking distance (FR-003)', async ({ request }) => {
    const response = await score(request, {
      location: { query: 'home' },
      interests: [{ typeId: 'cafes' }],
      range: { mode: 'distance', value: 500, distanceUnit: 'm' },
    });
    const body = await response.json();
    const cafes = body.contributions.find((c: Contribution) => c.typeId === 'cafes');
    expect(cafes.contributingPlaces).toHaveLength(1);
    expect(cafes.contributingPlaces[0].walkingMeters).toBeLessThanOrEqual(500);
  });

  test('reports no-data for an uncovered type (FR-015)', async ({ request }) => {
    const response = await score(request, {
      location: { query: 'home' },
      interests: [{ typeId: 'libraries' }],
    });
    const body = await response.json();
    const libraries = body.contributions.find((c: Contribution) => c.typeId === 'libraries');
    expect(libraries.coverage).toBe('no-data');
  });

  test('breakdown carries explainable places and keeps zero-contribution types (FR-011/013)', async ({
    request,
  }) => {
    const response = await score(request, {
      location: { query: 'home' },
      // cafes has nearby fixtures; restaurants is covered but has no fixtures → zero.
      interests: [{ typeId: 'cafes' }, { typeId: 'restaurants' }],
    });
    const body = await response.json();

    const cafes = body.contributions.find((c: Contribution) => c.typeId === 'cafes');
    expect(cafes.contributingPlaces.length).toBeGreaterThan(0);
    expect(cafes.contributingPlaces[0].walkingSeconds).toBeGreaterThanOrEqual(0);
    expect(cafes.contributingPlaces[0].walkingMeters).toBeGreaterThanOrEqual(0);
    // Per-place value math is exposed for the breakdown (Constitution III).
    expect(cafes.contributingPlaces[0].value).toBeGreaterThan(0);
    expect(cafes.contributingPlaces[0].proximityPart).toBeGreaterThanOrEqual(0);
    expect(cafes.weight).toBeGreaterThan(0);
    expect(cafes.idealCeilingK).toBeGreaterThan(0);

    const restaurants = body.contributions.find((c: Contribution) => c.typeId === 'restaurants');
    expect(restaurants).toBeDefined();
    expect(restaurants.coverage).toBe('ok');
    expect(restaurants.rawSum).toBe(0);
    expect(restaurants.contributingPlaces).toHaveLength(0);
  });
});
