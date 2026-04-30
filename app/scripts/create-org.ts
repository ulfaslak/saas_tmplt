import { config } from 'dotenv';
config({ path: '../.env' });

import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { organizations, invites } from '../src/lib/server/db/schema';
import { generateSlug } from '../src/lib/server/services/slug';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
	const name = process.argv[2];
	const adminEmail = process.argv[3]?.trim().toLowerCase();
	if (!name || !adminEmail) {
		console.error('Usage: pnpm create-org "Org Name" admin@example.com');
		process.exit(1);
	}
	if (!EMAIL_REGEX.test(adminEmail)) {
		console.error(`Invalid admin email: ${adminEmail}`);
		process.exit(1);
	}

	const slug = generateSlug(name);
	const [org] = await db.insert(organizations).values({ name: name.trim(), slug }).returning();

	const token = crypto.randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

	await db.insert(invites).values({
		orgId: org.id,
		email: adminEmail,
		token,
		role: 'admin',
		createdBy: null,
		expiresAt
	});

	const appUrl = process.env.APP_URL || 'http://localhost:5173';
	const inviteUrl = `${appUrl}/invite/${token}`;

	console.log(`\nOrganization created:`);
	console.log(`  Name:  ${org.name}`);
	console.log(`  Slug:  ${org.slug}`);
	console.log(`  ID:    ${org.id}`);
	console.log(`  Admin: ${adminEmail}`);
	console.log(`\nInvite URL (expires in 7 days, no email sent — share manually):`);
	console.log(`  ${inviteUrl}\n`);

	await client.end();
	process.exit(0);
}

main().catch(async (err) => {
	console.error('Failed:', err);
	await client.end();
	process.exit(1);
});
