/**
 * API key management page — lists existing keys and provides actions
 * to create new keys or revoke existing ones.
 */
import { fail } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { db } from '$lib/server/db';
import { apiKeys, users } from '$lib/server/db/schema';
import { resolveOrg } from '$lib/server/resolve-org';
import { hashKey } from '$lib/server/api-auth';
import type { PageServerLoad, Actions } from './$types';

/** Loads all API keys for the org, joined with creator name. */
export const load: PageServerLoad = async ({ parent }) => {
	const { org } = await parent();

	const rows = await db
		.select({
			id: apiKeys.id,
			name: apiKeys.name,
			keyPrefix: apiKeys.keyPrefix,
			createdAt: apiKeys.createdAt,
			lastUsedAt: apiKeys.lastUsedAt,
			createdByName: users.name
		})
		.from(apiKeys)
		.innerJoin(users, eq(apiKeys.createdBy, users.id))
		.where(eq(apiKeys.orgId, org.id))
		.orderBy(apiKeys.createdAt);

	return { keys: rows };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const org = await resolveOrg({ locals });
		const session = await locals.auth();
		const data = await request.formData();
		const name = (data.get('name') as string)?.trim();

		if (!name) {
			return fail(400, { error: 'Name is required' });
		}

		const raw = 'sk_' + randomBytes(32).toString('hex');
		const hash = await hashKey(raw);
		const prefix = raw.slice(0, 11);

		await db.insert(apiKeys).values({
			orgId: org.id,
			name,
			keyHash: hash,
			keyPrefix: prefix,
			createdBy: session!.user!.id
		});

		return { createdKey: raw };
	},

	revoke: async ({ request, locals }) => {
		const org = await resolveOrg({ locals });
		const data = await request.formData();
		const keyId = data.get('keyId');

		if (!keyId || typeof keyId !== 'string') {
			return fail(400, { error: 'Key ID is required' });
		}

		await db
			.delete(apiKeys)
			.where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, org.id)));

		return { revoked: true };
	}
};
