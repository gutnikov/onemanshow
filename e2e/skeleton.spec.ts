import { expect, test } from '@playwright/test';
import { SEEDED_EMAIL, SEEDED_MESSAGE, SEEDED_PASSWORD } from '@shared/schema';

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

// The two checks below assert the deployed commit, so running this suite against
// something that was not deployed needs KAMAL_VERSION set - the field is absent
// otherwise, deliberately, so that "never deployed" is distinguishable from
// "deployed something else".
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

/**
 * Staging only, and the reason identity is a feature rather than a claim.
 *
 * It signs in as the seeded account and reads the page behind a session, so the
 * whole chain is exercised: the form posts, the library creates a session, the
 * cookie is carried, the endpoint reads it, and the organisation the sign-up
 * hook created comes back. Everything before this was verified by hand once,
 * which is not the same as verified.
 */
test('signing in reaches the page behind a session', async ({ page }) => {
  await page.goto('/account');

  // Before signing in there is a form and no identity.
  await expect(page.getByTestId('email')).toBeVisible();
  await expect(page.getByTestId('account-email')).toHaveCount(0);

  await page.getByTestId('email').fill(SEEDED_EMAIL);
  await page.getByTestId('password').fill(SEEDED_PASSWORD);
  await page.getByTestId('sign-in').click();

  await expect(page.getByTestId('account-email')).toHaveText(SEEDED_EMAIL);
  // The organisation exists because a hook made one when the account appeared.
  // Asserted as present and non-empty rather than by name: the name comes from
  // the fixture, and pinning it here would make a change to the fixture look
  // like a broken session.
  await expect(page.getByTestId('account-organisation')).not.toBeEmpty();
});

/** Signing out ends the session, which is the property a stored session buys. */
test('signing out ends the session', async ({ page }) => {
  await page.goto('/account');
  await page.getByTestId('email').fill(SEEDED_EMAIL);
  await page.getByTestId('password').fill(SEEDED_PASSWORD);
  await page.getByTestId('sign-in').click();
  await expect(page.getByTestId('account-email')).toHaveText(SEEDED_EMAIL);

  await page.getByTestId('sign-out').click();
  await expect(page.getByTestId('email')).toBeVisible();
  await expect(page.getByTestId('account-email')).toHaveCount(0);

  // And it is gone rather than hidden: a reload finds no session.
  await page.reload();
  await expect(page.getByTestId('email')).toBeVisible();
});

/** A wrong password is refused and says so, rather than failing silently. */
test('a wrong password is refused', async ({ page }) => {
  await page.goto('/account');
  await page.getByTestId('email').fill(SEEDED_EMAIL);
  await page.getByTestId('password').fill('not-the-password');
  await page.getByTestId('sign-in').click();

  await expect(page.getByTestId('account-problem')).toBeVisible();
  await expect(page.getByTestId('account-email')).toHaveCount(0);
});
