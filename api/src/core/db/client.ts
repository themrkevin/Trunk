import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export type Database = ReturnType<typeof createDatabase>;

export const createDatabase = (databaseUrl: string) => {
  const client = postgres(databaseUrl);
  return drizzle(client);
};

export const runMigrations = async (databaseUrl: string, migrationsFolder: string): Promise<void> => {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);
  const { migrate } = await import('drizzle-orm/postgres-js/migrator');
  await migrate(db, { migrationsFolder });
  await client.end();
};

export const checkDatabaseConnection = async (databaseUrl: string): Promise<boolean> => {
  const client = postgres(databaseUrl, { max: 1, connect_timeout: 5 });
  try {
    await client`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await client.end();
  }
};
