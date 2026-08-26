import { expect, test } from '@playwright/test';
import type { Cookie, Page, PlaywrightWorkerArgs } from '@playwright/test';
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
 * Sign-in is rate limited, and this stand runs production's configuration.
 *
 * Better Auth limits anything under `/sign-in` to three requests per ten
 * seconds per client address - its own default, and a real defence against
 * password guessing. The address can be trusted because kamal-proxy overwrites
 * `X-Forwarded-For` whenever it terminates TLS, which it does here: every
 * visitor is counted separately and none can claim to be another.
 *
 * So the suite treats signing in as scarce rather than free. It spends the
 * allowance deliberately, waits when it is gone, and reuses a session in every
 * test that is not itself about signing in. Raising the limit for the tests was
 * the alternative and was refused: it would have made the suite green by
 * removing the defence the suite is meant to be running against.
 *
 * The bookkeeping is per process, so it holds only while the suite runs
 * serially in one worker. It does; `fullyParallel` would break it.
 */
const SIGN_IN_WINDOW_MS = 10_000;
const SIGN_IN_PER_WINDOW = 3;

// Mirrors the server's rule, which is not a rolling count but a count that
// resets after a full window of silence.
let spentInWindow = 0;
let lastSpentAt = 0;

const idleMs = () => Date.now() - lastSpentAt;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** Waits until the next sign-in request would be allowed, then records it. */
async function spendSignIn(): Promise<void> {
  while (idleMs() < SIGN_IN_WINDOW_MS && spentInWindow >= SIGN_IN_PER_WINDOW) {
    await sleep(SIGN_IN_WINDOW_MS - idleMs() + 250);
  }
  spentInWindow = idleMs() >= SIGN_IN_WINDOW_MS ? 1 : spentInWindow + 1;
  lastSpentAt = Date.now();
}

/** Waits the window out so what follows starts from a full allowance. */
async function clearSignInWindow(): Promise<void> {
  const remaining = SIGN_IN_WINDOW_MS - idleMs() + 250;
  if (remaining > 0) await sleep(remaining);
  spentInWindow = 0;
}

/** The stand, read from the config rather than from the environment twice. */
function standURL(): string {
  const url = test.info().project.use.baseURL;
  if (url === undefined) throw new Error('no baseURL configured');
  return url;
}

/**
 * Signs in over the API and returns the cookies that carry the session.
 *
 * The Origin header is not decoration: without it the request is not
 * same-origin and the library refuses it, which once looked like a broken
 * session for an hour.
 */
async function signInViaApi(
  playwright: PlaywrightWorkerArgs['playwright'],
  email: string,
  password: string,
): Promise<Cookie[]> {
  const baseURL = standURL();
  const api = await playwright.request.newContext({ baseURL });
  try {
    await spendSignIn();
    const response = await api.post('/api/auth/sign-in/email', {
      data: { email, password },
      headers: { origin: baseURL },
    });
    expect(response.status(), 'a seeded account must be able to sign in').toBe(200);
    return (await api.storageState()).cookies;
  } finally {
    await api.dispose();
  }
}

/** The same, once per account. These sessions are reused and never signed out. */
const sessions = new Map<string, Cookie[]>();

async function sessionFor(
  playwright: PlaywrightWorkerArgs['playwright'],
  email: string,
  password: string,
): Promise<Cookie[]> {
  const known = sessions.get(email);
  if (known !== undefined) return known;
  const cookies = await signInViaApi(playwright, email, password);
  sessions.set(email, cookies);
  return cookies;
}

/** Puts the page behind a session without spending sign-in allowance. */
async function as(page: Page, cookies: Cookie[]): Promise<void> {
  await page.context().clearCookies();
  await page.context().addCookies(cookies);
  await page.goto('/account');
}

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

  await page.getByTestId('email').fill(SEEDED_EMAIL);
  await page.getByTestId('password').fill(SEEDED_PASSWORD);
  await spendSignIn();
  await page.getByTestId('sign-in').click();

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
 * The message is asserted, not merely its presence. Sign-in is rate limited,
 * and "Too many requests" satisfies a check for a problem of any kind - so the
 * loose version of this test went green while saying nothing at all about
 * whether passwords are checked.
 */
test('a wrong password is refused', async ({ page }) => {
  await page.goto('/account');
  await page.getByTestId('email').fill(SEEDED_EMAIL);
  await page.getByTestId('password').fill('not-the-password');
  await spendSignIn();
  await page.getByTestId('sign-in').click();

  await expect(page.getByTestId('account-problem')).toHaveText(/invalid email or password/i);
  await expect(page.getByTestId('account-email')).toHaveCount(0);
});

/**
 * Staging only, and the test that makes organisation scoping real.
 *
 * With one organisation, a query that ignores the scope entirely returns the
 * right answer - so this visits the page as each of two seeded accounts in turn
 * and checks that neither sees the other's note. That is why the seed creates
 * two. The sessions come from the API rather than the form: switching identity
 * three times through the form is four sign-ins by itself.
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
 * The limit itself, asserted rather than assumed.
 *
 * This is the defence that made the first version of this suite flaky, and
 * nothing else here would notice if an upgrade removed it. It also pins the
 * numbers the bookkeeping above depends on: if the allowance grows, the last
 * attempt is refused for the wrong reason and this fails. It burns the whole
 * allowance, so it goes last.
 */
test('repeated sign-in attempts are refused', async ({ playwright }) => {
  const baseURL = standURL();
  const api = await playwright.request.newContext({ baseURL });
  try {
    await clearSignInWindow();

    const statuses: number[] = [];
    for (let attempt = 0; attempt <= SIGN_IN_PER_WINDOW; attempt += 1) {
      // Deliberately sequential and deliberately unpaced - the point is to
      // exceed the allowance, so this does not go through spendSignIn.
      const response = await api.post('/api/auth/sign-in/email', {
        data: { email: SEEDED_EMAIL, password: 'not-the-password' },
        headers: { origin: baseURL },
      });
      statuses.push(response.status());
    }
    spentInWindow = SIGN_IN_PER_WINDOW;
    lastSpentAt = Date.now();

    // Wrong passwords count towards the limit, which is the whole point:
    // guessing is what it defends against.
    expect(statuses.slice(0, SIGN_IN_PER_WINDOW)).toEqual(
      Array.from({ length: SIGN_IN_PER_WINDOW }, () => 401),
    );
    expect(statuses.at(-1)).toBe(429);

    // Leaves the stand as it was found. Without this a run that starts right
    // after this one meets an allowance this test already spent, and its first
    // sign-in is refused - the fresh process cannot know the window is dirty.
    await clearSignInWindow();
  } finally {
    await api.dispose();
  }
});
