import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./shared/schema.ts', './shared/auth-schema.ts'],
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env['DATABASE_URL'] ?? '' },
});
