import { config } from 'dotenv';
config({ path: '../.env' });

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const sql = postgres(DATABASE_URL);
const migrationsDir = path.resolve(import.meta.dirname, '..', 'drizzle');

async function main() {
	const journal = await sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`;
	const journalHashes = new Set(journal.map((j) => j.hash));

	const files = fs
		.readdirSync(migrationsDir)
		.filter((f) => f.endsWith('.sql'))
		.sort();

	const fileEntries = files.map((f) => {
		const content = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
		const hash = crypto.createHash('sha256').update(content).digest('hex');
		return { file: f, hash };
	});

	const missing = fileEntries.filter((f) => !journalHashes.has(f.hash));

	if (missing.length === 0) {
		console.log(`Journal is in sync (${journal.length} entries, ${files.length} files)`);
		await sql.end();
		return;
	}

	console.log(`Journal has ${journal.length} entries but ${files.length} migration files on disk`);
	console.log(`Missing from journal: ${missing.map((m) => m.file).join(', ')}`);

	for (const m of missing) {
		await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${m.hash}, ${Date.now()})`;
		console.log(`  Inserted: ${m.file}`);
	}

	const after = await sql`SELECT count(*) as count FROM drizzle.__drizzle_migrations`;
	console.log(`Journal now has ${after[0].count} entries — in sync`);
	await sql.end();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
