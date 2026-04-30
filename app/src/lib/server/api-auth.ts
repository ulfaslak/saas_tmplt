/**
 * API key authentication for external webhook and REST consumers.
 * Validates Bearer tokens against SHA-256 hashes stored in the database.
 */
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { apiKeys, organizations } from '$lib/server/db/schema';
import { logger } from '$lib/server/logger';

/** SHA-256 hash a raw API key string into its hex-encoded storage form. */
async function hashKey(raw: string): Promise<string> {
	const encoded = new TextEncoder().encode(raw);
	const digest = await crypto.subtle.digest('SHA-256', encoded);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export { hashKey };

/**
 * Extract and verify a Bearer API key from the request's Authorization header.
 * Throws a 401 Response if the key is missing or invalid. Updates lastUsedAt
 * in the background (fire-and-forget).
 */
export async function authenticateApiKey(
	request: Request
): Promise<{ orgId: string; keyId: string }> {
	const authHeader = request.headers.get('authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		throw new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const raw = authHeader.slice(7);
	const hash = await hashKey(raw);

	const row = await db
		.select({
			id: apiKeys.id,
			orgId: apiKeys.orgId
		})
		.from(apiKeys)
		.innerJoin(organizations, eq(apiKeys.orgId, organizations.id))
		.where(and(eq(apiKeys.keyHash, hash), isNull(organizations.deletedAt)));

	if (row.length === 0) {
		throw new Response(JSON.stringify({ error: 'Invalid API key' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	db.update(apiKeys)
		.set({ lastUsedAt: new Date() })
		.where(eq(apiKeys.id, row[0].id))
		.then(() => {})
		.catch((err) => logger.warn({ err, keyId: row[0].id }, 'Failed to update API key lastUsedAt'));

	return { orgId: row[0].orgId, keyId: row[0].id };
}
