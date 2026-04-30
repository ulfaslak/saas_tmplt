import { config } from 'dotenv';
config({ path: '../.env' });

import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';

const { impersonationSessions, users } = schema;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

function parseArgs(argv: string[]) {
	const args: Record<string, string> = {};
	for (let i = 2; i < argv.length; i++) {
		if (argv[i].startsWith('--') && i + 1 < argv.length) {
			args[argv[i].slice(2)] = argv[i + 1];
			i++;
		}
	}
	return args;
}

function hashPassword(password: string, salt: string): string {
	return crypto.scryptSync(password, salt, 64).toString('hex');
}

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

async function main() {
	const args = parseArgs(process.argv);

	if (!args['user-id'] || !args['password']) {
		console.error('Usage: pnpm impersonate --user-id <uuid> --password <pw> [--ttl <seconds>]');
		process.exit(1);
	}

	const userId = args['user-id'];
	const password = args['password'];
	const ttl = parseInt(args['ttl'] || '3600', 10);

	const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
	if (!user) {
		console.error(`User not found: ${userId}`);
		await client.end();
		process.exit(1);
	}

	const salt = crypto.randomBytes(16).toString('hex');
	const passwordHash = hashPassword(password, salt);
	const expiresAt = new Date(Date.now() + ttl * 1000);

	const [session] = await db
		.insert(impersonationSessions)
		.values({ targetUserId: userId, passwordHash, passwordSalt: salt, expiresAt })
		.returning();

	const appUrl = process.env.APP_URL || 'http://localhost:5173';
	const url = `${appUrl}/impersonate?token=${session.token}`;

	console.log(`\nImpersonation session created:`);
	console.log(`  Target user: ${user.name || user.email} (${user.id})`);
	console.log(`  Expires: ${expiresAt.toISOString()} (${ttl}s)`);
	console.log(`\nURL:`);
	console.log(`  ${url}\n`);

	await client.end();
	process.exit(0);
}

main().catch(async (err) => {
	console.error('Failed:', err);
	await client.end();
	process.exit(1);
});
