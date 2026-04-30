/**
 * Shared Drizzle ORM database client.
 * Connects to Postgres using DATABASE_URL and re-exports a single `db` instance.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

const client = postgres(env.DATABASE_URL!);
export const db = drizzle(client, { schema });
