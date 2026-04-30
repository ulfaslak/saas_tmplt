/**
 * Application-wide pino logger instance.
 * Pretty-prints in development; outputs structured JSON in production.
 *
 * In production, logs are written to both stdout (for `docker compose logs`)
 * and a persistent file at /app/logs/app.log (survives container recreation
 * via the `./logs:/app/logs` volume mount in `docker-compose.prod.yml`).
 *
 * Use `logger` for process-level logs (startup, shutdown, cron).
 * For request-scoped logs, use `event.locals.logger` (a child logger
 * with requestId, userId, and orgId already bound).
 */
import pino from 'pino';
import { mkdirSync, existsSync } from 'node:fs';

const isDev = process.env.NODE_ENV !== 'production';

function createLogger(): pino.Logger {
	if (isDev) {
		return pino({
			level: 'debug',
			transport: {
				target: 'pino-pretty',
				options: { colorize: true }
			}
		});
	}

	// In production, write to both stdout and a persistent log file when
	// the host has provisioned `/app/logs` (the Docker volume mount). Fall
	// back to stdout-only when the directory is unavailable — e.g. during
	// `vite build` on a developer machine where `process.env.NODE_ENV` is
	// 'production' but `/app/logs` does not exist.
	const LOG_DIR = '/app/logs';
	let canWriteFile = false;
	try {
		mkdirSync(LOG_DIR, { recursive: true });
		canWriteFile = existsSync(LOG_DIR);
	} catch {
		canWriteFile = false;
	}

	if (!canWriteFile) {
		return pino({ level: 'info' });
	}

	const streams: pino.StreamEntry[] = [
		{ stream: process.stdout },
		{ stream: pino.destination({ dest: `${LOG_DIR}/app.log`, sync: false }) }
	];

	return pino({ level: 'info' }, pino.multistream(streams));
}

export const logger = createLogger();

export type Logger = pino.Logger;
