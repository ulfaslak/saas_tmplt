# SaaS template — bootstrap guide

This repo is a **starting point**, not a finished app. It bundles:

- A SvelteKit + TypeScript + Tailwind v4 + shadcn-svelte skeleton with Auth.js (4 providers), Drizzle, Postgres, pg-boss, pino, Resend.
- A multi-tenancy baseline: `organizations`, `memberships`, `invites`, `api_keys`, `impersonation_sessions`. Working sign-up, invite-flow, team-settings, API-key management, and a basic dashboard shell.
- Production deployment scaffolding: Dockerfile, `docker-compose.prod.yml`, nginx with native ACME, Hetzner Terraform, GitHub Actions CI/CD with zero-downtime canary deploy, daily pg_dump + offsite rsync.
- **The agent workflow.** `CLAUDE.md`, `AGENTS/DNA/`, `.claude/commands/` (the `/issue`, `/cleanse`, `/sweep`, `/stage`, `/ship`, `/redeploy`, `/reset`, `/impersonate`, `/review`, `/userstats` skills) — the whole rig that lets you hand a feature to an agent and have it run worktree → PR → self-test → fix-learn → merge → verify on its own.

## Bootstrapping a new project from this template

The fastest path is to give an agent in your new project this prompt verbatim:

> Read `TEMPLATE.md` and bootstrap this repo into a project named **`<APP_NAME>`** for the domain **`<DOMAIN>`**. The product is **<one-sentence description>**. The human is **<2-sentence profile>**. Issue tracker: **<Linear / GitHub Issues / Jira details>**. Once you've filled in the placeholders below, delete `TEMPLATE.md` and confirm.

The agent will then walk through the rest of this file mechanically.

### Step 1 — Replace placeholders

Run a project-wide search for each of the following tokens and replace with your value:

| Placeholder | Where it appears | Replace with |
|---|---|---|
| `<APP_NAME>` | terraform vars, scripts, docker, .claude/commands, CLAUDE.md | Lowercase project name (e.g. `acme`). Used for resource names. |
| `<DOMAIN>` | nginx/nginx.conf, .claude/commands, CLAUDE.md | Production domain (e.g. `app.acme.com`) |
| `<HOST_IP>` | CLAUDE.md, .claude/commands | VPS IP from Terraform output (fill in once provisioned) |
| `<DEPLOY_USER>` | CLAUDE.md, .claude/commands, scripts | Usually `deploy` |
| `<SSH_KEY_PATH>` | CLAUDE.md, .claude/commands, scripts | Local path to the SSH key used for VPS access (e.g. `~/.ssh/<APP_NAME>_deploy`) |
| `<APP_DIR>` | CLAUDE.md, .claude/commands, scripts | Path on the VPS where the repo lives, usually `~/<APP_NAME>` |
| `<DB_USER>` / `<DB_NAME>` | CLAUDE.md, .claude/commands | Postgres user/db (set in `.env.production`) |
| `<GITHUB_OWNER>/<REPO>` | docker-compose.prod.yml, .claude/commands/redeploy.md | GitHub repo path, used for GHCR image |
| `<ACME_EMAIL>` | nginx/nginx.conf | Email Let's Encrypt should contact about cert issues |

There are also `> ⚠️ **Template placeholder.**` admonitions in:

- `CLAUDE.md` — `# About`, `# Knowledge base`, `## About the human`, `### Production operations`
- `AGENTS/DNA/PRODUCT.md` — every section
- `AGENTS/DNA/DESIGN.md` — every section
- `AGENTS/DNA/UI_SPEC.md` — Badge conventions
- `AGENTS/DNA/DEVELOPMENT.md` — backup path
- `AGENTS/DNA/DEVELOPMENT_SETUP.md` — provider-setup details
- `AGENTS/DNA/ARCHITECTURE.md`, `AGENTS/DNA/DECISIONS.md` — sections that describe stack choices the template baked in (review and confirm or change)
- `.claude/commands/{issue,ship,stage,redeploy,impersonate}.md` — placeholder ssh/db details

Read each, fill in the project-specific values, then delete the admonition.

### Step 2 — Wire the issue tracker

In `AGENTS/DNA/PRODUCT.md` §3, pick Linear / GitHub Issues / Jira and document the workspace, team/project, and ticket prefix. Update `.claude/commands/issue.md` and `ship.md` if you're using something other than Linear MCP — the *workflow* shape is the same; only the tool calls change.

If you're using Linear: install the Linear plugin (`enabledPlugins` in `.claude/settings.json` already lists it), authenticate, and confirm `mcp__linear__list_issues` returns results.

### Step 3 — Stack confirmation

The template ships with strong opinions in `AGENTS/DNA/DECISIONS.md` about framework, data, auth, integrations, AI usage, background processing, and deployment. Read every line of that file. For each decision:

- **Keep** if it fits the project.
- **Replace** if you're going a different direction (e.g. swap MySQL for Postgres, drop email magic links, …).
- **Remove** the AI section entirely if your product won't use LLMs. (The AI SDK is *not* installed by default — `app/package.json` is clean. If you do want LLMs, run `pnpm add ai @ai-sdk/anthropic` and re-enable the section.)

These are the rules every agent enforces; if any are wrong, fix them before writing code.

### Step 4 — Local environment

```bash
cp .env.example .env
cd app && pnpm install                # generates pnpm-lock.yaml — commit it
cd .. && docker compose up -d postgres
cd app && pnpm drizzle-kit migrate
pnpm dev                              # http://localhost:5173
```

> **Commit the lockfile.** The first `pnpm install` produces `app/pnpm-lock.yaml`. Commit it before running `docker build` or pushing to CI — both use `--frozen-lockfile`.

You should be able to:
1. Sign in with email magic link (after setting `AUTH_RESEND_KEY`) or Google/GitHub/Microsoft (after setting their respective env vars).
2. Land on `/onboard`, create an org, and see the dashboard shell.
3. Visit `/settings/team` and create an invite.
4. Visit `/connections/api` and create an API key.

If any of the above fail, **stop and fix before continuing** — these are the foundations everything else builds on.

### Step 5 — Provider setup (only what you need)

`AGENTS/DNA/DEVELOPMENT_SETUP.md` walks through Google OAuth, Microsoft Entra ID, GitHub OAuth, and Resend. Configure only the providers you want available. The login page renders only those whose env vars are set.

### Step 6 — First production deploy

1. Provision the VPS: `cd terraform && cp terraform.tfvars.example terraform.tfvars && terraform apply`. Note the `server_ip` output.
2. Set the GitHub repo's `APP_NAME` variable (Settings > Variables > Actions, name `APP_NAME`).
3. Add GitHub repo secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (the deploy private key).
4. Follow `AGENTS/DNA/DEVELOPMENT_SETUP.md` for DNS, GHCR auth, and the first manual deploy.
5. Push to `main`. Watch GitHub Actions complete the canary deploy.

After the first successful deploy, fill in `<HOST_IP>` everywhere it still appears.

### Step 7 — Delete this file

Once placeholders are gone and you've shipped a first deploy, `git rm TEMPLATE.md` and remove the line referencing it at the top of `CLAUDE.md`. The agent workflow takes over from here.

---

## What the agent workflow gives you (and how to use it)

After bootstrap, the daily loop is:

1. You describe a feature or fix to the agent in chat.
2. The agent runs `/issue`: brainstorms, creates an issue in your tracker (status In Progress with a short Goal), iterates on a full spec with you, then updates the issue.
3. The agent dispatches a subagent in a worktree to implement, opens a PR, runs `pnpm check` + unit + integration tests.
4. The subagent self-tests via `/stage` (Playwright, with a production DB snapshot) and pushes fix commits as it finds bugs.
5. After you say "merge", `/ship` merges the PR, runs migrations on prod, verifies endpoints, and clears `POST_MERGE_VERIFICATION` entries whose triggers have fired.
6. Mistakes found during self-test land in `AGENTS/AGENT_MISTAKES.md`. `/cleanse` periodically reviews the log and looks for systemic fixes.

`CLAUDE.md` is the contract that wires this together. Read it once start-to-finish before your first agent run; thereafter the agent will read it itself.

## What this template deliberately does NOT include

- A landing page or marketing site (those were lawcel-specific; add `app/src/routes/(marketing)/` when you need one).
- Webhook endpoints, third-party integrations, or LLM pipelines (only the framework — pg-boss queue, prompt loaders, etc. — was kept where useful; concrete integrations are product work).
- A pricing/billing surface (Stripe wiring is not in scope; add when you're ready).
- Public document hosting or embed widgets.

If you need any of these, build them as features — don't drag them in from the original repo, or you'll re-import lawcel-shaped assumptions.
