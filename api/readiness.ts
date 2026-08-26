import { readFile } from 'node:fs/promises';
import { sql as raw } from 'drizzle-orm';
import type { connect } from '../db/client';

type Connection = ReturnType<typeof connect>;

export type Readiness =
  | { ready: true }
  | { ready: false; reason: 'database-unreachable' | 'migrations-behind' | 'schema-ahead' };

/**
 * Postgres reports a missing table as 42P01. A database that has never been
 * migrated has no migrations table, and reading that as "unreachable" sends
 * somebody to look at networking and credentials when the answer is "run the
 * migrations" - which is what this did until a probe against a fresh database
 * said `database-unreachable` and meant nothing of the kind.
 */
const UNDEFINED_TABLE = '42P01';

/**
 * The code is looked for in two places on purpose. The ORM wraps query errors,
 * so the driver's code moved from the error itself to its `cause` between
 * versions - and the code that would have noticed was a bare `catch` that threw
 * every failure into one bucket. Checking both survives the wrapping either way.
 */
function appliedFromError(error: unknown): number | undefined {
  const own = (error as { code?: unknown } | null)?.code;
  const caused = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  return own === UNDEFINED_TABLE || caused === UNDEFINED_TABLE ? 0 : undefined;
}

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
  } catch (error) {
    const none = appliedFromError(error);
    if (none === undefined) return { ready: false, reason: 'database-unreachable' };
    // Reachable, and nothing has been applied to it.
    applied = none;
  }

  return readinessFrom(applied, await expectedMigrations());
}
