/**
 * Team settings page — lists org members and email-based invites.
 *
 * Invite lifecycle: pending → accepted | expired | revoked. Admins can send
 * invites, resend (expired/revoked), revoke (pending), or remove (non-pending).
 * Accepted invites move to the Members list automatically.
 */
import { fail } from '@sveltejs/kit';
import { eq, and, isNull, gt, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { memberships, users, invites } from '$lib/server/db/schema';
import { resolveOrgWithRole, resolveSessionUser } from '$lib/server/resolve-org';
import { canManageTeam, canRemoveMember, type Role, INVITABLE_ROLES, ROLE_LABELS } from '$lib/permissions';
import { sendInviteEmail } from '$lib/server/services/email';
import { logger } from '$lib/server/logger';
import type { PageServerLoad, Actions } from './$types';

const INVITE_EXPIRY_DAYS = 7;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Loads org members and invites with derived status + action flags. */
export const load: PageServerLoad = async ({ parent }) => {
	const { org, session, role } = await parent();

	const memberRows = await db
		.select({
			id: memberships.id,
			userId: memberships.userId,
			name: users.name,
			email: users.email,
			image: users.image,
			role: memberships.role,
			createdAt: memberships.createdAt
		})
		.from(memberships)
		.innerJoin(users, eq(memberships.userId, users.id))
		.where(eq(memberships.orgId, org.id));

	const createdByUser = db
		.select({ id: users.id, name: users.name })
		.from(users)
		.as('createdByUser');

	const inviteRows = await db
		.select({
			id: invites.id,
			email: invites.email,
			role: invites.role,
			createdByName: createdByUser.name,
			usedBy: invites.usedBy,
			expiresAt: invites.expiresAt,
			revokedAt: invites.revokedAt,
			createdAt: invites.createdAt
		})
		.from(invites)
		.leftJoin(createdByUser, eq(invites.createdBy, createdByUser.id))
		.where(eq(invites.orgId, org.id))
		.orderBy(sql`${invites.createdAt} desc`);

	const now = new Date();
	const inviteList = inviteRows.map((row) => {
		const isUsed = row.usedBy !== null;
		const isRevoked = row.revokedAt !== null;
		const isExpired = !isUsed && !isRevoked && row.expiresAt < now;
		const isPending = !isUsed && !isRevoked && !isExpired;
		const status: 'pending' | 'accepted' | 'expired' | 'revoked' = isUsed
			? 'accepted'
			: isRevoked
				? 'revoked'
				: isExpired
					? 'expired'
					: 'pending';
		return { ...row, status, isPending };
	});

	return {
		members: memberRows,
		invites: inviteList,
		currentUserId: session.user!.id,
		currentRole: role,
		canManage: canManageTeam(role),
		invitableRoles: INVITABLE_ROLES
	};
};

function buildInviteUrl(origin: string, token: string): string {
	const base = env.APP_URL?.trim() || origin;
	return `${base.replace(/\/$/, '')}/invite/${token}`;
}

function generateToken(): string {
	return randomBytes(32).toString('hex');
}

function newExpiry(): Date {
	return new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

export const actions: Actions = {
	createInvite: async (event) => {
		const { org, role } = await resolveOrgWithRole(event);
		if (!canManageTeam(role)) return fail(403, { error: 'Permission denied' });
		const inviter = await resolveSessionUser(event);

		const data = await event.request.formData();
		const rawEmail = (data.get('email') as string | null)?.trim().toLowerCase() ?? '';
		const inviteRole = data.get('role') as string;

		if (!rawEmail) return fail(400, { error: 'Email is required', email: rawEmail });
		if (!EMAIL_REGEX.test(rawEmail)) {
			return fail(400, { error: 'Enter a valid email address.', email: rawEmail });
		}
		if (!inviteRole || !INVITABLE_ROLES.includes(inviteRole as Role)) {
			return fail(400, { error: 'A valid role must be selected.', email: rawEmail });
		}

		// Already a member of this org?
		const existingMember = await db
			.select({ id: memberships.id })
			.from(memberships)
			.innerJoin(users, eq(memberships.userId, users.id))
			.where(and(eq(memberships.orgId, org.id), eq(sql`lower(${users.email})`, rawEmail)))
			.limit(1);
		if (existingMember.length > 0) {
			return fail(400, {
				error: 'This person is already a member of your organization.',
				email: rawEmail
			});
		}

		// Active/pending invite for this email in this org?
		const activeInvite = await db
			.select({ id: invites.id })
			.from(invites)
			.where(
				and(
					eq(invites.orgId, org.id),
					eq(sql`lower(${invites.email})`, rawEmail),
					isNull(invites.usedBy),
					isNull(invites.revokedAt),
					gt(invites.expiresAt, new Date())
				)
			)
			.limit(1);
		if (activeInvite.length > 0) {
			return fail(400, {
				error: 'An active invite already exists for this email. Revoke it first to send a new one.',
				email: rawEmail
			});
		}

		const token = generateToken();
		const expiresAt = newExpiry();

		await db.insert(invites).values({
			orgId: org.id,
			email: rawEmail,
			token,
			role: inviteRole,
			createdBy: inviter.id,
			expiresAt
		});

		try {
			await sendInviteEmail({
				to: rawEmail,
				inviterName: inviter.name ?? inviter.email ?? 'A teammate',
				orgName: org.name,
				roleLabel: ROLE_LABELS[inviteRole as Role],
				inviteUrl: buildInviteUrl(event.url.origin, token),
				expiresInDays: INVITE_EXPIRY_DAYS
			});
		} catch (err) {
			logger.error({ err, orgId: org.id, email: rawEmail }, 'createInvite: email send failed');
			return fail(500, {
				error: 'Invite created but the email failed to send. Try Resend.',
				email: rawEmail
			});
		}

		return { sent: true, email: rawEmail };
	},

	resendInvite: async (event) => {
		const { org, role } = await resolveOrgWithRole(event);
		if (!canManageTeam(role)) return fail(403, { error: 'Permission denied' });
		const inviter = await resolveSessionUser(event);

		const data = await event.request.formData();
		const inviteId = data.get('inviteId') as string;
		if (!inviteId) return fail(400, { error: 'Invite ID is required' });

		const invite = await db.query.invites.findFirst({
			where: and(eq(invites.id, inviteId), eq(invites.orgId, org.id))
		});
		if (!invite) return fail(404, { error: 'Invite not found' });
		if (invite.usedBy) {
			return fail(400, { error: 'This invite has already been accepted.' });
		}

		const token = generateToken();
		const expiresAt = newExpiry();

		await db
			.update(invites)
			.set({ token, expiresAt, revokedAt: null })
			.where(eq(invites.id, inviteId));

		try {
			await sendInviteEmail({
				to: invite.email,
				inviterName: inviter.name ?? inviter.email ?? 'A teammate',
				orgName: org.name,
				roleLabel: ROLE_LABELS[invite.role as Role],
				inviteUrl: buildInviteUrl(event.url.origin, token),
				expiresInDays: INVITE_EXPIRY_DAYS
			});
		} catch (err) {
			logger.error({ err, orgId: org.id, inviteId }, 'resendInvite: email send failed');
			return fail(500, { error: 'Invite refreshed but the email failed to send. Try again.' });
		}

		return { resent: true };
	},

	revokeInvite: async (event) => {
		const { org, role } = await resolveOrgWithRole(event);
		if (!canManageTeam(role)) return fail(403, { error: 'Permission denied' });

		const data = await event.request.formData();
		const inviteId = data.get('inviteId') as string;
		if (!inviteId) return fail(400, { error: 'Invite ID is required' });

		await db
			.update(invites)
			.set({ revokedAt: new Date() })
			.where(
				and(
					eq(invites.id, inviteId),
					eq(invites.orgId, org.id),
					isNull(invites.usedBy),
					isNull(invites.revokedAt)
				)
			);

		return { revoked: true };
	},

	removeInvite: async (event) => {
		const { org, role } = await resolveOrgWithRole(event);
		if (!canManageTeam(role)) return fail(403, { error: 'Permission denied' });

		const data = await event.request.formData();
		const inviteId = data.get('inviteId') as string;
		if (!inviteId) return fail(400, { error: 'Invite ID is required' });

		// Only allow removing non-pending invites (accepted/expired/revoked).
		// Pending invites should be revoked first so the audit trail stays clear.
		await db
			.delete(invites)
			.where(
				and(
					eq(invites.id, inviteId),
					eq(invites.orgId, org.id),
					sql`(${invites.usedBy} is not null or ${invites.revokedAt} is not null or ${invites.expiresAt} < now())`
				)
			);

		return { removed: true };
	},

	removeMember: async (event) => {
		const { org, role, userId } = await resolveOrgWithRole(event);
		if (!canManageTeam(role)) return fail(403, { error: 'Permission denied' });

		const data = await event.request.formData();
		const membershipId = data.get('membershipId');

		if (!membershipId || typeof membershipId !== 'string') {
			return fail(400, { error: 'Membership ID is required' });
		}

		const membership = await db.query.memberships.findFirst({
			where: and(eq(memberships.id, membershipId), eq(memberships.orgId, org.id))
		});

		if (!membership) return fail(404, { error: 'Member not found' });
		if (membership.userId === userId) {
			return fail(400, { error: 'You cannot remove yourself' });
		}
		if (!canRemoveMember(role, membership.role as Role)) {
			return fail(403, { error: 'Cannot remove this member' });
		}

		await db.delete(memberships).where(eq(memberships.id, membershipId));
		return { removed: true };
	},

	changeRole: async (event) => {
		const { org, role, userId } = await resolveOrgWithRole(event);
		if (!canManageTeam(role)) return fail(403, { error: 'Permission denied' });

		const data = await event.request.formData();
		const membershipId = data.get('membershipId') as string;
		const newRole = data.get('role') as string;

		if (!membershipId || !newRole) {
			return fail(400, { error: 'Membership ID and role are required' });
		}
		if (!INVITABLE_ROLES.includes(newRole as Role)) {
			return fail(400, { error: 'Invalid role' });
		}

		const membership = await db.query.memberships.findFirst({
			where: and(eq(memberships.id, membershipId), eq(memberships.orgId, org.id))
		});

		if (!membership) return fail(404, { error: 'Member not found' });
		if (membership.userId === userId) {
			return fail(400, { error: 'You cannot change your own role' });
		}
		if (membership.role === 'super_admin') {
			return fail(403, { error: 'Cannot change super admin role' });
		}

		await db
			.update(memberships)
			.set({ role: newRole, updatedAt: new Date() })
			.where(eq(memberships.id, membershipId));

		return { roleChanged: true };
	}
};
