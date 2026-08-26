import { Hono } from 'hono';
import { greeting } from '@shared/schema';
import { flag } from '@shared/env';
import type { connect } from '../db/client';
import { createAuth, organisationOf } from './auth';
import { checkReadiness } from './readiness';
import { releaseFromVersion } from './observability';

/**
 * Routes are defined in one chain so that Hono can derive the client type from
 * them. A change to any response shape here becomes a compile error in the web
 * build rather than a defect somebody finds on staging.
 */
export function createRoutes(connection: ReturnType<typeof connect>) {
  const auth = createAuth(connection);

  return new Hono()
    // The identity library owns everything under this prefix: sign-up, sign-in,
    // sign-out, session. Mounted outside the typed chain because it is not our
    // route to describe - it answers with whatever the library decides.
    .on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

    // Who is signed in, and which organisation they belong to. The one endpoint
    // that requires a session, so that the page behind it proves a session is
    // created, carried and read - rather than the capability being asserted.
    .get('/api/me', async (c) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (session === null) {
        return c.json({ error: 'not signed in' as const }, 401);
      }
      const organisation = await organisationOf(connection, session.user.id);
      if (organisation === undefined) {
        // Every account gets one when it is created, so this means the row is
        // missing rather than absent by design - worth saying differently from
        // "not signed in".
        return c.json({ error: 'no organisation' as const }, 500);
      }
      return c.json({
        email: session.user.email,
        organisation: { id: organisation.id, name: organisation.name },
      });
    })
    .get('/api/greeting', async (c) => {
      // Deliberate failure switch. It breaks the page while the process stays
      // up and /health keeps answering 2xx - the "up but broken" mode that a
      // liveness check alone cannot see, and the reason smoke exercises pages.
      if (flag('SHIP_BREAK_GREETING')) {
        // Throwing rather than returning a tidy 500 makes one switch exercise
        // two paths: the smoke set fails, and an error reaches the tracker
        // attributed to this release.
        throw new Error('deliberately broken by SHIP_BREAK_GREETING');
      }
      const rows = await connection.db.select().from(greeting).limit(1);
      const row = rows[0];
      if (row === undefined) {
        return c.json({ error: 'not seeded' as const }, 503);
      }
      return c.json({ message: row.message });
    })
    // Liveness. Two properties, and both are the point: it says the process is
    // serving, and it says which commit is serving. It touches no database.
    //
    // Separate from readiness because a managed database that sleeps is woken by
    // whatever polls it - a readiness check on a five-minute interval keeps it
    // awake permanently, which would spend an entire free tier's compute on
    // health checks with no users. The frequent check has to be cheap.
    //
    // What is given up, stated here because it is easy to forget: between
    // deployments nothing continuously observes the database. A database failure
    // with no traffic shows this endpoint green and produces no errors, because
    // there were no requests to fail.
    .get('/alive', (c) =>
      c.json({ alive: true as const, release: releaseFromVersion(process.env['KAMAL_VERSION']) }, 200),
    )
    .get('/health', async (c) => {
      // The commit appears here as well as on liveness, so a caller holding
      // this response does not need a second request to learn what answered.
      // It is read from liveness by everything that asks what production is
      // running, because that question matters most when production is not
      // ready - and this endpoint is the one that says so.
      //
      // The earlier reasoning here was that one endpoint cannot disagree with
      // itself. That was true and is no longer the arrangement: there are two,
      // and they are allowed to disagree, because "the process is serving" and
      // "it can serve requests" are different questions and the gap between
      // them is the up-but-broken state a single check cannot describe.
      const release = releaseFromVersion(process.env['KAMAL_VERSION']);
      const readiness = await checkReadiness(connection);
      return readiness.ready
        ? c.json({ ready: true as const, release }, 200)
        : c.json({ ready: false as const, reason: readiness.reason, release }, 503);
    });
}

export type AppRoutes = ReturnType<typeof createRoutes>;
