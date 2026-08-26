import { expect, test } from '@playwright/test';
import {
  RATE_LIMITED,
  as,
  retryAfterMs,
  sessionFor,
  signInViaApi,
  sleep,
  standURL,
  submitSignIn,
} from './sign-in';
import {
  SEEDED_EMAIL,
  SEEDED_MESSAGE,
  SEEDED_OTHER_EMAIL,
  SEEDED_OTHER_PASSWORD,
  SEEDED_PASSWORD,
} from '@shared/schema';

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
 * The one test that signs in through the form, so the whole chain is exercised
 * the way a person exercises it: the form posts, the library creates a session,
 * the cookie is carried, the endpoint reads it, and the organisation the
 * sign-up hook created comes back.
 */
test('signing in reaches the page behind a session', async ({ page }) => {
  await page.goto('/account');

  // Before signing in there is a form and no identity.
  await expect(page.getByTestId('email')).toBeVisible();
  await expect(page.getByTestId('account-email')).toHaveCount(0);

  expect(await submitSignIn(page, SEEDED_EMAIL, SEEDED_PASSWORD)).toBe(200);

  await expect(page.getByTestId('account-email')).toHaveText(SEEDED_EMAIL);
  // The organisation exists because a hook made one when the account appeared.
  // Asserted as present and non-empty rather than by name: the name comes from
  // the fixture, and pinning it here would make a change to the fixture look
  // like a broken session.
  await expect(page.getByTestId('account-organisation')).not.toBeEmpty();
});

/** Signing out ends the session, which is the property a stored session buys. */
test('signing out ends the session', async ({ page, playwright }) => {
  // Its own session rather than a shared one: signing out revokes the token,
  // and a revoked cookie left in the shared map would fail every test after.
  await as(page, await signInViaApi(playwright, SEEDED_EMAIL, SEEDED_PASSWORD));
  await expect(page.getByTestId('account-email')).toHaveText(SEEDED_EMAIL);

  await page.getByTestId('sign-out').click();
  await expect(page.getByTestId('email')).toBeVisible();
  await expect(page.getByTestId('account-email')).toHaveCount(0);

  // And it is gone rather than hidden: a reload finds no session.
  await page.reload();
  await expect(page.getByTestId('email')).toBeVisible();
});

/**
 * A wrong password is refused, and refused for being wrong.
 *
 * Both halves are asserted. The status distinguishes a judged attempt from a
 * throttled one, and the message is checked rather than merely present: sign-in
 * is rate limited, and "Too many requests" satisfies a check for a problem of
 * any kind - so the loose version of this test went green while saying nothing
 * at all about whether passwords are checked.
 */
test('a wrong password is refused', async ({ page }) => {
  await page.goto('/account');

  expect(await submitSignIn(page, SEEDED_EMAIL, 'not-the-password')).toBe(401);

  await expect(page.getByTestId('account-problem')).toHaveText(/invalid email or password/i);
  await expect(page.getByTestId('account-email')).toHaveCount(0);
});

/**
 * Staging only, and the test that makes organisation scoping real.
 *
 * With one organisation, a query that ignores the scope entirely returns the
 * right answer - so this visits the page as each of two seeded accounts in turn
 * and checks that neither sees the other's note. That is why the seed creates
 * two. The sessions come from the API rather than the form, because switching
 * identity three times through the form is four sign-ins by itself.
 */
test('an organisation sees only its own notes', async ({ page, playwright }) => {
  const mine = `mine-${Date.now()}`;
  const theirs = `theirs-${Date.now()}`;

  const ours = await sessionFor(playwright, SEEDED_EMAIL, SEEDED_PASSWORD);
  const other = await sessionFor(playwright, SEEDED_OTHER_EMAIL, SEEDED_OTHER_PASSWORD);

  await as(page, ours);
  await page.getByTestId('note-body').fill(mine);
  await page.getByTestId('add-note').click();
  await expect(page.getByTestId('note').filter({ hasText: mine })).toHaveCount(1);

  await as(page, other);
  // The other organisation's note is not merely hidden in the list - it is not
  // in the answer at all, because the scope is in the query.
  await expect(page.getByTestId('note').filter({ hasText: mine })).toHaveCount(0);
  await page.getByTestId('note-body').fill(theirs);
  await page.getByTestId('add-note').click();
  await expect(page.getByTestId('note').filter({ hasText: theirs })).toHaveCount(1);

  await as(page, ours);
  await expect(page.getByTestId('note').filter({ hasText: mine })).toHaveCount(1);
  await expect(page.getByTestId('note').filter({ hasText: theirs })).toHaveCount(0);
});

/** Writing without a session is refused, not silently scoped to nothing. */
test('notes require a session', async ({ request }) => {
  expect((await request.get('/api/notes')).status()).toBe(401);
  expect((await request.post('/api/notes', { data: { body: 'x' } })).status()).toBe(401);
});

/**
 * The throttle itself, asserted as a property rather than as a number.
 *
 * Nothing else here would notice if an upgrade removed this defence, and every
 * other test is written to survive whatever the allowance happens to be - so
 * this one asks only what matters: that guessing is eventually refused instead
 * of endlessly checked, and that it is refused within a number of attempts that
 * makes the defence worth having.
 *
 * It burns the allowance, so it goes last and puts back what it spent.
 */
test('repeated sign-in attempts are refused', async ({ playwright }) => {
  const baseURL = standURL();
  const api = await playwright.request.newContext({ baseURL });
  try {
    const statuses: number[] = [];
    let refusal;

    // Its own bound, not the retry cap: those are different questions. This one
    // asks how many attempts may be judged before the defence is worth
    // doubting; the cap asks how long a well-behaved client waits.
    const worthDoubting = 10;

    while (statuses.length < worthDoubting && refusal === undefined) {
      const response = await api.post('/api/auth/sign-in/email', {
        data: { email: SEEDED_EMAIL, password: 'not-the-password' },
        headers: { origin: baseURL },
      });
      statuses.push(response.status());
      if (response.status() === RATE_LIMITED) refusal = response;
    }

    expect(refusal, `attempts were still being checked after ${statuses.length}`).toBeDefined();
    // Every attempt before the refusal was judged and rejected: wrong passwords
    // count towards the limit, which is the whole point of having one.
    expect(statuses.slice(0, -1)).toEqual(statuses.slice(0, -1).map(() => 401));

    // Leaves the stand as it was found, waiting exactly as long as it asked.
    // Without this a run starting straight after meets an allowance this test
    // already spent, and its first sign-in is refused.
    if (refusal !== undefined) await sleep(retryAfterMs(refusal.headers()));
  } finally {
    await api.dispose();
  }
});
