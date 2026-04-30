/**
 * Integration tests for profile settings: user field edits.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: {
		DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/app_test'
	}
}));
vi.mock('$lib/server/logger', () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { truncateAll, createTestUser } from '$lib/server/test-utils';

describe('profile integration', () => {
	beforeEach(async () => {
		await truncateAll(db);
	});

	it('users.job_title is nullable and persists when set', async () => {
		const u = await createTestUser(db, { name: 'Ulf', jobTitle: null });
		expect(u.jobTitle).toBeNull();

		await db.update(users).set({ jobTitle: 'CTO' }).where(eq(users.id, u.id));
		const [updated] = await db.select().from(users).where(eq(users.id, u.id));
		expect(updated.jobTitle).toBe('CTO');
	});
});
