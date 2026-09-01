import { expect, test } from '@playwright/test';

test.describe('POST /api/v1/isochrone', () => {
  test('returns a routed walking polygon for the requested range', async ({ request }) => {
    const response = await request.post('/api/v1/isochrone', {
      data: {
        location: { query: 'home' },
        range: { mode: 'minutes', value: 15 },
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.travelMode).toBe('walking');
    expect(body.range).toEqual({ mode: 'minutes', value: 15 });
    expect(body.rings[0].length).toBeGreaterThan(20);
    expect(body.rings[0][0]).toEqual(body.rings[0].at(-1));
  });

  test('supports a true distance isochrone', async ({ request }) => {
    const response = await request.post('/api/v1/isochrone', {
      data: {
        location: { query: 'home' },
        range: { mode: 'distance', value: 1, distanceUnit: 'km' },
      },
    });
    expect(response.status()).toBe(200);
    expect((await response.json()).rings[0].length).toBeGreaterThan(20);
  });
});

test('shows the walkable cloud after a successful score', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Cafés' }).click();
  await page.getByPlaceholder(/example st/i).fill('home');
  await page.getByRole('button', { name: /score this location/i }).click();

  await expect(page.getByTestId('isochrone-map')).toBeVisible();
  await expect(page.getByText(/20-minute walking area/i)).toBeVisible();
  await expect(page.getByText('Walking area', { exact: true })).toBeVisible();
});
