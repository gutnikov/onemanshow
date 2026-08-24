import { readFile } from 'node:fs/promises';
import { sql as raw } from 'drizzle-orm';
import type { connect } from '../db/client';

type Connection = ReturnType<typeof connect>;

export type Readiness =
  | { ready: true }
  | { ready: false; reason: 'database-unreachable' | 'migrations-behind' };

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

  if (applied < (await expectedMigrations())) {
    return { ready: false, reason: 'migrations-behind' };
  }
  return { ready: true };
}
