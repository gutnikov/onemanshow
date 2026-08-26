import { expect, test } from '@playwright/test';
import { submitSignIn } from './sign-in';
import { SEEDED_EMAIL, SEEDED_PASSWORD } from '@shared/schema';

/**
 * The only check that signs in to production.
 *
 * It lives apart from the smoke set rather than inside it. `ship/smoke` also
 * runs against the stand on the pass that is deliberately content-agnostic -
 * the data there is whatever production's own code produced, not what this
 * change's fixtures describe - and a check that requires a particular account
 * to exist is content-dependent by construction. Putting this in there would
 * have dissolved the property that makes that pass safe.
 *
 * The account comes from the environment, and falls back to the seeded fixture.
 * That fallback is what makes the check runnable against the stand and on a
 * laptop; it is also what makes a release that forgets to pass production's
 * account fail loudly rather than pass vacuously, because production has no
 * seeded account and never will.
 */
const email = process.env['SHIP_SIGNIN_EMAIL'] ?? SEEDED_EMAIL;
const password = process.env['SHIP_SIGNIN_PASSWORD'] ?? SEEDED_PASSWORD;

test('signing in works in this environment @signin', async ({ page }) => {
  await page.goto('/account');
  await expect(page.getByTestId('email')).toBeVisible();

  // The wrong password first. A check that only ever sees the right one cannot
  // tell "signing in works" from "signing in accepts anything", and the second
  // is the failure worth finding in production.
  expect(await submitSignIn(page, email, 'not-the-password')).toBe(401);
  await expect(page.getByTestId('account-problem')).toHaveText(/invalid email or password/i);

  await page.reload();

  // Then the real one, through the form rather than the endpoint. The cookie
  // the browser is asked to keep, and the bundle that asks for it, are the only
  // failure class this check catches that nothing else does.
  expect(await submitSignIn(page, email, password)).toBe(200);
  await expect(page.getByTestId('account-email')).toHaveText(email);
  await expect(page.getByTestId('account-organisation')).not.toBeEmpty();

  // Read-only, deliberately. What it leaves behind is the session that signing
  // in created, and nothing else - not one row the product would call data.
});
