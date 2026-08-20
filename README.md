# saas_tmplt

A SaaS starter for projects built with [Claude Code](https://www.anthropic.com/claude-code) agents end-to-end.

It's two things bundled together:

1. **A working SvelteKit + Postgres + Drizzle skeleton** with auth, multi-tenancy (orgs / memberships / invites / api-keys / impersonation), a dashboard shell, and production deploy scaffolding (Docker, nginx-ACME, Hetzner Terraform, GitHub Actions canary deploy, daily backups).
2. **An opinionated agent workflow** — `CLAUDE.md`, `AGENTS/` (DNA guardrails, invariants, environment notes, scheduled-jobs registry, mistake/deferred/verification ledgers), and a cold adversarial-review subagent — designed so an agent can take a feature from "describe it" to "merged, deployed, verified" with minimal hand-holding.

## Use it

```bash
git clone <this-repo> my-new-saas
cd my-new-saas
rm -rf .git && git init           # start fresh
```

Then start an agent in the new repo and tell it:

> Read `TEMPLATE.md` and bootstrap this project named **`my-new-saas`** for **<one-sentence product description>**. Issue tracker: **<your tracker>**. The human is **<2-sentence profile>**.

The agent will fill in placeholders, set up env vars, walk you through provider config, and you'll be running locally within minutes.

See [`TEMPLATE.md`](TEMPLATE.md) for the full bootstrap checklist and [`CLAUDE.md`](CLAUDE.md) for what the agent workflow actually does once you're up.

## What's inside

```
.claude/             # /cleanse command + adversarial-reviewer subagent (other skills you author per-project)
AGENTS/              # Agent guardrails
  CLAUDE.md          # (at repo root) — the master contract
  DNA/               # Architectural rulings: PRODUCT, ARCHITECTURE, DECISIONS, INVARIANTS, DESIGN, UI_SPEC, DEVELOPMENT, DEVELOPMENT_SETUP
  HUMAN_TODO.md      # Things only the human can do (third-party signups, etc.)
  DEFERRED.md        # Tech-debt ledger with explicit triggers
  POST_MERGE_VERIFICATION.md   # Programmatic checks queued for after deploy
  AGENT_MISTAKES.md  # Self-test failure log used by /cleanse for systemic fixes
  ENVIRONMENT_NOTES.md         # Environment traps + shared-resource facts (record-keeping, not DNA)
  SCHEDULED_JOBS.md  # Registry of recurring jobs, each with an absence-alarm
  SPECS/             # Design-mock workflow (mocks are the spec an agent implements from)
app/                 # The SvelteKit app
  src/               # Auth, dashboard shell, settings, API key management
  drizzle/           # 0000_init.sql — auth + multi-tenancy
  scripts/           # CLI: create-org, create-super-admin, impersonate, migrate-sync
nginx/               # nginx with native ACME (no certbot)
terraform/           # Hetzner Cloud provisioning
scripts/             # deploy.sh (zero-downtime canary), sync-backups.sh
.github/workflows/   # Build → push to GHCR → SSH deploy
docker-compose.yml         # Local dev Postgres
docker-compose.prod.yml    # Production stack
```
