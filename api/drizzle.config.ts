import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/core/db/schema.ts',
  out: '../db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://trunk:trunk-dev-password@localhost:5432/trunk',
  },
});
