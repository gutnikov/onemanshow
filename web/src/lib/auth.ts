import { createAuthClient } from 'better-auth/react';

/**
 * The origin is taken from the page rather than configured, because the page and
 * the API are the same deployable unit - one image serves both, so they cannot
 * disagree about where they are.
 *
 * Using the library's client rather than calling its endpoints by hand: the
 * state-changing calls check the Origin header, and hand-written fetches got
 * 415, 400 and 403 in turn while the session was perfectly fine. That is a
 * detail worth delegating.
 */
export const authClient = createAuthClient({ baseURL: window.location.origin });
