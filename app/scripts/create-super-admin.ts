import { config } from 'dotenv';
config({ path: '../.env' });

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, memberships } from '../src/lib/server/db/schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function main() {
	const email = process.argv[2];
	if (!email) {
		console.error('Usage: pnpm create-super-admin <email>');
		process.exit(1);
	}

	const [user] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (!user) {
		console.error(`No user found with email: ${email}`);
		await client.end();
		process.exit(1);
	}

	const [membership] = await db
		.select({ id: memberships.id, role: memberships.role })
		.from(memberships)
		.where(eq(memberships.userId, user.id))
		.limit(1);

	if (!membership) {
		console.error(`User ${email} has no membership`);
		await client.end();
		process.exit(1);
	}

	if (membership.role === 'super_admin') {
		console.log(`User ${email} is already a super_admin`);
		await client.end();
		process.exit(0);
	}

	await db
		.update(memberships)
		.set({ role: 'super_admin', updatedAt: new Date() })
		.where(eq(memberships.id, membership.id));

	console.log(`\nPromoted to super_admin:`);
	console.log(`  Email: ${email}`);
	console.log(`  User ID: ${user.id}`);
	console.log(`  Previous role: ${membership.role}\n`);

	await client.end();
	process.exit(0);
}

main().catch(async (err) => {
	console.error('Failed:', err);
	await client.end();
	process.exit(1);
});
