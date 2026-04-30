/**
 * Invite landing page. Unauthenticated users are redirected to /login with a
 * return URL so they land back here after sign-in. Logged-in users see one of:
 * accept view, already-a-member-here, already-in-another-org, expired, revoked,
 * used-by-someone-else, or not-found.
 */
import { redirect, fail } from '@sveltejs/kit';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { invites, memberships, organizations } from '$lib/server/db/schema';
import { logger } from '$lib/server/logger';
import type { PageServerLoad, Actions } from './$types';

type InviteState =
	| { kind: 'notFound' }
	| { kind: 'revoked'; orgName: string }
	| { kind: 'expired'; orgName: string }
	| { kind: 'usedByOther'; orgName: string }
	| { kind: 'alreadyMemberHere'; orgName: string }
	| { kind: 'alreadyInOtherOrg'; otherOrgName: string; inviteOrgName: string }
	| {
			kind: 'acceptable';
			token: string;
			orgName: string;
			role: string;
			email: string;
	  };

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (!session?.user?.id) {
		const returnTo = `/invite/${event.params.token}`;
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(returnTo)}`);
	}

	const token = event.params.token;

	const [invite] = await db
		.select({
			orgId: invites.orgId,
			orgName: organizations.name,
			email: invites.email,
			role: invites.role,
			usedBy: invites.usedBy,
			expiresAt: invites.expiresAt,
			revokedAt: invites.revokedAt
		})
		.from(invites)
		.innerJoin(organizations, eq(invites.orgId, organizations.id))
		.where(eq(invites.token, token))
		.limit(1);

	let state: InviteState;

	if (!invite) {
		state = { kind: 'notFound' };
	} else if (invite.revokedAt !== null) {
		state = { kind: 'revoked', orgName: invite.orgName };
	} else if (invite.usedBy !== null) {
		state =
			invite.usedBy === session.user.id
				? { kind: 'alreadyMemberHere', orgName: invite.orgName }
				: { kind: 'usedByOther', orgName: invite.orgName };
	} else if (invite.expiresAt < new Date()) {
		state = { kind: 'expired', orgName: invite.orgName };
	} else {
		const existingMembership = await db.query.memberships.findFirst({
			where: eq(memberships.userId, session.user.id)
		});
		if (existingMembership) {
			if (existingMembership.orgId === invite.orgId) {
				state = { kind: 'alreadyMemberHere', orgName: invite.orgName };
			} else {
				const otherOrg = await db.query.organizations.findFirst({
					where: eq(organizations.id, existingMembership.orgId),
					columns: { name: true }
				});
				state = {
					kind: 'alreadyInOtherOrg',
					otherOrgName: otherOrg?.name ?? 'another organization',
					inviteOrgName: invite.orgName
				};
			}
		} else {
			state = {
				kind: 'acceptable',
				token,
				orgName: invite.orgName,
				role: invite.role,
				email: invite.email
			};
		}
	}

	return { state, userEmail: session.user.email ?? null };
};

export const actions: Actions = {
	accept: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) throw redirect(303, '/login');
		const userId = session.user.id;

		const token = event.params.token;

		try {
			const result = await db.transaction(async (tx) => {
				// Atomically claim the invite. If it's already used, revoked, or
				// expired, no row is returned — we abort with an error.
				const [claimed] = await tx
					.update(invites)
					.set({ usedBy: userId })
					.where(
						and(
							eq(invites.token, token),
							isNull(invites.usedBy),
							isNull(invites.revokedAt),
							gt(invites.expiresAt, new Date())
						)
					)
					.returning({ orgId: invites.orgId, role: invites.role });

				if (!claimed) {
					// Could be: not found, revoked, used by someone else, or expired.
					return { ok: false as const, error: 'This invite link is invalid or has expired.' };
				}

				const existing = await tx.query.memberships.findFirst({
					where: eq(memberships.userId, userId)
				});
				if (existing) {
					if (existing.orgId === claimed.orgId) {
						// Idempotent: they were already a member; leave membership untouched.
						return { ok: true as const };
					}
					// The single-org DB constraint would reject the insert below.
					// Fail the whole transaction so the claim is rolled back — the
					// invite stays pending and another account can use it.
					throw new Error('USER_HAS_OTHER_ORG');
				}

				await tx.insert(memberships).values({
					userId,
					orgId: claimed.orgId,
					role: claimed.role
				});

				return { ok: true as const };
			});

			if (!result.ok) {
				return fail(400, { error: result.error });
			}
		} catch (err) {
			if (err instanceof Error && err.message === 'USER_HAS_OTHER_ORG') {
				return fail(400, {
					error:
						'You already belong to another organization. Ask your admin to remove you before accepting this invite.'
				});
			}
			logger.error({ err, token }, 'invite.accept: unexpected failure');
			return fail(500, { error: 'Something went wrong. Try again.' });
		}

		throw redirect(303, '/');
	}
};
