import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { impersonationSessions } from '$lib/server/db/schema';
import { logger } from '$lib/server/logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let token: string | null = null;

	const contentType = request.headers.get('content-type') || '';
	if (contentType.includes('application/json')) {
		const body = await request.json();
		token = body.token;
	} else {
		const text = await request.text();
		try {
			const body = JSON.parse(text);
			token = body.token;
		} catch {
			token = text;
		}
	}

	if (!token) return json({ error: 'missing token' }, { status: 400 });

	await db
		.update(impersonationSessions)
		.set({ expiresAt: new Date() })
		.where(eq(impersonationSessions.token, token));

	logger.info({ token }, 'impersonation: session ended');

	return json({ ended: true });
};
