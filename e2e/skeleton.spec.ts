import { expect, test } from '@playwright/test';
import { SEEDED_MESSAGE } from '@shared/schema';

/**
 * The smoke set. Tagged so `ship/smoke` can select it, and deliberately
 * assertion-light about *content*: it runs against production, where the data
 * is whatever is really there. It asserts the page renders a greeting at all,
 * which is exactly the failure a liveness check cannot see.
 */
test('page renders a greeting', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  const greeting = page.getByTestId('greeting');
  await expect(greeting).toBeVisible();
  await expect(greeting).not.toBeEmpty();
});

test('readiness endpoint reports ready', { tag: '@smoke' }, async ({ request }) => {
  const response = await request.get('/health');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ ready: true });
});

/** Staging only: staging is seeded, so the exact value is known. */
test('page renders the seeded value', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('greeting')).toHaveText(SEEDED_MESSAGE);
});

test('typed route navigation reaches the same value', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'open by id' }).click();
  await expect(page.getByText('greeting 1')).toBeVisible();
  await expect(page.getByTestId('greeting')).toHaveText(SEEDED_MESSAGE);
});
