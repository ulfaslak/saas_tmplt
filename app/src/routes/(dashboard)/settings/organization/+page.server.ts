import { fail } from '@sveltejs/kit';
import { eq, and, ilike, isNull, ne } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { organizations } from '$lib/server/db/schema';
import { resolveOrgWithRole } from '$lib/server/resolve-org';
import { canEditOrganization } from '$lib/permissions';
import { isValidSlug } from '$lib/server/services/slug';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { org } = await parent();
	return { org };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const { org, role } = await resolveOrgWithRole({ locals });
		if (!canEditOrganization(role)) return fail(403, { error: 'Permission denied' });
		const formData = await request.formData();

		const name = formData.get('name');
		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return fail(400, { error: 'Organization name is required.' });
		}

		const existing = await db.query.organizations.findFirst({
			where: and(
				ilike(organizations.name, name.trim()),
				isNull(organizations.deletedAt),
				ne(organizations.id, org.id)
			)
		});
		if (existing) {
			return fail(400, { error: 'An organization with this name already exists.' });
		}

		const rawSlug = formData.get('slug');
		let slug: string | undefined = undefined;
		if (rawSlug && typeof rawSlug === 'string' && rawSlug.trim().length > 0) {
			const trimmedSlug = rawSlug.trim();
			if (!isValidSlug(trimmedSlug)) {
				return fail(400, {
					error: 'Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only.'
				});
			}
			if (trimmedSlug !== org.slug) {
				const slugTaken = await db.query.organizations.findFirst({
					where: and(
						eq(organizations.slug, trimmedSlug),
						isNull(organizations.deletedAt),
						ne(organizations.id, org.id)
					)
				});
				if (slugTaken) {
					return fail(400, { error: 'This slug is already taken.' });
				}
			}
			slug = trimmedSlug;
		}

		await db
			.update(organizations)
			.set({
				name: (name as string).trim(),
				...(slug !== undefined ? { slug } : {}),
				updatedAt: new Date()
			})
			.where(eq(organizations.id, org.id));

		return { success: true };
	}
};
