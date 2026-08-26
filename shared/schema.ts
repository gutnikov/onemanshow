import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { organization } from './auth-schema';

/**
 * The single table of the reference application. It exists so that one page
 * load proves the whole chain at once: build, static serving, API, database.
 */
export const greeting = pgTable('greeting', {
  id: serial('id').primaryKey(),
  message: text('message').notNull(),
});

export type Greeting = typeof greeting.$inferSelect;

/**
 * The one table that belongs to an organisation rather than to everybody.
 *
 * It exists because a requirement saying rows record their organisation, in an
 * application whose only table is a global greeting, is a claim no run can
 * exercise. This is the smallest thing that makes scoping real: the page writes
 * one, reads back only its own organisation's, and the suite proves that two
 * organisations cannot see each other's.
 *
 * The reference to the organisation cascades. Deleting an organisation that
 * still had notes and leaving them behind would be a slower version of the same
 * mistake - rows whose owner no longer exists are rows nothing will ever show.
 */
export const note = pgTable('note', {
  id: serial('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  writtenAt: timestamp('written_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Note = typeof note.$inferSelect;

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

/**
 * A second identity, in a second organisation. It exists so that isolation is a
 * tested property rather than a described one: with one organisation, a query
 * that ignores the scope entirely returns the right answer.
 */
export const SEEDED_OTHER_EMAIL = 'other@example.test';
export const SEEDED_OTHER_PASSWORD = 'other-password-not-a-secret';
