import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { resolveSessionUser } from '$lib/server/resolve-org';
import type { PageServerLoad, Actions } from './$types';

const NAME_MAX = 200;
const JOB_TITLE_MAX = 120;

export const load: PageServerLoad = async (event) => {
	const user = await resolveSessionUser(event);
	const { role } = await event.parent();

	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			jobTitle: user.jobTitle
		},
		role
	};
};

export const actions: Actions = {
	save: async (event) => {
		const user = await resolveSessionUser(event);
		const formData = await event.request.formData();

		const rawName = formData.get('name');
		if (!rawName || typeof rawName !== 'string' || rawName.trim().length === 0) {
			return fail(400, { error: 'Name is required.' });
		}
		const name = rawName.trim();
		if (name.length > NAME_MAX) {
			return fail(400, { error: `Name must be ${NAME_MAX} characters or fewer.` });
		}

		const rawTitle = formData.get('jobTitle');
		const trimmedTitle =
			typeof rawTitle === 'string' && rawTitle.trim().length > 0 ? rawTitle.trim() : null;
		if (trimmedTitle && trimmedTitle.length > JOB_TITLE_MAX) {
			return fail(400, { error: `Job title must be ${JOB_TITLE_MAX} characters or fewer.` });
		}

		await db
			.update(users)
			.set({ name, jobTitle: trimmedTitle })
			.where(eq(users.id, user.id));

		return { success: true };
	}
};
