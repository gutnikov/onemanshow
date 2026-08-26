import { createAuth } from '../api/auth';
import {
  greeting,
  SEEDED_EMAIL,
  SEEDED_MESSAGE,
  SEEDED_OTHER_EMAIL,
  SEEDED_OTHER_PASSWORD,
  SEEDED_PASSWORD,
} from '@shared/schema';
import { organization, user } from '@shared/auth-schema';
import { connect } from './client';

/**
 * Idempotent by construction: everything it writes is removed first, so seeding
 * twice from any starting point yields identical state.
 */
const connection = connect(1);
const { sql, db } = connection;

await db.delete(greeting);
await db.insert(greeting).values({ message: SEEDED_MESSAGE });

// The identity is created through the library's own sign-up rather than by
// inserting rows. Two reasons, and the second is the important one: the password
// is hashed the way the library hashes it, so a change to that is not a fixture
// nobody can sign in with; and the hook that gives every account an organisation
// runs, so the fixture is the shape the application actually produces rather
// than a shape the seed imagines.
//
// Both, and in this order. Deleting the user cascades to its sessions, accounts
// and memberships - but not to the organisation, which has no foreign key to a
// user. An earlier comment here claimed otherwise, and seeding twice would have
// accumulated orphaned organisations while the fixture looked correct.
await db.delete(organization);
await db.delete(user);

const auth = createAuth(connection, {
  // A seed performs no redirects, so it has no host to name. Stated rather than
  // taken from whatever environment this happens to run in.
  baseURL: 'http://seed.invalid',
});
// Two identities, in two organisations. The second exists so that isolation is
// a tested property: with one organisation, a query that ignores the scope
// entirely returns the right answer and the test passes for the wrong reason.
for (const [email, password, name] of [
  [SEEDED_EMAIL, SEEDED_PASSWORD, 'Seeded'],
  [SEEDED_OTHER_EMAIL, SEEDED_OTHER_PASSWORD, 'Other'],
] as const) {
  const created = await auth.api.signUpEmail({ body: { email, password, name } });
  if (created.user === undefined) {
    throw new Error(`the seed could not create ${email}`);
  }
}

await sql.end();
console.log('seeded');
