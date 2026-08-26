import { pgTable, serial, text } from 'drizzle-orm/pg-core';

/**
 * The single table of the reference application. It exists so that one page
 * load proves the whole chain at once: build, static serving, API, database.
 */
export const greeting = pgTable('greeting', {
  id: serial('id').primaryKey(),
  message: text('message').notNull(),
});

export type Greeting = typeof greeting.$inferSelect;

/** The one row `ship/seed` writes, and the value the end-to-end test asserts. */
export const SEEDED_MESSAGE = 'the skeleton walks';

/**
 * The identity `ship/seed` creates, and the credentials the end-to-end suite
 * signs in with. A fixture, in the repository on purpose: the suite has to know
 * them, and a secret the tests must be told is not a secret.
 *
 * This account exists only where the database is seeded, which is never
 * production. Production has a synthetic account of its own, created once by
 * hand, whose password is a real secret because it can sign in to production.
 */
export const SEEDED_EMAIL = 'seeded@example.test';
export const SEEDED_PASSWORD = 'seeded-password-not-a-secret';
