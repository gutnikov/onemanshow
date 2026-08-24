import { greeting, SEEDED_MESSAGE } from '@shared/schema';
import { connect } from './client';

/**
 * Idempotent by construction: the table is emptied first, so seeding twice
 * from any starting point yields identical state.
 */
const { sql, db } = connect(1);
await db.delete(greeting);
await db.insert(greeting).values({ message: SEEDED_MESSAGE });
await sql.end();
console.log('seeded');
