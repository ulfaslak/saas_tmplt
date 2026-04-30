import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { memberships, users } from '$lib/server/db/schema';
import { canAccessRoute } from '$lib/permissions';
import { resolveOrgWithRole } from '$lib/server/resolve-org';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const { org, role } = await resolveOrgWithRole(event);

	// Route-level role guard — redirect unauthorized users to dashboard root.
	if (!canAccessRoute(role, event.url.pathname)) {
		throw redirect(303, '/');
	}

	const orgMembers = await db
		.select({ id: users.id, name: users.name })
		.from(memberships)
		.innerJoin(users, eq(users.id, memberships.userId))
		.where(eq(memberships.orgId, org.id));

	const session = await event.locals.auth();

	return { org, session, role, orgMembers };
};
