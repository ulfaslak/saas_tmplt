/**
 * Soft-delete-safe query helpers for tenant-scoped tables.
 *
 * Forgetting `isNull(...deletedAt)` leaks soft-deleted rows; forgetting
 * `orgId` leaks tenant data. Both predicates are load-bearing — these helpers
 * encode the base filter so callers can't accidentally omit it.
 *
 * Two flavors are exported per table:
 *
 * 1. **Query-builder form** (`activeXForOrg(orgId)`) — returns a Drizzle
 *    select query with the base filter already applied. Chain `.limit()`,
 *    `.orderBy()`, `.innerJoin()`, `.groupBy()`, `.offset()`, `.for()` as
 *    needed. **Drizzle `.where()` overrides rather than appends** — do NOT
 *    call `.where()` on the result. If you need additional predicates, use
 *    the where-clause form instead.
 *
 * 2. **Where-clause form** (`activeXPredicate(orgId)`) — returns a `SQL`
 *    predicate you pass directly to `.where(...)`. Use when the caller needs
 *    a custom projection (`.select({ name, count() })`), a
 *    `db.query.X.findFirst({ where: ... })` relational lookup, or must
 *    combine with additional filters inside `and(...)`.
 *
 * Add a pair per soft-deletable tenant-scoped table you introduce.
 *
 * See DECISIONS.md § "Data" for the soft-delete ruling and ARCHITECTURE.md
 * for this file's role.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { db } from './index';
import { organizations } from './schema';

// ---------- organizations ----------

/**
 * Predicate: `id = $orgId AND deleted_at IS NULL`.
 * Note: `organizations` is keyed on `id`, not `orgId` — the shape differs
 * from other tenant tables. Pass to `.where(...)` on a custom-projection
 * select or a `db.query.organizations.findFirst({ where: ... })` relational
 * lookup (see `resolve-org.ts`).
 */
export const activeOrganizationPredicate = (orgId: string) =>
	and(eq(organizations.id, orgId), isNull(organizations.deletedAt));

/**
 * `SELECT *` of the non-soft-deleted organization with the given id.
 * Returns a query (not a row) — typically caller will `.limit(1)` and
 * destructure. Do NOT call `.where()` — use `activeOrganizationPredicate`
 * in `and(...)` instead.
 */
export function activeOrganization(orgId: string) {
	return db.select().from(organizations).where(activeOrganizationPredicate(orgId));
}
