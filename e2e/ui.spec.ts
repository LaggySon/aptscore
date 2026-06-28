import { test, expect } from '@playwright/test';

test.describe('Scoring UI (US1)', () => {
  test('disables submit until a type and location are provided (FR-010)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/select at least one interest type/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /score this location/i })).toBeDisabled();
  });

  test('range control reveals the unit selector in distance mode (FR-003)', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Range type').selectOption('distance');
    await expect(page.getByLabel('Unit')).toBeVisible();
  });

  test('scores a location end-to-end and shows both scores (FR-008)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Cafés' }).click();
    await page.getByPlaceholder(/example st/i).fill('home');

    const submit = page.getByRole('button', { name: /score this location/i });
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.getByTestId('primary-score')).toBeVisible();
    await expect(page.getByTestId('secondary-score')).toBeVisible();
  });

  test('shows an explainable breakdown with a top match and no-data state (US2)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Cafés' }).click();
    await page.getByRole('button', { name: 'Public transit' }).click();
    await page.getByRole('button', { name: 'Libraries' }).click(); // fixtures report no-data
    await page.getByPlaceholder(/example st/i).fill('home');
    await page.getByRole('button', { name: /score this location/i }).click();

    await expect(page.getByTestId('breakdown')).toBeVisible();
    await expect(page.getByText('Top match')).toBeVisible();
    await expect(page.getByText(/no data for this area/i)).toBeVisible();
  });
});
