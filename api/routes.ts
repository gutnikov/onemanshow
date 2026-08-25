import { Hono } from 'hono';
import { greeting } from '@shared/schema';
import { flag } from '@shared/env';
import type { connect } from '../db/client';
import { checkReadiness } from './readiness';

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
    .get('/health', async (c) => {
      const readiness = await checkReadiness(connection);
      return readiness.ready
        ? c.json({ ready: true as const }, 200)
        : c.json({ ready: false as const, reason: readiness.reason }, 503);
    });
}

export type AppRoutes = ReturnType<typeof createRoutes>;
