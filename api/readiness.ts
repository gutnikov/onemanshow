import { readFile } from 'node:fs/promises';
import { sql as raw } from 'drizzle-orm';
import type { connect } from '../db/client';

type Connection = ReturnType<typeof connect>;

export type Readiness =
  | { ready: true }
  | { ready: false; reason: 'database-unreachable' | 'migrations-behind' | 'schema-ahead' };

/**
 * Drift is compared in both directions, and the second one is the reason this is
 * a separate pure function.
 *
 * `applied < expected` is the obvious case: the schema has not caught up with
 * the code. `applied > expected` is the one that matters more, because it is the
 * state a rollback leaves behind - the schema moved on and the redeployed older
 * code cannot work against it. Reporting ready there would keep the external
 * liveness check green through exactly the incident it exists to catch.
 */
export function readinessFrom(applied: number, expected: number): Readiness {
  if (applied < expected) return { ready: false, reason: 'migrations-behind' };
  if (applied > expected) return { ready: false, reason: 'schema-ahead' };
  return { ready: true };
}

/** Number of migrations the code at this commit expects to have been applied. */
async function expectedMigrations(): Promise<number> {
  const journal = await readFile('./db/migrations/meta/_journal.json', 'utf8');
  const parsed = JSON.parse(journal) as { entries: unknown[] };
  return parsed.entries.length;
}

/**
 * Readiness is deliberately more than "the process is up": an application that
 * answers while its schema is behind will serve errors, and a health check that
 * cannot see that is worse than no health check at all.
 */
export async function checkReadiness({ db }: Connection): Promise<Readiness> {
  let applied: number;
  try {
    const rows = await db.execute<{ count: string }>(
      raw`select count(*)::text as count from drizzle.__drizzle_migrations`,
    );
    applied = Number(rows[0]?.count ?? '0');
  } catch {
    return { ready: false, reason: 'database-unreachable' };
  }

  return readinessFrom(applied, await expectedMigrations());
}
