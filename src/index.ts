import { buildApp } from '#app';
import { loadConfig } from '#core/config';

const start = async (): Promise<void> => {
	const config = loadConfig();
	const app = buildApp(config);

	try {
		await app.listen({ host: config.host, port: config.port });
	} catch (error: unknown) {
		app.log.error(error);
		process.exitCode = 1;
	}
};

void start();
