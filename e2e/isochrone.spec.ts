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
  await expect(page.locator('.static-cloud__shape')).toBeVisible();
  await expect(page.locator('.maplibre-container')).toHaveCSS('visibility', 'hidden');
});

test('keeps the fallback walking area above the mobile results sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Cafés' }).click();
  await page.getByPlaceholder(/example st/i).fill('home');
  await page.getByRole('button', { name: /score this location/i }).click();

  const cloud = await page.locator('.static-cloud__shape').boundingBox();
  const panel = await page.locator('.app-panel').boundingBox();
  expect(cloud).not.toBeNull();
  expect(panel).not.toBeNull();
  expect(cloud!.y + cloud!.height).toBeLessThan(panel!.y);
});

test('explains marker colors and opens place details from a map marker', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Cafés' }).click();
  await page.getByPlaceholder(/example st/i).fill('home');
  await page.getByRole('button', { name: /score this location/i }).click();

  const legend = page.getByLabel('Map key');
  await expect(legend).toContainText('Walking area');
  await expect(legend).toContainText('Your address');
  await expect(legend).toContainText('Cafés');

  await page.getByRole('button', { name: 'View cafes place' }).first().click();
  const placeDetails = page.getByRole('dialog', { name: 'cafes place' });
  await expect(placeDetails).toContainText('Cafés');
  await expect(placeDetails).toContainText('cafes place');
  await expect(placeDetails).toContainText(/min walk · \d+ m/);
});
