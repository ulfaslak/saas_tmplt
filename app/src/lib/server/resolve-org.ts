import { redirect } from '@sveltejs/kit';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { memberships, organizations, users } from '$lib/server/db/schema';
import type { Role } from '$lib/permissions';

/**
 * Resolves the current user's organization from their session.
 * Redirects to /login if unauthenticated, /onboard if no membership or org.
 */
export async function resolveOrg(event: { locals: App.Locals }) {
	const session = await event.locals.auth();
	if (!session?.user?.id) throw redirect(303, '/login');

	const membership = await db.query.memberships.findFirst({
		where: eq(memberships.userId, session.user.id)
	});
	if (!membership) throw redirect(303, '/onboard');

	const org = await db.query.organizations.findFirst({
		where: and(eq(organizations.id, membership.orgId), isNull(organizations.deletedAt))
	});
	if (!org) throw redirect(303, '/onboard');

	return org;
}

/**
 * Resolves org + membership role. Use when you need the user's role for access control.
 */
export async function resolveOrgWithRole(event: { locals: App.Locals }) {
	const session = await event.locals.auth();
	if (!session?.user?.id) throw redirect(303, '/login');

	const membership = await db.query.memberships.findFirst({
		where: eq(memberships.userId, session.user.id)
	});
	if (!membership) throw redirect(303, '/onboard');

	const org = await db.query.organizations.findFirst({
		where: and(eq(organizations.id, membership.orgId), isNull(organizations.deletedAt))
	});
	if (!org) throw redirect(303, '/onboard');

	return { org, role: membership.role as Role, userId: session.user.id };
}

/**
 * Loads the full user record for the current session. Use when you need
 * profile fields (name, jobTitle) that aren't on session.user — for example,
 * when snapshotting authorship into audit-trail rows.
 */
export async function resolveSessionUser(event: { locals: App.Locals }) {
	const session = await event.locals.auth();
	if (!session?.user?.id) throw redirect(303, '/login');

	const user = await db.query.users.findFirst({
		where: eq(users.id, session.user.id)
	});
	if (!user) throw redirect(303, '/login');

	return user;
}
