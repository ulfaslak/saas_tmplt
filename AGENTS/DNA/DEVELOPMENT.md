# Development

How to run, test, and ship this project. For one-time provisioning (Terraform, GitHub Actions, OAuth registrations) see [[DEVELOPMENT_SETUP]].

## Prerequisites

- Node.js 20+
- pnpm
- Colima (`brew install colima`)
- Docker CLI (`brew install docker`)
- Docker Compose plugin (`brew install docker-compose`)
- ngrok (`brew install ngrok`) — only needed if you wire up integrations that require public webhooks/OAuth callbacks during local dev

## Local Postgres

Start Colima and the database:

```bash
colima start
docker-compose up -d
```

The database is available at `postgresql://postgres:postgres@localhost:5432/app`.

Stop:

```bash
docker-compose down
```

Wipe data and start fresh:

```bash
docker-compose down -v
docker-compose up -d
```

When resetting the database, always use these Docker commands first, then re-apply migrations with `cd app && pnpm drizzle-kit migrate`. There is no `pnpm migrate` shortcut — the correct command is `pnpm drizzle-kit migrate`.

## Environment variables

Copy the example and fill in your keys:

```bash
cp .env.example .env
```

The `.env` file lives at the repo root. Vite (SvelteKit) reads it via `envDir: '..'` in `app/vite.config.ts`. Drizzle-kit reads it via dotenv configured in `app/drizzle.config.ts`.

Required for any deploy:

- `DATABASE_URL` — Postgres connection string (default: `postgresql://postgres:postgres@localhost:5432/app`)
- `AUTH_SECRET` — random string, minimum 32 characters. Generate with `openssl rand -hex 32`.
- `AUTH_TRUST_HOST` — set to `true` for non-Vercel deployments (including local dev).
- `APP_URL` (optional) — Public URL of the app, used to generate links in emails. Example: `https://abc123.ngrok-free.app`. If unset, links fall back to `event.url.origin`.

Required only for the providers/integrations you actually use (the app conditionally registers each based on whether the env vars are set):

- `ANTHROPIC_API_KEY` — only if you use the Anthropic SDK
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — Google OAuth login
- `AUTH_MICROSOFT_ENTRA_ID_ID` / `AUTH_MICROSOFT_ENTRA_ID_SECRET` — Microsoft Entra ID OAuth login
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — GitHub OAuth login (separate from any GitHub App used for product integrations)
- `AUTH_RESEND_KEY` — Resend API key (for email magic link sign-in and invite emails)

> ⚠️ **Template placeholder.** Add per-integration env vars here as you wire them up (Stripe, GitHub Apps, Linear OAuth, etc.). For each, document where to obtain the value and link to the relevant DEVELOPMENT_SETUP section.

## Drizzle (database schema)

### Writing a migration

**Do not run `drizzle-kit generate` in a worktree.** Worktrees start with no migration history, so Drizzle produces a full schema dump numbered `0000` instead of an incremental migration. When merged to main, this collides with the real `0000` migration and Drizzle silently skips it, leaving tables uncreated.

Write the migration SQL by hand instead:

1. Check the highest-numbered migration file on main (e.g. `0007_api_keys.sql`).
2. Create the next file in sequence (e.g. `0008_your_feature.sql`).
3. Write only the `CREATE TABLE`, `ALTER TABLE`, etc. statements for your new schema changes. Use `IF NOT EXISTS` / `IF EXISTS` so the migration is idempotent - it may run against an environment where it was already applied by hand.
4. Do not include existing tables that already have migrations on main.
5. **Add a matching entry to `app/drizzle/meta/_journal.json`** - this step is NOT optional. Append to `entries`: bump `idx` by 1, set `"tag"` to the filename without `.sql`, `"version": "7"`, a monotonically-increasing `"when"`, and `"breakpoints": true`. After adding the entry, validate the file is valid JSON.

**Why the journal entry is mandatory:** prod applies migrations with `drizzle-kit migrate`, which is journal-based and runs ONLY journaled migrations. A `.sql` file with no journal entry passes local self-testing with anything that globs `*.sql` (like `migrate:sync`), then is **silently skipped on prod** - so the first query touching the new column 500s every request.

### Applying migrations

Apply migrations:

```bash
cd app && pnpm drizzle-kit migrate
```

### Migration journal sync

Drizzle tracks applied migrations by content hash in `drizzle.__drizzle_migrations`. If a migration was applied outside the normal flow (e.g. by a worktree agent that ran `drizzle-kit generate`, or by manually running SQL), the journal can get out of sync with the files on disk. When this happens, `drizzle-kit migrate` reports success but silently skips new migrations.

Symptoms: `drizzle-kit migrate` says "applied successfully" but new columns/tables don't exist. Queries fail with "column does not exist" errors.

Fix: sync the journal so it has an entry for every migration file:

```bash
cd app && pnpm migrate:sync
```

This compares file hashes against journal entries and inserts any missing ones. Safe to run at any time — it's a no-op when already in sync.

Explore the database in a browser UI:

```bash
cd app && pnpm drizzle-kit studio
```

## Testing integrations with ngrok

If your product receives webhooks or runs OAuth callbacks, you'll need a public URL during local dev:

1. Start the SvelteKit dev server:

```bash
cd app && pnpm dev
```

2. In a separate terminal, start an ngrok tunnel:

```bash
ngrok http 5173
```

3. ngrok gives you a public URL like `https://abc123.ngrok-free.app`. Update each provider's webhook/redirect URLs to point at the new ngrok URL (the URL changes whenever ngrok restarts unless you have a paid plan with a stable subdomain).

## Testing

### Testing ideology

All code in this project is written by agents; the human reviews PRs but doesn't run the code manually. Tests therefore serve as the **primary regression safety net** — they must be high-signal and low-maintenance.

**Integration tests are the backbone.** They exercise real DB, real service logic, and real route handlers, catching the bugs that actually ship. Prefer integration tests for:
- Services that read/write the DB
- API routes and webhook handlers
- Multi-step workflows

**Unit tests earn their keep when:**
- The logic is pure computation (schema validation, prompt assembly, URL parsing)
- The function has complex branching that would be tedious to cover via integration tests
- You need to test error/edge cases that are hard to trigger through the full stack

**Don't test:**
- Simple CRUD wrappers that just call Drizzle with no business logic — the integration tests for the service that *uses* them cover this
- Framework glue (SvelteKit load functions that just forward to a service call)
- Things the type system already guarantees (e.g. that a required Zod field rejects `undefined`)

**Redundancy rule:** A unit test that mocks the DB and asserts the same behavior an integration test already covers with a real DB is dead weight. It costs maintenance on every refactor and catches nothing the integration test wouldn't. Remove it.

**Pragmatic coverage, not exhaustive coverage.** Don't aim for a coverage number. Aim for: "if an agent breaks this service in a future PR, will a test catch it before merge?" If yes, the coverage is sufficient.

### Unit tests

Unit tests (`*.test.ts`) use mocked dependencies and run fast without external services:

```bash
cd app && pnpm vitest run
```

### Integration tests

Integration tests (`*.integration.test.ts`) run against a real Postgres database (`app_test`). They verify the full flow through services, DB operations, and API endpoints — the mocks are limited to LLM calls (`ai` module), external APIs, and the logger.

```bash
cd app && pnpm test:integration
```

**Prerequisites:** Postgres must be running locally (via `docker-compose up -d`). The test setup automatically creates the `app_test` database and pushes the current schema.

**When to run:** Always run both suites before declaring work done. Integration tests are especially important when touching DB operations, services, webhook handlers, or API endpoints.

### Writing integration tests

Integration test files are colocated with the code they test, named `*.integration.test.ts`. They are excluded from `pnpm vitest run` (unit-only) and included only by `pnpm test:integration`.

Every integration test file needs the same mock block at the top:

```ts
vi.mock('$env/dynamic/private', () => ({
  env: {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/app_test',
    // ... other env vars as needed
  }
}));
vi.mock('$lib/server/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));
```

This mock block makes the real `$lib/server/db` module connect to the `app_test` database instead of the app's database. If your project pulls in the AI SDK, add `vi.mock('ai', ...)` to the block.

**Shared utilities** (`$lib/server/test-utils.ts`):
- `truncateAll(db)` — clears all tables between tests (use in `beforeEach`)
- Factory functions: `createTestOrg`, `createTestUser`, `createTestApiKey`, etc. — insert minimal valid rows, accept overrides
- `TEST_DB_URL` — the connection string constant

**Key patterns:**
- Import `db` from `$lib/server/db` — it connects to `app_test` thanks to the env mock
- For webhook handlers that enqueue work via `$lib/server/queue`, mock `getBoss().send()` to capture the promises and await them in tests (queue writes are fire-and-forget)
- Tests run sequentially (`fileParallelism: false`) since they share the same database

## Local staging environment

> ⚠️ **Template placeholder.** Not yet wired up. The expected pattern is a `docker-compose.staging.yml` at the repo root that spins up a separate Postgres on port 5433, restores the latest backup from `~/<APP_NAME>-backups/`, runs migrations, and starts the app on `http://localhost:3001` with `NODE_ENV=production`. Add it (plus `pnpm staging:{up,down,reset}` scripts in `app/package.json`) once you have backups syncing locally.

## Production deployment

Production runs on a VPS provisioned with Terraform. The stack is three containers (app, postgres, nginx) plus a backup sidecar, managed by `docker-compose.prod.yml`. SSL is handled automatically by nginx's native ACME module — no certbot, no manual cert renewal.

**Deployment is automatic via GitHub Actions.** On every push to `main`, CI builds the Docker image, pushes to GHCR, then SSHes into the VPS to pull and restart. You do not need to deploy manually — only run migrations if needed and verify.

### VPS access

> ⚠️ **Template placeholder.** Replace with your actual SSH key path, deploy user, and host.

```bash
ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP>
```

The app lives at `<APP_DIR>` on the VPS. All `docker compose` commands should be run from there with `-f docker-compose.prod.yml`.

The day-to-day command set - migrations, logs, restarts, raw SQL, manual deploy - is in [Operating prod](#operating-prod) below.

### Creating organizations

If access is invite-only, use the CLI script to create orgs and generate invite links.

**Locally:**

```bash
cd app && pnpm create-org "Acme Corp" admin@example.com
```

**On the VPS:**

```bash
ssh <DEPLOY_USER>@<HOST_IP>
cd <APP_DIR>
docker compose -f docker-compose.prod.yml exec app npx tsx scripts/create-org.ts "Acme Corp" admin@example.com
```

Both take the admin's email as the second argument and print the org ID plus an invite URL (expires in 7 days). The CLI does not send the email — copy the URL and share it manually.

### Backups

The `backup` service in `docker-compose.prod.yml` runs `pg_dump` daily, writing compressed dumps to `./backups/` on the VPS. Dumps older than 30 days are auto-deleted.

To restore from a backup:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U <DB_USER> -d <DB_NAME> --clean --if-exists --no-owner < backups/dump_YYYYMMDD.dump
```

### Deployment knowledge

Operational learnings worth remembering — follow these to avoid rediscovering issues.

- **nginx ACME module**: `ngx_http_acme_module.so` is pre-installed in nginx:1.29.5+ via the `nginx-module-acme` package. No custom Docker build needed. The `resolver` directive must use `ipv6=off` in Docker environments (Docker's internal DNS doesn't support IPv6 resolution).
- **drizzle.config.ts**: Uses `try { require('dotenv')... } catch {}` so it works both locally (dotenv loads `.env`) and in production (env vars set by Docker, dotenv not installed).
- **drizzle-kit in prod Dockerfile**: `drizzle-kit` is included as a dependency in the production Docker image so that `npx drizzle-kit migrate` can run on the VPS after deploy.
- **Private repo cloning**: Cloud-init `git clone` fails for private repos because there's no SSH key at provision time. Generate a deploy key on the VPS post-provision and add it to the GitHub repo manually.
- **GHCR auth**: The deploy user needs `docker login ghcr.io` before the first image pull. Use a GitHub PAT with `read:packages` scope.
- **Auth.js trustHost**: `trustHost: true` must be set explicitly in the SvelteKit auth config (`src/auth.ts`). The `AUTH_TRUST_HOST` env var alone is not sufficient when running behind a reverse proxy.
- **Unattended upgrades**: The `unattended-upgrades` package is installed via cloud-init. Ubuntu automatically applies security patches daily without manual intervention.

## Operating prod

Every recipe below is written as a **one-shot `ssh`** from your own machine rather than as a command to type after logging in, because that is the form an agent can run. For an interactive shell: `ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP>`.

**Run migrations.** The deploy does not run them, so do this after any deploy that ships new `app/drizzle/*.sql` files:

```bash
ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> \
  "docker compose -f <APP_DIR>/docker-compose.prod.yml exec -T app npx drizzle-kit migrate"
```

**Verify a migration actually applied.** Query the schema directly. `drizzle-kit migrate` prints success and silently skips migrations when its journal is out of sync (see "Migration journal sync" above), so its own output is never evidence.

```bash
ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> \
  "docker compose -f <APP_DIR>/docker-compose.prod.yml exec -T postgres psql -U <DB_USER> -c \
   \"SELECT column_name FROM information_schema.columns WHERE table_name = '...' AND column_name = '...';\""
```

**Apply raw SQL** - the fix when drizzle skipped a migration. Paste the statements from the migration file.

```bash
ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> \
  "docker compose -f <APP_DIR>/docker-compose.prod.yml exec -T postgres psql -U <DB_USER>" <<'SQL'
ALTER TABLE ...;
SQL
```

**Tail logs.** Bound the output with `--tail`; do not add `-f` to a one-shot `ssh`, because it follows forever and hangs a non-interactive caller.

```bash
ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> \
  "docker compose -f <APP_DIR>/docker-compose.prod.yml logs --tail=80 app"
```

Prod logs are structured JSON (pino), so `jq` filters them. Level 40 and above is warnings and errors:

```bash
ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> \
  "docker compose -f <APP_DIR>/docker-compose.prod.yml logs --tail=500 app" | jq 'select(.level >= 40)'
```

**Restart the app** - needed after editing `.env.production`. Use `--no-deps --force-recreate`: a plain `up -d` can decide the existing container is already up to date and leave it running with the old environment, which looks like the env change had no effect.

```bash
ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> \
  "docker compose -f <APP_DIR>/docker-compose.prod.yml up -d --no-deps --force-recreate app"
```

**Manual deploy** - only if CI/CD fails:

```bash
ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> \
  "cd <APP_DIR> && git pull && docker compose -f docker-compose.prod.yml pull app && docker compose -f docker-compose.prod.yml up -d app"
```
