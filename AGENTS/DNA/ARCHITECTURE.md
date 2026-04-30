# Architecture

This file documents *where things live* and *how the pieces fit together*. It must stay in sync with the code — when you add new structure (a new service, a new route group, a new schema concept), record it here.

## File structure

To see the current file tree, run:

```bash
tree app/src -I node_modules --dirsfirst
```

For the full repo including infra files:

```bash
tree -I 'node_modules|.svelte-kit|drizzle' -L 2
```

The SvelteKit app lives in `app/`. Routes follow standard SvelteKit conventions.

### Key non-obvious files (template baseline)

> ⚠️ **Template placeholder.** Below are the canonical helpers shipped with the template. As you add new services, jobs, schemas, or shared helpers, append them here so future agents know where to look. Treat this list as a *table of contents for non-obvious helpers*, not a file dump.

- `app/src/hooks.server.ts` — request ID generation, child logger creation, auth handle, route protection guard, request logging (with user/org context), queue startup.
- `app/src/lib/server/queue.ts` — pg-boss queue singleton (start, stop, getBoss).
- `app/src/lib/server/jobs/` — job handlers. The `register.ts` file wires all handlers up at startup; add new handlers here.
- `app/src/lib/permissions.ts` — role definitions (Role type, ROLES, INVITABLE_ROLES), route access map, permission helpers (canAccessRoute, etc.). Shared between server and client.
- `app/src/lib/server/resolve-org.ts` — shared helper: session → membership → org lookup (redirects if missing). `resolveOrgWithRole()` variant returns role for action-level guards. `resolveSessionUser()` variant loads the full user record when profile fields are needed.
- `app/src/lib/server/db/queries.ts` — canonical helpers for "active X for org" queries against soft-deletable tenant tables. Each table exposes a **predicate form** (`activeXPredicate(orgId)` returning a `SQL` chunk for `.where(...)`) and a **query-builder form** (`activeXForOrg(orgId)` returning a `SELECT *` Drizzle query). Encodes the `orgId + isNull(deletedAt)` base filter so callers can't accidentally omit either half. New queries against soft-deletable tables should go through these helpers.
- `app/src/lib/server/api-auth.ts` — API key auth: Bearer token → org lookup (for `/api/v1/*` routes).
- `app/src/lib/server/oauth-state.ts` — HMAC-signed OAuth state (create/verify).
- `app/src/lib/server/services/email.ts` — transactional email via Resend. Exports helpers like `sendInviteEmail()`; no-ops (with a warning log) when `AUTH_RESEND_KEY` is unset so local dev doesn't hard-fail.
- `app/src/lib/server/services/slug.ts` — generates and validates URL-safe slugs (used by the org-creation flow and settings page).
- `app/src/lib/server/test-utils.ts` — integration-test factories and DB cleanup helpers.
- `app/src/lib/server/integration-setup.ts` — Vitest globalSetup: creates the `app_test` database (if missing) and applies migrations before the integration suite runs.
- `app/src/lib/components/ui/` — shadcn-svelte primitives (do not modify).
- `app/src/routes/api/health/+server.ts` — health check endpoint (pings DB, returns `{status: 'ok'}`).
- `app/src/routes/login/`, `app/src/routes/onboard/`, `app/src/routes/invite/[token]/` — auth surfaces.
- `app/src/routes/(dashboard)/` — authenticated route group. All authenticated pages share the sidebar shell here.
- `app/scripts/create-org.ts` — CLI to create an org + seed admin invite (`pnpm create-org "Org Name" admin@example.com`).
- `app/scripts/create-super-admin.ts` — CLI to promote a user to `super_admin` (`pnpm create-super-admin <email>`).
- `app/scripts/impersonate.ts` — CLI to mint an impersonation session (`pnpm impersonate --user-id <uuid> --password <pw> [--ttl <seconds>]`).
- `app/scripts/migrate-sync.ts` — syncs Drizzle migration journal with files on disk (`pnpm migrate:sync`).

## Data models

The source of truth for table schemas is `app/src/lib/server/db/schema.ts`. Read it directly rather than relying on this document.

### Key non-obvious schema details (template baseline)

> ⚠️ **Template placeholder.** Document anything about the schema that isn't self-evident from reading `schema.ts` — denormalization choices, application-level invariants, JSONB shape contracts. The baseline below applies to the template's auth + multi-tenancy primitives.

- **Auth.js tables** (`user`, `account`, `session`, `verificationToken`) use UUIDs for user IDs.
- **`memberships`** joins users to organizations with a `role` column. One org per user is enforced by a unique constraint on `memberships.userId` (relax this if your product needs multi-org membership).
- **Soft delete** (`deleted_at` timestamp) on `organizations`. Add it to additional tenant-scoped tables as you create them, and route their queries through `$lib/server/db/queries.ts`.
- **Invites** carry a `role` (text, NOT NULL — role assigned on accept; `super_admin` cannot be assigned via invite), an `email` (text, NOT NULL — recipient for the email-based flow), and a `revoked_at` (nullable timestamp — soft-revoke so the invite URL can show a dedicated "revoked" page instead of a 404). Lifecycle is derived at read time: `pending` | `accepted` (`used_by` set) | `expired` (past `expires_at`) | `revoked` (`revoked_at` set). Resend reuses the same row, rotating `token` + `expires_at` and clearing `revoked_at`.
- **API keys** are SHA-256 hashed at rest; raw key is shown once at creation. Hard-deleted on revoke (no soft delete).
- **`impersonation_sessions`** stores superuser backdoor sessions. Created via CLI script; token + scrypt-hashed password required to activate. On login, a real Auth.js session is created for the target user. `expires_at` is set to `now()` on browser close via `sendBeacon`. Audit trail: each row's `created_at → expires_at` window shows exactly when someone was impersonating.

## Pipeline architecture

> ⚠️ **Template placeholder.** Document any non-trivial pipelines (webhook flows, background jobs, multi-step LLM passes) here as ASCII diagrams. The template ships without product-specific pipelines — replace this section with yours.

### Background processing

The template uses **pg-boss** (Postgres-backed durable queue). Jobs persist across crashes and retry with exponential backoff. Webhook handlers should return 200 immediately and enqueue work via the queue — synchronous handler logic is reserved for signature verification and request validation.

The queue auto-manages its own `pgboss` schema; no Drizzle migration is needed for the queue itself.

Add new job types in `app/src/lib/server/jobs/` and register them in `register.ts`. Use shared `constants.ts` for cross-job invariants (debounce windows, retry counts, etc.).
