import crypto from 'crypto';
import { fail, redirect } from '@sveltejs/kit';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { impersonationSessions, sessions } from '$lib/server/db/schema';
import { logger } from '$lib/server/logger';
import type { Actions, PageServerLoad } from './$types';

function verifyPassword(password: string, hash: string, salt: string): boolean {
	const derived = crypto.scryptSync(password, salt, 64).toString('hex');
	return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(hash));
}

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!token) throw redirect(303, '/login');

	const imp = await db.query.impersonationSessions.findFirst({
		where: and(
			eq(impersonationSessions.token, token),
			gt(impersonationSessions.expiresAt, new Date())
		)
	});
	if (!imp) throw redirect(303, '/login');

	return { token };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const token = form.get('token') as string;
		const password = form.get('password') as string;

		if (!token || !password) return fail(400, { error: 'Missing fields' });

		const imp = await db.query.impersonationSessions.findFirst({
			where: and(
				eq(impersonationSessions.token, token),
				gt(impersonationSessions.expiresAt, new Date())
			)
		});

		if (!imp) return fail(403, { error: 'Invalid or expired token' });

		if (!verifyPassword(password, imp.passwordHash, imp.passwordSalt)) {
			return fail(403, { error: 'Wrong password' });
		}

		const sessionToken = crypto.randomUUID();
		const expires = imp.expiresAt;

		await db.insert(sessions).values({
			sessionToken,
			userId: imp.targetUserId,
			expires
		});

		logger.info(
			{ targetUserId: imp.targetUserId, impersonationId: imp.id },
			'impersonation: session started'
		);

		const secure = url.protocol === 'https:';
		const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';

		cookies.set(cookieName, sessionToken, {
			path: '/',
			httpOnly: true,
			secure,
			sameSite: 'lax',
			expires
		});

		cookies.set('impersonation-token', imp.token, {
			path: '/',
			httpOnly: false,
			secure,
			sameSite: 'lax',
			expires
		});

		throw redirect(303, '/');
	}
};
