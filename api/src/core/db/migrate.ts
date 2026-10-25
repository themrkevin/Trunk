import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '#core/config';
import developmentConfig from '../../../config/development.js';
import { runMigrations } from './client.js';

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../db/migrations',
);

const config = loadConfig(process.env, developmentConfig);

if (config.databaseUrl === undefined) {
  console.error('DATABASE_URL is not set — nothing to migrate.');
  process.exitCode = 1;
} else {
  await runMigrations(config.databaseUrl, migrationsFolder);
  console.log('Migrations applied.');
}
