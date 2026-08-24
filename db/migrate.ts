import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { connect } from './client';

const { sql, db } = connect(1);
await migrate(db, { migrationsFolder: './db/migrations' });
await sql.end();
console.log('migrations applied');
