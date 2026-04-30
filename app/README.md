# app

The SvelteKit application. Lives in `app/` so the repo root can hold infra (Dockerfile, terraform, nginx, scripts), env files (`.env*`), and the agent guardrails (`AGENTS/`, `CLAUDE.md`).

## Quick start

```sh
pnpm install                            # from this directory
pnpm dev                                 # http://localhost:5173
```

Postgres is expected at `postgresql://postgres:postgres@localhost:5432/app`. The repo root has a `docker-compose.yml` that brings it up:

```sh
cd .. && docker compose up -d postgres && cd app
pnpm drizzle-kit migrate
```

For broader docs on env vars, integrations, testing, and deployment, see `../AGENTS/DNA/DEVELOPMENT.md`.
