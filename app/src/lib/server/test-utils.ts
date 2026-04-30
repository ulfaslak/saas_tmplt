/**
 * Shared utilities for integration tests.
 * Factory functions, table truncation, and constants.
 */
import { sql } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import { hashKey } from '$lib/server/api-auth';
import type { db } from '$lib/server/db';

export const TEST_DB_URL = 'postgresql://postgres:postgres@localhost:5432/app_test';

type TestDb = typeof db;

/** Delete all rows from all tables using TRUNCATE CASCADE. */
export async function truncateAll(db: TestDb) {
	await db.execute(sql`TRUNCATE TABLE
		api_keys, invites, impersonation_sessions,
		memberships, session, account, "user",
		organizations, "verificationToken"
		CASCADE`);
}

export async function createTestOrg(db: TestDb, overrides?: Partial<typeof schema.organizations.$inferInsert>) {
	const [row] = await db.insert(schema.organizations).values({
		name: 'Test Org',
		...overrides
	}).returning();
	return row;
}

export async function createTestUser(db: TestDb, overrides?: Partial<typeof schema.users.$inferInsert>) {
	const [row] = await db.insert(schema.users).values({
		name: 'Test User',
		email: `test-${crypto.randomUUID().slice(0, 8)}@example.com`,
		...overrides
	}).returning();
	return row;
}

export async function createTestApiKey(db: TestDb, orgId: string, userId: string) {
	const rawKey = `key_test_${crypto.randomUUID().replace(/-/g, '')}`;
	const keyHash = await hashKey(rawKey);
	const [row] = await db.insert(schema.apiKeys).values({
		orgId,
		name: 'Test Key',
		keyHash,
		keyPrefix: rawKey.slice(0, 8),
		createdBy: userId
	}).returning();
	return { ...row, rawKey };
}
