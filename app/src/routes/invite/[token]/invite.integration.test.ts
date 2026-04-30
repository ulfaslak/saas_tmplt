/**
 * Integration tests for the /invite/[token] accept flow.
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
import { invites, memberships } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { truncateAll, createTestOrg, createTestUser } from '$lib/server/test-utils';
import { load as _load, actions as _actions } from './+page.server';

// SvelteKit's load/action types include `void` (because `redirect()` is typed
// as void-returning even though it always throws). The integration tests work
// around this with `.catch(...)` to capture redirects, so cast through `any`.
const load = _load as (event: any) => Promise<any>;
const actions = _actions as Record<string, (event: any) => any>;

function mockEvent(opts: { userId?: string; token: string; formData?: Record<string, string> }) {
	const fd = new FormData();
	for (const [key, value] of Object.entries(opts.formData ?? {})) {
		fd.set(key, value);
	}
	return {
		locals: {
			auth: async () =>
				opts.userId ? { user: { id: opts.userId, email: 'user@example.com' } } : null
		},
		params: { token: opts.token },
		request: { formData: async () => fd },
		url: new URL(`http://localhost:5173/invite/${opts.token}`)
	} as any;
}

async function createInviteRow(opts: {
	orgId: string;
	email?: string;
	role?: string;
	token?: string;
	usedBy?: string | null;
	revokedAt?: Date | null;
	expiresAt?: Date;
	createdBy?: string | null;
}) {
	const [row] = await db
		.insert(invites)
		.values({
			orgId: opts.orgId,
			email: opts.email ?? 'invited@example.com',
			role: opts.role ?? 'member',
			token: opts.token ?? 'a'.repeat(64),
			expiresAt: opts.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
			usedBy: opts.usedBy ?? null,
			revokedAt: opts.revokedAt ?? null,
			createdBy: opts.createdBy ?? null
		})
		.returning();
	return row;
}

describe('invite load — state machine', () => {
	beforeEach(async () => {
		await truncateAll(db);
	});

	it('redirects unauthenticated users to /login with returnTo', async () => {
		const err = await load(mockEvent({ token: 'missing' })).catch((e) => e);
		expect(err.status).toBe(303);
		expect(err.location).toBe('/login?redirectTo=%2Finvite%2Fmissing');
	});

	it('returns notFound when the token does not match any invite', async () => {
		const user = await createTestUser(db);
		const { state } = await load(mockEvent({ userId: user.id, token: 'missing' }));
		expect(state.kind).toBe('notFound');
	});

	it('returns revoked when the invite was revoked', async () => {
		const user = await createTestUser(db);
		const org = await createTestOrg(db);
		const invite = await createInviteRow({ orgId: org.id, revokedAt: new Date() });
		const { state } = await load(mockEvent({ userId: user.id, token: invite.token }));
		expect(state.kind).toBe('revoked');
	});

	it('returns expired when the invite is past its expiry', async () => {
		const user = await createTestUser(db);
		const org = await createTestOrg(db);
		const invite = await createInviteRow({
			orgId: org.id,
			expiresAt: new Date(Date.now() - 1000)
		});
		const { state } = await load(mockEvent({ userId: user.id, token: invite.token }));
		expect(state.kind).toBe('expired');
	});

	it('returns alreadyMemberHere when user consumed this invite previously', async () => {
		const user = await createTestUser(db);
		const org = await createTestOrg(db);
		await db.insert(memberships).values({ userId: user.id, orgId: org.id, role: 'member' });
		const invite = await createInviteRow({ orgId: org.id, usedBy: user.id });
		const { state } = await load(mockEvent({ userId: user.id, token: invite.token }));
		expect(state.kind).toBe('alreadyMemberHere');
	});

	it('returns usedByOther when someone else accepted the invite', async () => {
		const user = await createTestUser(db);
		const other = await createTestUser(db);
		const org = await createTestOrg(db);
		const invite = await createInviteRow({ orgId: org.id, usedBy: other.id });
		const { state } = await load(mockEvent({ userId: user.id, token: invite.token }));
		expect(state.kind).toBe('usedByOther');
	});

	it('returns alreadyInOtherOrg when user already belongs to a different org', async () => {
		const user = await createTestUser(db);
		const otherOrg = await createTestOrg(db, { name: 'Other Org' });
		await db.insert(memberships).values({ userId: user.id, orgId: otherOrg.id, role: 'admin' });
		const inviteOrg = await createTestOrg(db, { name: 'Invite Org' });
		const invite = await createInviteRow({ orgId: inviteOrg.id });
		const { state } = await load(mockEvent({ userId: user.id, token: invite.token }));
		expect(state.kind).toBe('alreadyInOtherOrg');
		if (state.kind === 'alreadyInOtherOrg') {
			expect(state.otherOrgName).toBe('Other Org');
			expect(state.inviteOrgName).toBe('Invite Org');
		}
	});

	it('returns acceptable when the invite is valid and the user has no org', async () => {
		const user = await createTestUser(db);
		const org = await createTestOrg(db, { name: 'Acme' });
		const invite = await createInviteRow({
			orgId: org.id,
			email: 'invited@example.com',
			role: 'admin'
		});
		const { state } = await load(mockEvent({ userId: user.id, token: invite.token }));
		expect(state.kind).toBe('acceptable');
		if (state.kind === 'acceptable') {
			expect(state.orgName).toBe('Acme');
			expect(state.role).toBe('admin');
			expect(state.email).toBe('invited@example.com');
		}
	});
});

describe('invite accept — action', () => {
	beforeEach(async () => {
		await truncateAll(db);
	});

	it('creates the membership, marks invite used, and redirects', async () => {
		const user = await createTestUser(db);
		const org = await createTestOrg(db);
		const invite = await createInviteRow({ orgId: org.id, role: 'admin' });

		const err = await Promise.resolve(
			actions.accept(mockEvent({ userId: user.id, token: invite.token }))
		).catch((e: unknown) => e);

		expect((err as any).status).toBe(303);
		expect((err as any).location).toBe('/');

		const [membership] = await db
			.select()
			.from(memberships)
			.where(eq(memberships.userId, user.id));
		expect(membership).toBeDefined();
		expect(membership.orgId).toBe(org.id);
		expect(membership.role).toBe('admin');

		const [updated] = await db.select().from(invites).where(eq(invites.id, invite.id));
		expect(updated.usedBy).toBe(user.id);
	});

	it('rejects a revoked invite (atomic claim)', async () => {
		const user = await createTestUser(db);
		const org = await createTestOrg(db);
		const invite = await createInviteRow({ orgId: org.id, revokedAt: new Date() });

		const result = await actions.accept(
			mockEvent({ userId: user.id, token: invite.token })
		);
		expect((result as any).status).toBe(400);
		const rows = await db.select().from(memberships).where(eq(memberships.userId, user.id));
		expect(rows).toHaveLength(0);
	});

	it('rejects when user already belongs to another org (single-org constraint)', async () => {
		const user = await createTestUser(db);
		const otherOrg = await createTestOrg(db);
		await db.insert(memberships).values({ userId: user.id, orgId: otherOrg.id, role: 'member' });
		const inviteOrg = await createTestOrg(db);
		const invite = await createInviteRow({ orgId: inviteOrg.id });

		const result = await actions.accept(
			mockEvent({ userId: user.id, token: invite.token })
		);
		expect((result as any).status).toBe(400);
		expect((result as any).data.error).toMatch(/another organization/i);

		// The claim must have rolled back — invite stays pending.
		const [unchanged] = await db.select().from(invites).where(eq(invites.id, invite.id));
		expect(unchanged.usedBy).toBeNull();
	});
});
