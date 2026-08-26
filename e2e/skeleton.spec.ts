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

test('liveness answers without the database', { tag: '@smoke' }, async ({ request }) => {
  const response = await request.get('/alive');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toMatchObject({ alive: true });
  // Asserted as a shape, not a value: this runs on the migration-safety pass
  // against data that is not this change's, and an artifact's identity is not
  // content - it comes from the image.
  expect(body.release).toMatch(/^[0-9a-f]{40}$/);
});

test('readiness endpoint reports ready', { tag: '@smoke' }, async ({ request }) => {
  const response = await request.get('/health');
  expect(response.status()).toBe(200);
  const body = await response.json();
  // toMatchObject, not toEqual. Exact equality on a health payload makes every
  // additive field a smoke failure - which is what happened the first time this
  // endpoint gained one, in the change that added it.
  expect(body).toMatchObject({ ready: true });
  // The deployed commit, asserted as a shape rather than a value: this runs
  // against production's data on the migration-safety pass, where asserting on
  // content would fail any change that touches fixtures. The identity is not
  // content - it comes from the image - so checking it is present and looks
  // like a commit belongs in the smoke set.
  expect(body.release).toMatch(/^[0-9a-f]{40}$/);
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
