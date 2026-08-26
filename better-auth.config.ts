/**
 * Exists only so the schema generator can enumerate the tables the identity
 * library needs. The application builds its own instance in api/auth.ts, where
 * the connection is passed in rather than constructed at import time.
 *
 * Nothing here connects: the postgres client is lazy, so this builds an object
 * and touches no database. That is what lets the generator run in a checkout
 * with no environment.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const db = drizzle(postgres('postgres://generator@localhost/generator', { max: 1 }));

export const auth = betterAuth({
  secret: 'generator-only-not-a-secret',
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  plugins: [organization()],
});
