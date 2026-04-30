/**
 * Drizzle table definitions: Auth.js (users, accounts, sessions) and the
 * multi-tenancy primitives (organizations, memberships, invites, api_keys,
 * impersonation_sessions) the template ships with.
 *
 * Add product-specific tables below the divider as your project grows.
 */
import { pgTable, uuid, text, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core';

// ── Auth.js tables (managed by Auth.js via Drizzle adapter) ─────────────

export const users = pgTable('user', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name'),
	email: text('email').unique(),
	emailVerified: timestamp('emailVerified', { mode: 'date' }),
	image: text('image'),
	jobTitle: text('job_title')
});

export const accounts = pgTable(
	'account',
	{
		userId: uuid('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		provider: text('provider').notNull(),
		providerAccountId: text('providerAccountId').notNull(),
		refresh_token: text('refresh_token'),
		access_token: text('access_token'),
		expires_at: integer('expires_at'),
		token_type: text('token_type'),
		scope: text('scope'),
		id_token: text('id_token'),
		session_state: text('session_state')
	},
	(account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })]
);

export const sessions = pgTable('session', {
	sessionToken: text('sessionToken').primaryKey(),
	userId: uuid('userId')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expires: timestamp('expires', { mode: 'date' }).notNull()
});

export const verificationTokens = pgTable(
	'verificationToken',
	{
		identifier: text('identifier').notNull(),
		token: text('token').notNull(),
		expires: timestamp('expires', { mode: 'date' }).notNull()
	},
	(vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ── Multi-tenancy primitives ────────────────────────────────────────────

export const organizations = pgTable('organizations', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	slug: text('slug').unique(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	deletedAt: timestamp('deleted_at', { withTimezone: true })
});

export const memberships = pgTable('memberships', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: 'cascade' }),
	orgId: uuid('org_id')
		.notNull()
		.references(() => organizations.id),
	role: text('role').notNull().default('admin'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const invites = pgTable('invites', {
	id: uuid('id').primaryKey().defaultRandom(),
	orgId: uuid('org_id')
		.notNull()
		.references(() => organizations.id),
	email: text('email').notNull(),
	token: text('token').notNull().unique(),
	role: text('role').notNull(),
	createdBy: uuid('created_by').references(() => users.id),
	usedBy: uuid('used_by').references(() => users.id),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	revokedAt: timestamp('revoked_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const apiKeys = pgTable('api_keys', {
	id: uuid('id').primaryKey().defaultRandom(),
	orgId: uuid('org_id')
		.notNull()
		.references(() => organizations.id),
	name: text('name').notNull(),
	keyHash: text('key_hash').notNull().unique(),
	keyPrefix: text('key_prefix').notNull(),
	createdBy: uuid('created_by')
		.notNull()
		.references(() => users.id),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	lastUsedAt: timestamp('last_used_at', { withTimezone: true })
});

export const impersonationSessions = pgTable('impersonation_sessions', {
	id: uuid('id').primaryKey().defaultRandom(),
	token: uuid('token').notNull().unique().defaultRandom(),
	targetUserId: uuid('target_user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	passwordHash: text('password_hash').notNull(),
	passwordSalt: text('password_salt').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

// ── Product tables ──────────────────────────────────────────────────────
// Add your product's tables below.
