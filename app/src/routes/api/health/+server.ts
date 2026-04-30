/**
 * Health check endpoint. Verifies database connectivity and returns
 * a status indicator suitable for uptime monitors and load balancers.
 */
import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';

/** Pings the database with a trivial query; returns 200 on success or 503 if unreachable. */
export const GET: RequestHandler = async () => {
	try {
		await db.execute(sql`SELECT 1`);
		return json({ status: 'ok', timestamp: new Date().toISOString() });
	} catch {
		return json(
			{ status: 'error', error: 'database unreachable' },
			{ status: 503 }
		);
	}
};
