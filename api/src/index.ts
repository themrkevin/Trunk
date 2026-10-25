import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from '#app';
import { loadConfig } from '#core/config';
import { runMigrations } from '#core/db/client';
import developmentConfig from '../config/development.js';

const migrationsFolder = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../db/migrations',
);

const start = async (): Promise<void> => {
	const config = loadConfig(process.env, developmentConfig);

	if (config.databaseUrl !== undefined) {
		try {
			await runMigrations(config.databaseUrl, migrationsFolder);
			console.log('Database migrations applied.');
		} catch (error: unknown) {
			console.warn(
				'Database unreachable — continuing without persistence (in-memory stores).',
				'Start the compose stack (docker compose up -d) to enable Postgres.',
				error instanceof Error ? error.message : error,
			);
		}
	}

	const app = buildApp(config);

	try {
		await app.listen({ host: config.host, port: config.port });
	} catch (error: unknown) {
		app.log.error(error);
		process.exitCode = 1;
	}
};

void start();
