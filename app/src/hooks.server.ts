/**
 * Server hooks pipeline: proto correction, auth, route guarding, and request logging.
 * Runs on every incoming request via SvelteKit's `sequence`.
 */
import { dev } from '$app/environment';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { handle as authHandle } from './auth';
import { logger } from '$lib/server/logger';
import { startQueue } from '$lib/server/queue';
import { registerHandlers } from '$lib/server/jobs/register';
import crypto from 'node:crypto';

startQueue()
	.then(registerHandlers)
	.catch((err) => {
		if (dev) {
			logger.warn(
				{ err },
				'Failed to start queue (Postgres unavailable). Background jobs disabled; start Docker Postgres for full local dev. See AGENTS/DNA/DEVELOPMENT.md'
			);
			return;
		}
		logger.error({ err }, 'Failed to start queue');
		process.exit(1);
	});

/** Assigns a unique request ID and creates a scoped child logger on event.locals. */
const requestIdHandle: Handle = async ({ event, resolve }) => {
	const requestId = crypto.randomUUID();
	event.locals.requestId = requestId;
	event.locals.logger = logger.child({ requestId });
	return resolve(event);
};

const PUBLIC_PATHS = ['/login', '/auth', '/impersonate'];
const UNPROTECTED_PREFIXES = ['/api/webhooks/', '/api/v1/', '/api/health', '/api/impersonate/'];

/** Rewrites the request URL and object from HTTP to HTTPS when behind a reverse proxy. */
const forwardedProtoHandle: Handle = async ({ event, resolve }) => {
	const proto = event.request.headers.get('x-forwarded-proto');
	if (proto === 'https' && event.url.protocol === 'http:') {
		const httpsUrl = new URL(event.url);
		httpsUrl.protocol = 'https:';
		event.url = httpsUrl;
		const correctedRequest = new Request(httpsUrl, {
			method: event.request.method,
			headers: event.request.headers,
			body: event.request.method !== 'GET' && event.request.method !== 'HEAD'
				? event.request.body
				: undefined,
			duplex: 'half'
		} as RequestInit);
		Object.defineProperty(event, 'request', {
			value: correctedRequest,
			writable: true,
			configurable: true
		});
	}
	return resolve(event);
};

/**
 * Auth.js hits Postgres for session lookup. Without a local DB, that throws and every route returns 500.
 * In dev only, treat that as “logged out” so public routes (e.g. /landing) and redirect-to-login still work.
 */
const devResilientAuthHandle: Handle = async ({ event, resolve }) => {
	try {
		return await authHandle({ event, resolve });
	} catch (err) {
		if (!dev) throw err;
		logger.warn(
			{ err },
			'Auth handle failed (e.g. DATABASE_URL unreachable). Continuing as logged out; start Postgres for sign-in and dashboard.'
		);
		event.locals.auth = async () => null;
		return resolve(event);
	}
};

/** Redirects unauthenticated users to /login, except for public and API paths. */
const guardHandle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	if (
		PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
		UNPROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
	) {
		return resolve(event);
	}

	const session = await event.locals.auth();
	if (!session?.user) {
		const returnTo = pathname + event.url.search;
		const loginUrl = returnTo === '/' ? '/login' : `/login?redirectTo=${encodeURIComponent(returnTo)}`;
		throw redirect(303, loginUrl);
	}

	return resolve(event);
};

const SKIP_LOG_PREFIXES = ['/_app/', '/favicon', '/apple-touch-icon', '/site.webmanifest'];

/** Logs method, path, status, duration, and user/org context for each request (skips static assets). */
const requestLogHandle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	if (SKIP_LOG_PREFIXES.some((p) => pathname.startsWith(p))) {
		return resolve(event);
	}

	const start = Date.now();
	const response = await resolve(event);
	const duration = Date.now() - start;

	// Enrich the request log with user context when available
	const session = await event.locals.auth().catch(() => null);
	const userId = session?.user?.id;

	const log = event.locals.logger ?? logger;
	log.info(
		{
			method: event.request.method,
			path: pathname,
			status: response.status,
			duration,
			...(userId && { userId })
		},
		'request'
	);

	// Attach request ID as response header for client-side correlation
	response.headers.set('x-request-id', event.locals.requestId);

	return response;
};

export const handle = sequence(
	forwardedProtoHandle,
	requestIdHandle,
	devResilientAuthHandle,
	guardHandle,
	requestLogHandle
);
