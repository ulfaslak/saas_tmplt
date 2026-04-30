import { PgBoss } from 'pg-boss';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/server/logger';

let boss: PgBoss | null = null;

export function getBoss(): PgBoss {
	if (!boss) {
		// pg-boss extends pg.PoolConfig (which carries `connectionString`),
		// but `@types/pg` is not a transitive dep here, so the field falls
		// through to `any`. The cast pins the shape we use in this codebase.
		boss = new PgBoss({
			connectionString: env.DATABASE_URL!,
			schema: 'pgboss'
		} as ConstructorParameters<typeof PgBoss>[0]);
	}
	return boss;
}

export async function startQueue(): Promise<PgBoss> {
	const b = getBoss();
	b.on('error', (err: Error) => logger.error({ err }, 'pg-boss error'));
	await b.start();
	logger.info('pg-boss queue started');
	return b;
}

export async function stopQueue(): Promise<void> {
	if (boss) {
		await boss.stop({ graceful: true, timeout: 10000 });
		boss = null;
		logger.info('pg-boss queue stopped');
	}
}
