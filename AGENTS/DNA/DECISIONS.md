# Decisions

Flat lookup of rulings, organized by domain. No justifications — just decisions.

> ⚠️ **Template baseline.** Each decision below was true for the project this template was extracted from. Keep what fits, change what doesn't, and add new decisions as you make them. **The point of this file is that decisions are made *once* and then enforced everywhere** — agents read this before writing code, and refactor work that violates it.

## Framework

- SvelteKit full-stack, no separate backend
- Svelte 5 (runes syntax), TypeScript
- Svelte conventions: `onclick` not `on:click`, never use `bind:open` without checking component support, match HTML tags carefully. Tabs for indentation in `.svelte` files.
- When implementing multi-step UI flows (modals, dropdowns, confirmations), test the full interaction chain — ensure parent containers stay open during child interactions, form submission still works, and state resets properly.
- Tailwind CSS v4
- shadcn-svelte (`shadcn-svelte@next`) for UI components
- adapter-node (long-lived server process, not serverless)
- Client-side UI state that should survive navigation but doesn't need persistence or shareability (e.g. filter toggles, collapsed sections) uses module-level `.svelte.ts` stores with `$state` runes. URL search params are reserved for state that should be bookmarkable or shareable (e.g. pagination page number).

## Data

- Postgres + Drizzle ORM
- `postgres` driver (Porsager)
- UUIDs for primary keys
- Timestamps stored in UTC
- Single polymorphic external-integration table (when needed) with JSONB credentials (provider column + credentials jsonb)
- Soft delete (`deleted_at` timestamp) on tenant-scoped tables. New queries against soft-deletable tenant tables should use the helpers in `$lib/server/db/queries.ts` (predicate form `activeXPredicate(orgId)` or query-builder form `activeXForOrg(orgId)`) to guarantee the `orgId + isNull(deletedAt)` base filter is applied. Inline `and(eq(...orgId), isNull(...deletedAt))` is acceptable only when additional predicates prevent using the helpers.
- Zod for runtime validation of JSONB shapes
- LLM output validation at write boundaries: every write that derives typed data from an LLM-influenced source must `safeParse` the final shape against the authoritative schema before persisting — don't trust the schema passed to `generateObject` alone (it can be looser to satisfy provider constraints).
- Markdown rendering (when needed): `marked` for parsing. Sanitize via `sanitize-html` only on routes that render externally-sourced content; first-party authenticated content can render unsanitized. *Both deps are opt-in — install when first needed.*

## Auth

- Auth.js (`@auth/sveltekit`) with Drizzle adapter (`@auth/drizzle-adapter`)
- Database sessions (adapter default)
- Sign-in providers are conditionally registered based on env vars — only those with configured credentials are available. Template ships with Google OAuth, Microsoft Entra ID, GitHub OAuth, and Resend email magic links wired in.
- Session callback injects `user.id` into session object
- Auth.js tables (`user`, `account`, `session`, `verificationToken`) use UUID for user IDs
- `memberships` join table links users to organizations with a `role` column
- Roles are defined in `$lib/permissions.ts`. Route-level guards in the dashboard layout redirect unauthorized users; action-level guards on form actions return 403.
- Self-service signup: any authenticated user without an org is shown a "Create your organization" form on the onboard page. One org per user enforced by unique constraint on `memberships.userId`.
- Email-based team invites. Admin enters recipient email + role → server generates a crypto-random 32-byte token, stores it on the `invites` row alongside the email + role, and sends a transactional email via Resend (`$lib/server/services/email.ts → sendInviteEmail`). Invite URL format: `${APP_URL}/invite/${token}` (falls back to `event.url.origin` if `APP_URL` is unset). Invites expire after 7 days. Lifecycle: `pending` → `accepted` | `expired` | `revoked`. Revoke is soft (`invites.revoked_at`) so the recipient sees a dedicated "revoked" page. Resend rotates `token` + `expires_at` and clears `revoked_at` on the same row. `super_admin` cannot be assigned via invite.
- Route protection via `hooks.server.ts` — unauthenticated requests redirect to `/login`
- Authenticated route handlers (server `load`, form actions, `+server.ts` endpoints) resolve the current org via `resolveOrg` / `resolveOrgWithRole` / `resolveSessionUser` in `$lib/server/resolve-org.ts`. Do not inline the session → membership → org lookup — both for consistency and because the helper's redirect semantics (`/login` when unauth, `/onboard` when no membership) are load-bearing.
- Webhook endpoints (`/api/webhooks/*`) are exempt from auth
- Public API endpoints (`/api/v1/*`) are exempt from session auth — they use API key auth instead
- API key auth: SHA-256 hashed keys stored in `api_keys` table. Raw key shown once at creation. Clients send `Authorization: Bearer <key>`. Org-scoped — each key belongs to one org.
- Superuser impersonation: CLI script creates a time-limited session (token + scrypt-hashed password). Visiting the URL and entering the password creates a real Auth.js session as the target user — full read/write access, no special handling needed. Browser close triggers `sendBeacon` to set `expires_at = now()` for tight audit windows.

## Integrations

> ⚠️ **Template placeholder.** Add per-integration decisions here as you wire them up: OAuth flow choice (auth code grant vs. installation tokens), token storage (per-org), webhook signing requirements, scopes. The template ships only with email (Resend) — record the rest as they're added.

- Webhooks over polling — we react, we don't poll
- Reverse proxy support: `forwardedProtoHandle` hook rewrites `event.url` and `event.request` to HTTPS when `x-forwarded-proto: https` header is present (needed for ngrok and production reverse proxies)
- OAuth state parameter: HMAC-signed JSON payload using `AUTH_SECRET` (stateless, no cookies or DB storage)

## AI

> ⚠️ **Opt-in.** The template does not install LLM dependencies. If your product uses Claude, add `ai` and `@ai-sdk/anthropic` to `app/package.json` and adopt the rulings below. If not, delete this whole section.

- Vercel AI SDK (`ai` + `@ai-sdk/anthropic`)
- Claude Sonnet 4.6 as default model; Claude Haiku 4.5 for cheap pre-filters and triage gates
- Always use structured generation (`generateObject` with Zod schema) when LLM output must match a schema.
- Structured output pitfalls (Zod v4 + Anthropic): `z.record(z.string(), ...)` generates `propertyNames` in JSON Schema, which the Anthropic API rejects — use `z.any()` or `z.object({}).passthrough()`. `z.number().int().min().max()` generates `minimum`/`maximum` on integer types, which Anthropic also rejects — use plain `z.number()` and clamp/round after `generateObject()` returns.
- Apply canonical validators at every write site that lands LLM output in a typed JSONB column. The system prompt describing the schema is a hint to the model, not a contract. Enums, required-field sets, and value ranges must be enforced by the caller.

## Background processing

- pg-boss (Postgres-backed durable queue). Jobs persist across crashes, retry with exponential backoff (4 attempts: immediate, then 30s, 60s, 120s), dead letter for permanently failed jobs.
- Webhook handlers return 200 immediately, processing happens via durable queue
- pg-boss auto-manages its own `pgboss` schema — no Drizzle migration needed.

## Development

- Colima + Docker for local Postgres
- Database: `postgresql://postgres:postgres@localhost:5432/app`

## Deployment

- VPS with Docker Compose. Three containers: app, postgres, nginx. SSL via nginx's native ACME module (`ngx_http_acme_module.so`, pre-installed in nginx:1.29.5+) — no certbot, no sidecar, no manual cert renewal.
- GitHub Actions CI/CD: build Docker image, push to GitHub Container Registry (ghcr.io), SSH to VPS to pull and restart.
- Structured JSON logging via pino.
- Offsite backups via rsync to local machine (launchd daily schedule).
- Request correlation: every request gets a UUID (`event.locals.requestId`) and a pino child logger (`event.locals.logger`) with the request ID bound. Request logs include `userId` when authenticated. Background jobs receive the originating `requestId` in their payload and create a child logger with `{ jobId, requestId, orgId }`. Response headers include `x-request-id` for client-side correlation.
