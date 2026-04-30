import { redirect, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { organizations, memberships, users } from '$lib/server/db/schema';
import { generateSlug } from '$lib/server/services/slug';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (!session?.user?.id) throw redirect(303, '/login');

	const existing = await db.query.memberships.findFirst({
		where: eq(memberships.userId, session.user.id)
	});
	if (existing) throw redirect(303, '/');

	// Legacy support: forward old-style /onboard?invite=<token> links to the
	// new route so in-flight invites keep working after the flow change.
	const legacyToken = event.url.searchParams.get('invite');
	if (legacyToken) {
		throw redirect(303, `/invite/${legacyToken}`);
	}

	const user = await db.query.users.findFirst({
		where: eq(users.id, session.user.id),
		columns: { name: true }
	});

	return { suggestedName: user?.name ?? '' };
};

export const actions: Actions = {
	createOrg: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) throw redirect(303, '/login');

		const existing = await db.query.memberships.findFirst({
			where: eq(memberships.userId, session.user.id)
		});
		if (existing) throw redirect(303, '/');

		const formData = await event.request.formData();
		const name = (formData.get('name') as string | null)?.trim() ?? '';
		const userName = (formData.get('userName') as string | null)?.trim() ?? '';

		if (!name || name.length > 100) {
			return fail(400, { createError: 'Organization name is required (max 100 characters).' });
		}

		if (userName.length > 100) {
			return fail(400, { createError: 'Your name must be 100 characters or fewer.' });
		}

		let slug = generateSlug(name);

		await db.transaction(async (tx) => {
			const existingOrg = await tx.query.organizations.findFirst({
				where: eq(organizations.slug, slug),
				columns: { id: true }
			});
			if (existingOrg) {
				const suffix = Date.now().toString(36).slice(-4);
				slug = `${slug.slice(0, 45)}-${suffix}`;
			}

			const [org] = await tx
				.insert(organizations)
				.values({ name, slug })
				.returning();

			await tx.insert(memberships).values({
				userId: session.user!.id,
				orgId: org.id,
				role: 'admin'
			});

			if (userName) {
				await tx.update(users).set({ name: userName }).where(eq(users.id, session.user!.id));
			}
		});

		throw redirect(303, '/');
	}
};
