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
