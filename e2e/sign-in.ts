import { expect, test } from '@playwright/test';
import type { Cookie, Page, PlaywrightWorkerArgs } from '@playwright/test';

/**
 * Sign-in is rate limited, and this stand runs production's configuration.
 *
 * Better Auth throttles anything under `/sign-in` per client address - a real
 * defence against password guessing, active whenever the application runs as
 * production. The address can be trusted because kamal-proxy overwrites
 * `X-Forwarded-For` whenever it terminates TLS, which it does here: every
 * visitor is counted separately and none can claim to be another.
 *
 * The suite therefore signs in the way a well-behaved client would: when the
 * application says it is being asked too often, it waits as long as the
 * application asked and tries again. Nothing here restates the throttle's own
 * rule - not the allowance, not the window, not how the window rolls. An
 * earlier version modelled all three, which made the suite a second copy of a
 * rule it does not own, and this project has been bitten by a second copy
 * every single time.
 *
 * Waiting on a refusal cannot hide a broken sign-in. A wrong password is
 * answered and returned rather than retried, and a sign-in that never succeeds
 * does not start succeeding because it was asked twice.
 *
 * Weakening the throttle on the stand was the alternative and was refused: it
 * would have made the suite green by removing the defence the suite runs
 * against, and left the stand unable to notice a change that starts signing in
 * repeatedly by itself.
 */
export const RATE_LIMITED = 429;

/**
 * A bound on waiting, not the allowance, and deliberately small.
 *
 * One wait is enough in principle: a throttle refusal does not advance the
 * window, so a full window of silence restores the allowance whatever it is.
 * Three covers somebody else spending it at the same time. Ten - the first
 * number here - was theatre: each wait is about ten seconds and the test
 * timeout would have killed the test during the fourth, so attempts five to ten
 * could never run, and the death would have read as a hung application.
 */
export const ATTEMPT_CAP = 3;

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** How long the application asked to be left alone, from its own answer. */
export function retryAfterMs(headers: Record<string, string>): number {
  const seconds = Number(headers['x-retry-after']);
  // A refusal without a usable hint still has to wait for something.
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : 1) * 1000 + 250;
}

/** The stand, read from the config rather than from the environment twice. */
export function standURL(): string {
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
export async function signInViaApi(
  playwright: PlaywrightWorkerArgs['playwright'],
  email: string,
  password: string,
): Promise<Cookie[]> {
  const baseURL = standURL();
  const api = await playwright.request.newContext({ baseURL });
  try {
    for (let attempt = 1; attempt <= ATTEMPT_CAP; attempt += 1) {
      const response = await api.post('/api/auth/sign-in/email', {
        data: { email, password },
        headers: { origin: baseURL },
      });
      if (response.status() !== RATE_LIMITED) {
        expect(
        response.status(),
        // Named rather than assumed: this helper serves the seeded fixture on
        // the stand and the synthetic account in production, and a message
        // about the wrong one sends whoever reads a red release to the wrong
        // environment.
        `${email} must be able to sign in at ${baseURL}`,
      ).toBe(200);
        return (await api.storageState()).cookies;
      }
      await sleep(retryAfterMs(response.headers()));
    }
    throw new Error(`sign-in was still throttled after ${ATTEMPT_CAP} attempts`);
  } finally {
    await api.dispose();
  }
}

/** The same, once per account. These sessions are reused and never signed out. */
const sessions = new Map<string, Cookie[]>();

export async function sessionFor(
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

/** Puts the page behind a session without going through the form. */
export async function as(page: Page, cookies: Cookie[]): Promise<void> {
  await page.context().clearCookies();
  await page.context().addCookies(cookies);
  await page.goto('/account');
}

/**
 * Fills the form, submits it, and submits again for as long as the throttle
 * refuses. Returns the status of the attempt that was actually judged, so the
 * caller asserts on the answer rather than on the retrying.
 */
export async function submitSignIn(page: Page, email: string, password: string): Promise<number> {
  await page.getByTestId('email').fill(email);
  await page.getByTestId('password').fill(password);
  for (let attempt = 1; attempt <= ATTEMPT_CAP; attempt += 1) {
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/sign-in/email')),
      page.getByTestId('sign-in').click(),
    ]);
    if (response.status() !== RATE_LIMITED) return response.status();
    await sleep(retryAfterMs(response.headers()));
  }
  throw new Error(`the form was still throttled after ${ATTEMPT_CAP} attempts`);
}
