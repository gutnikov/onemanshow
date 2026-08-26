import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { required } from '@shared/env';
import type { connect } from '../db/client';

/**
 * Identity is the application's own, over the project's own tables.
 *
 * Sessions are rows rather than signed tokens: revocation is a delete, and while
 * the product is still changing weekly you can look and see who is signed in.
 * It costs a query per authenticated request, which is also the first thing that
 * will wake a sleeping database.
 *
 * The organisation plugin is on from the first migration. Not because teams are
 * wanted yet, but because adding the structure now costs a table and a foreign
 * key, and adding it later means moving live accounts into a shape that did not
 * exist when they were created.
 */
export function createAuth(connection: ReturnType<typeof connect>) {
  return betterAuth({
    secret: required('BETTER_AUTH_SECRET'),
    // Set explicitly. Left unset, the origin is taken from the incoming
    // request, which makes callbacks and redirects depend on whatever host a
    // caller used - and the two environments differ in exactly that.
    baseURL: `https://${required('SHIP_PUBLIC_HOST')}`,
    database: drizzleAdapter(connection.db, { provider: 'pg' }),
    emailAndPassword: {
      enabled: true,
      // No verification, because verifying an address needs a mail provider and
      // that is a role this project does not have. Acceptable before there are
      // users; the first thing to fix once there are.
      requireEmailVerification: false,
    },
    plugins: [organization()],
  });
}
