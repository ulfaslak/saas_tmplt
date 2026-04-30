/**
 * HMAC-signed, time-limited state tokens for OAuth flows.
 * Encodes the org ID into the state parameter so we can bind the
 * OAuth callback to the correct organization.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

const EXPIRY_MS = 10 * 60 * 1000;

function sign(payload: string): string {
	return createHmac('sha256', env.AUTH_SECRET!).update(payload).digest('base64url');
}

/** Produce an HMAC-signed, base64url-encoded state string with a 10-minute expiry. */
export function createState(orgId: string): string {
	const payload = Buffer.from(JSON.stringify({ orgId, exp: Date.now() + EXPIRY_MS })).toString(
		'base64url'
	);
	return `${payload}.${sign(payload)}`;
}

/** Verify signature and expiry of a state token, returning the embedded org ID. Throws on failure. */
export function verifyState(state: string): { orgId: string } {
	const dotIndex = state.indexOf('.');
	if (dotIndex === -1) throw new Error('malformed state');

	const payload = state.slice(0, dotIndex);
	const signature = state.slice(dotIndex + 1);

	const expected = sign(payload);
	if (
		signature.length !== expected.length ||
		!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
	) {
		throw new Error('invalid state signature');
	}

	const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));

	if (typeof data.exp !== 'number' || Date.now() > data.exp) {
		throw new Error('state expired');
	}

	if (typeof data.orgId !== 'string') {
		throw new Error('missing orgId in state');
	}

	return { orgId: data.orgId };
}
