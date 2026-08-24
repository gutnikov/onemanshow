import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { required } from '@shared/env';

export function connect(max = 5) {
  const sql = postgres(required('DATABASE_URL'), { max });
  return { sql, db: drizzle(sql) };
}
