import { randomUUID } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { eq } from 'drizzle-orm';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import * as authSchema from '@shared/auth-schema';
import { member as memberTable, organization as organizationTable } from '@shared/auth-schema';
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
    // A full origin, scheme included. Left unset, this is taken from the
    // incoming request, so callbacks and redirects would depend on whichever
    // host a caller used - and the two environments differ in exactly that.
    //
    // The scheme is configuration rather than a constant because the first
    // version hardcoded https, which made the application impossible to run
    // locally over http: sign-out answered 403 and the reason was an origin
    // check, not the session. A template nobody can run locally is a template
    // nobody adopts.
    baseURL: required('SHIP_PUBLIC_URL'),
    // The schema is passed explicitly. The connection is built without one -
    // the application's own queries name their tables - so the adapter has
    // nothing to look in otherwise, and says so: "the model user was not found
    // in the schema object".
    database: drizzleAdapter(connection.db, { provider: 'pg', schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      // No verification, because verifying an address needs a mail provider and
      // that is a role this project does not have. Acceptable before there are
      // users; the first thing to fix once there are.
      requireEmailVerification: false,
    },
    plugins: [organization()],
    databaseHooks: {
      user: {
        create: {
          // An organisation is created for every account, at the moment the
          // account appears. A product with one user has an organisation of
          // one - the structure exists so that a second member later changes
          // who can see a row rather than requiring the row to be reshaped.
          //
          // Written with the project's own queries because these are the
          // project's own tables. The alternative is calling the library's own
          // endpoint from inside its own hook, which needs a session that does
          // not exist yet.
          after: async (user) => {
            const id = randomUUID();
            await connection.db.insert(organizationTable).values({
              id,
              name: user.name === '' ? user.email : user.name,
              // Derived from the account's id rather than its name: names
              // collide and the column is unique, so a second person called
              // the same thing would fail to sign up.
              slug: `org-${user.id}`,
              createdAt: new Date(),
            });
            await connection.db.insert(memberTable).values({
              id: randomUUID(),
              organizationId: id,
              userId: user.id,
              role: 'owner',
              createdAt: new Date(),
            });
          },
        },
      },
    },
  });
}

/** The organisation an account belongs to, and nothing else about it. */
export async function organisationOf(
  connection: ReturnType<typeof connect>,
  userId: string,
): Promise<{ id: string; name: string } | undefined> {
  const rows = await connection.db
    .select({ id: organizationTable.id, name: organizationTable.name })
    .from(memberTable)
    .innerJoin(organizationTable, eq(memberTable.organizationId, organizationTable.id))
    .where(eq(memberTable.userId, userId))
    .limit(1);
  return rows[0];
}
