/**
 * Vitest globalSetup for integration tests.
 *
 * Creates the `app_test` database (if missing) and pushes the current Drizzle
 * schema. Tests can then run against a real Postgres without needing a
 * separate migration step. The dev `app` database is left untouched.
 *
 * Wired in via `vitest.integration.config.ts → globalSetup`.
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ADMIN_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
const TEST_DB = 'app_test';
const TEST_URL = `postgresql://postgres:postgres@localhost:5432/${TEST_DB}`;

export async function setup() {
	const admin = postgres(ADMIN_URL, { onnotice: () => {} });
	try {
		const [{ exists }] = await admin<{ exists: boolean }[]>`
			SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${TEST_DB}) AS exists
		`;
		if (!exists) {
			await admin.unsafe(`CREATE DATABASE "${TEST_DB}"`);
		}
	} finally {
		await admin.end();
	}

	const here = dirname(fileURLToPath(import.meta.url));
	const migrationsFolder = resolve(here, '../../../drizzle');
	const client = postgres(TEST_URL, { max: 1 });
	try {
		const db = drizzle(client);
		await migrate(db, { migrationsFolder });
	} finally {
		await client.end();
	}
}

export async function teardown() {
	// No-op. The test DB persists between runs so factories are fast; the
	// tests truncate tables themselves between cases via `truncateAll`.
}
