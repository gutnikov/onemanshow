import { Hono } from 'hono';
import { greeting } from '@shared/schema';
import { flag } from '@shared/env';
import type { connect } from '../db/client';
import { checkReadiness } from './readiness';
import { releaseFromVersion } from './observability';

/**
 * Routes are defined in one chain so that Hono can derive the client type from
 * them. A change to any response shape here becomes a compile error in the web
 * build rather than a defect somebody finds on staging.
 */
export function createRoutes(connection: ReturnType<typeof connect>) {
  return new Hono()
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
      // The commit is reported alongside readiness rather than on an endpoint
      // of its own. Anyone who wants to know what is running also wants to
      // know whether it is alive, and two endpoints could disagree.
      //
      // It is what makes the guard "production and main agree" enforceable. A
      // deploy log records what was intended; a rollback is exactly when
      // intent and reality differ, and that is when the question gets asked.
      // Absent rather than invented when nothing supplied it, so a caller can
      // tell "never deployed" from "deployed something else".
      const release = releaseFromVersion(process.env['KAMAL_VERSION']);
      const readiness = await checkReadiness(connection);
      return readiness.ready
        ? c.json({ ready: true as const, release }, 200)
        : c.json({ ready: false as const, reason: readiness.reason, release }, 503);
    });
}

export type AppRoutes = ReturnType<typeof createRoutes>;
