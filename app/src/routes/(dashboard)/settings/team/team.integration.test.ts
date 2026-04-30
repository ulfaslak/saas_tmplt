/**
 * Integration tests for the team settings invite flow.
 * Uses the real DB but mocks the email service (Resend).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: {
		DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/app_test',
		AUTH_RESEND_KEY: 'test-resend-key',
		APP_URL: 'http://localhost:5173'
	}
}));
vi.mock('$lib/server/logger', () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

type SendInviteEmailParams = {
	to: string;
	inviterName: string;
	orgName: string;
	roleLabel: string;
	inviteUrl: string;
	expiresInDays: number;
};

const { sendInviteEmailMock } = vi.hoisted(() => ({
	sendInviteEmailMock: vi.fn(async (_p: SendInviteEmailParams): Promise<void> => {})
}));
vi.mock('$lib/server/services/email', () => ({
	sendInviteEmail: sendInviteEmailMock
}));

import { db } from '$lib/server/db';
import { invites, memberships } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { truncateAll, createTestOrg, createTestUser } from '$lib/server/test-utils';
import { actions as _actions } from './+page.server';

// Cast through any: SvelteKit's action types include `void` (because
// `redirect()` is typed as void-returning even though it always throws).
const actions = _actions as Record<string, (event: any) => any>;

function mockEvent(opts: {
	userId: string;
	orgId: string;
	role?: string;
	formData?: Record<string, string>;
	origin?: string;
}) {
	const fd = new FormData();
	for (const [key, value] of Object.entries(opts.formData ?? {})) {
		fd.set(key, value);
	}
	// resolveOrgWithRole and resolveSessionUser both call locals.auth() + DB —
	// we populate the DB in each test, so we only stub locals.auth here.
	return {
		locals: {
			auth: async () => ({ user: { id: opts.userId } })
		},
		request: { formData: async () => fd },
		url: new URL(`${opts.origin ?? 'http://localhost:5173'}/settings/team`)
	} as any;
}

async function seed(opts: { role?: string } = {}) {
	const org = await createTestOrg(db);
	const admin = await createTestUser(db, { email: 'admin@example.com', name: 'Admin User' });
	await db.insert(memberships).values({
		userId: admin.id,
		orgId: org.id,
		role: opts.role ?? 'admin'
	});
	return { org, admin };
}

describe('team settings — createInvite', () => {
	beforeEach(async () => {
		await truncateAll(db);
		sendInviteEmailMock.mockClear();
	});

	it('creates an invite, stores email + token, and sends an email', async () => {
		const { org, admin } = await seed();

		const result = await actions.createInvite(
			mockEvent({
				userId: admin.id,
				orgId: org.id,
				formData: { email: 'New@Example.COM', role: 'member' }
			})
		);

		expect((result as any).sent).toBe(true);
		expect((result as any).email).toBe('new@example.com');

		const rows = await db.select().from(invites).where(eq(invites.orgId, org.id));
		expect(rows).toHaveLength(1);
		expect(rows[0].email).toBe('new@example.com');
		expect(rows[0].role).toBe('member');
		expect(rows[0].token).toMatch(/^[0-9a-f]{64}$/);
		expect(rows[0].revokedAt).toBeNull();
		expect(rows[0].usedBy).toBeNull();

		expect(sendInviteEmailMock).toHaveBeenCalledTimes(1);
		const sent = sendInviteEmailMock.mock.calls[0][0];
		expect(sent.to).toBe('new@example.com');
		expect(sent.roleLabel).toBe('Member');
		expect(sent.inviteUrl).toBe(`http://localhost:5173/invite/${rows[0].token}`);
		expect(sent.expiresInDays).toBe(7);
	});

	it('rejects malformed email', async () => {
		const { org, admin } = await seed();
		const result = await actions.createInvite(
			mockEvent({
				userId: admin.id,
				orgId: org.id,
				formData: { email: 'not-an-email', role: 'member' }
			})
		);
		expect((result as any).status).toBe(400);
		expect((result as any).data.error).toMatch(/valid email/i);
		expect(sendInviteEmailMock).not.toHaveBeenCalled();
	});

	it('rejects super_admin as invite role', async () => {
		const { org, admin } = await seed();
		const result = await actions.createInvite(
			mockEvent({
				userId: admin.id,
				orgId: org.id,
				formData: { email: 'x@example.com', role: 'super_admin' }
			})
		);
		expect((result as any).status).toBe(400);
		expect(sendInviteEmailMock).not.toHaveBeenCalled();
	});

	it('rejects inviting an existing member (case-insensitive)', async () => {
		const { org, admin } = await seed();
		const teammate = await createTestUser(db, { email: 'Teammate@Example.com' });
		await db.insert(memberships).values({ userId: teammate.id, orgId: org.id, role: 'member' });

		const result = await actions.createInvite(
			mockEvent({
				userId: admin.id,
				orgId: org.id,
				formData: { email: 'teammate@example.com', role: 'admin' }
			})
		);
		expect((result as any).status).toBe(400);
		expect((result as any).data.error).toMatch(/already a member/i);
	});

	it('rejects duplicate pending invite for the same email', async () => {
		const { org, admin } = await seed();

		await actions.createInvite(
			mockEvent({
				userId: admin.id,
				orgId: org.id,
				formData: { email: 'dup@example.com', role: 'member' }
			})
		);
		sendInviteEmailMock.mockClear();

		const result = await actions.createInvite(
			mockEvent({
				userId: admin.id,
				orgId: org.id,
				formData: { email: 'dup@example.com', role: 'admin' }
			})
		);
		expect((result as any).status).toBe(400);
		expect((result as any).data.error).toMatch(/active invite/i);
		expect(sendInviteEmailMock).not.toHaveBeenCalled();
	});

	it('allows re-invite after the previous invite was revoked', async () => {
		const { org, admin } = await seed();

		await actions.createInvite(
			mockEvent({
				userId: admin.id,
				orgId: org.id,
				formData: { email: 'x@example.com', role: 'member' }
			})
		);
		const [first] = await db.select().from(invites).where(eq(invites.orgId, org.id));
		await db.update(invites).set({ revokedAt: new Date() }).where(eq(invites.id, first.id));

		const result = await actions.createInvite(
			mockEvent({
				userId: admin.id,
				orgId: org.id,
				formData: { email: 'x@example.com', role: 'admin' }
			})
		);
		expect((result as any).sent).toBe(true);

		const rows = await db.select().from(invites).where(eq(invites.orgId, org.id));
		expect(rows).toHaveLength(2);
	});

	it('rejects when the actor is not an admin', async () => {
		const { org, admin } = await seed({ role: 'member' });
		const result = await actions.createInvite(
			mockEvent({
				userId: admin.id,
				orgId: org.id,
				formData: { email: 'x@example.com', role: 'member' }
			})
		);
		expect((result as any).status).toBe(403);
	});
});

describe('team settings — resendInvite', () => {
	beforeEach(async () => {
		await truncateAll(db);
		sendInviteEmailMock.mockClear();
	});

	it('generates a new token, extends expiry, clears revoked_at, and re-sends email', async () => {
		const { org, admin } = await seed();
		const oldExpiry = new Date(Date.now() - 1000); // already expired
		const [invite] = await db
			.insert(invites)
			.values({
				orgId: org.id,
				email: 'x@example.com',
				token: 'a'.repeat(64),
				role: 'member',
				createdBy: admin.id,
				expiresAt: oldExpiry,
				revokedAt: new Date()
			})
			.returning();

		const result = await actions.resendInvite(
			mockEvent({
				userId: admin.id,
				orgId: org.id,
				formData: { inviteId: invite.id }
			})
		);

		expect((result as any).resent).toBe(true);

		const [updated] = await db.select().from(invites).where(eq(invites.id, invite.id));
		expect(updated.token).not.toBe(invite.token);
		expect(updated.expiresAt.getTime()).toBeGreaterThan(Date.now());
		expect(updated.revokedAt).toBeNull();
		expect(sendInviteEmailMock).toHaveBeenCalledTimes(1);
	});

	it('refuses to resend an already-accepted invite', async () => {
		const { org, admin } = await seed();
		const accepted = await createTestUser(db, { email: 'accepted@example.com' });
		const [invite] = await db
			.insert(invites)
			.values({
				orgId: org.id,
				email: 'accepted@example.com',
				token: 'b'.repeat(64),
				role: 'member',
				createdBy: admin.id,
				expiresAt: new Date(Date.now() + 60_000),
				usedBy: accepted.id
			})
			.returning();

		const result = await actions.resendInvite(
			mockEvent({
				userId: admin.id,
				orgId: org.id,
				formData: { inviteId: invite.id }
			})
		);
		expect((result as any).status).toBe(400);
		expect(sendInviteEmailMock).not.toHaveBeenCalled();
	});
});

describe('team settings — revoke/remove', () => {
	beforeEach(async () => {
		await truncateAll(db);
		sendInviteEmailMock.mockClear();
	});

	it('revokeInvite sets revoked_at (does not hard delete)', async () => {
		const { org, admin } = await seed();
		const [invite] = await db
			.insert(invites)
			.values({
				orgId: org.id,
				email: 'x@example.com',
				token: 'c'.repeat(64),
				role: 'member',
				createdBy: admin.id,
				expiresAt: new Date(Date.now() + 60_000)
			})
			.returning();

		await actions.revokeInvite(
			mockEvent({
				userId: admin.id,
				orgId: org.id,
				formData: { inviteId: invite.id }
			})
		);

		const [updated] = await db.select().from(invites).where(eq(invites.id, invite.id));
		expect(updated).toBeDefined();
		expect(updated.revokedAt).not.toBeNull();
	});

	it('removeInvite hard-deletes a revoked invite', async () => {
		const { org, admin } = await seed();
		const [invite] = await db
			.insert(invites)
			.values({
				orgId: org.id,
				email: 'x@example.com',
				token: 'd'.repeat(64),
				role: 'member',
				createdBy: admin.id,
				expiresAt: new Date(Date.now() + 60_000),
				revokedAt: new Date()
			})
			.returning();

		await actions.removeInvite(
			mockEvent({
				userId: admin.id,
				orgId: org.id,
				formData: { inviteId: invite.id }
			})
		);

		const rows = await db.select().from(invites).where(eq(invites.id, invite.id));
		expect(rows).toHaveLength(0);
	});

	it('removeInvite refuses to delete a still-pending invite', async () => {
		const { org, admin } = await seed();
		const [invite] = await db
			.insert(invites)
			.values({
				orgId: org.id,
				email: 'x@example.com',
				token: 'e'.repeat(64),
				role: 'member',
				createdBy: admin.id,
				expiresAt: new Date(Date.now() + 60_000)
			})
			.returning();

		await actions.removeInvite(
			mockEvent({
				userId: admin.id,
				orgId: org.id,
				formData: { inviteId: invite.id }
			})
		);

		const rows = await db.select().from(invites).where(eq(invites.id, invite.id));
		expect(rows).toHaveLength(1);
	});

	it('removeInvite hard-deletes an expired invite', async () => {
		const { org, admin } = await seed();
		const [invite] = await db
			.insert(invites)
			.values({
				orgId: org.id,
				email: 'x@example.com',
				token: 'f'.repeat(64),
				role: 'member',
				createdBy: admin.id,
				expiresAt: new Date(Date.now() - 60_000)
			})
			.returning();

		await actions.removeInvite(
			mockEvent({
				userId: admin.id,
				orgId: org.id,
				formData: { inviteId: invite.id }
			})
		);

		const rows = await db.select().from(invites).where(eq(invites.id, invite.id));
		expect(rows).toHaveLength(0);
	});
});
