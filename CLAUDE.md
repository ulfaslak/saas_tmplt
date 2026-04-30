# About

> ⚠️ **Template placeholder.** Replace this block with a 1–3 sentence description of the project: what it is, who it's for, and where it lives. Be concrete — the description anchors every later decision.
>
> Example: *"This project implements an AI compliance platform that monitors product updates (GitHub PRs, Linear tickets) and analyzes whether they impact legal documents. It is implemented as a single SvelteKit app (in `app/`), deployed to a VPS via Docker Compose. There is no separate backend."*

This project was bootstrapped from [`saas_tmplt`](https://github.com/ulfaslak/saas_tmplt) — see [TEMPLATE.md](TEMPLATE.md) for the full bootstrap checklist before deleting that file.

# Knowledge base

If this project has a sibling repo (or directory) with non-code context — meeting transcripts, decisions, CRM notes, playbooks, team info — name it here so future agents look there first when the human references "what we discussed in the call" or "the decision from last week." This is read-only context; agents should never modify files in that repo.

> ⚠️ **Template placeholder.** If you have no knowledge base, delete this section entirely.

# DNA: architectural guardrails

`AGENTS/DNA/` contains the project's architectural guardrails — what the project *is*, its decisions, structure, and interface contracts. The DNA grows as the project does, but must never drift from the code. It evolves but doesn't change. Contributions that violate DNA cause cancer and must be avoided.

1. Don't violate DNA.
2. Grow DNA — when your work adds new structure, record it.
3. Don't let it drift — if something in DNA/ no longer matches the code, fix it. If it's unclear whether DNA or code should change, think deeply and resolve it only if you are certain, otherwise ask the human.
4. Do not take DNA changes lightly. If you make changes, you must have applied deep reasoning before doing so. Err on the side of asking the human before changing an existing DNA item.

## Reading DNA files

Read the DNA files relevant to your task — not all of them. All files are in `AGENTS/DNA/`.

| Task type | Read these files |
|---|---|
| Any implementation work | [[DECISIONS]], [[ARCHITECTURE]] |
| UI / frontend changes | + [[UI_SPEC]], [[DESIGN]] |
| DB schema, migrations, writing tests | + [[DEVELOPMENT]] |
| Production deploy / ops | [[DEVELOPMENT]] |
| Product scope or feature questions | [[PRODUCT]] |
| Infra provisioning, CI/CD, disaster recovery | [[DEVELOPMENT_SETUP]] |
| Broad or unclear scope | All DNA files |

## Before starting work

- **Issue tracker**: query the project's issue tracker (Linear, Jira, GitHub Issues, etc.) to see what's in progress and planned. For any issue In Progress or In Review, fetch it to understand current state. The tracker is the single source of truth — query it via MCP/CLI rather than maintaining a local index. *(Configure the tracker in your project — see [[PRODUCT]] §"Issue tracker".)*
- **HUMAN_TODO**: check [[HUMAN_TODO]] for pending manual tasks. Remove completed ones; add new ones if your work creates manual follow-ups. Only tasks requiring human action belong here (e.g. third-party signups, OAuth configuration). Production deploys, migrations, and server operations are **not** human tasks — do them yourself via SSH.
- **POST_MERGE_VERIFICATION**: check [[POST_MERGE_VERIFICATION]] for queued verification steps. If any entry's trigger has fired (especially for areas near your current work), run it and clear it. When investigating a bug, this list is also the first place to look — the root cause may be a recently-merged change that hasn't been verified against real traffic yet.

For narrow tasks (e.g. a single CSS fix), use judgment — a quick tracker scan may suffice over full context loading.

**No size exceptions.** Every code change — even a one-line CSS fix — follows the same worktree → PR → test → learn cycle as a multi-file feature. Edits directly to main are forbidden unless explicitly requested by the human.

- **Always work in a worktree.** All implementation work — whether you are the main agent or a subagent — must happen in a git worktree branched from `origin/main`. Never implement directly on `main`. The only exception is if the human explicitly tells you to work on `main`. Read-only tasks (research, exploration, answering questions) do not require a worktree.

  **Workflow (using gtr):**
  1. **Before creating:** Run `git gtr list` to see all existing worktrees. Never touch or remove a worktree you didn't create.
  2. **Create:** From the primary clone, run `git gtr new <branch-name>` (example: `git gtr new feat/oauth`). This creates a worktree in a sibling directory (`../<repo>-worktrees/<branch>/`), copies `.env` files, and runs `pnpm install` automatically via `.gtrconfig`.
  3. **Work:** `cd` into the worktree path shown by gtr (or open it as the editor's workspace). All edits, commits, and pushes happen there.
  4. **After merge:** From the primary clone, run `git gtr rm <branch-name>`, then `git checkout main && git pull`. Periodically run `git gtr clean --merged` to sweep stale worktrees.
- **Never remove another agent's worktree.** If `git gtr list` shows worktrees you didn't create, leave them alone. Only remove worktrees you created in this session.
- **Commit early in worktrees.** Always commit working changes before any worktree management operations (remove, rebase, branch switching). Force-removing a worktree destroys uncommitted work with no recovery. Also: if the worktree directory is deleted while it's your cwd, the session becomes permanently stuck — no shell commands will work.

## Issues

Issues move through: **Todo** → **In Progress** → **In Review** → **Done**. For the full issue creation, implementation, and completion workflow, use `/issue`.

### Ticket content: scope vs. implementation

Tickets describe **product requirements** — what the feature does, how it looks and feels, acceptance criteria. They are **not** a place for implementation details (which files to touch, what data structures to use, how to wire it up) unless the author intentionally includes them.

Legitimate reasons to include implementation notes: deferred items where notes help a future agent pick up context, bugs with a known fix, or architectural constraints the author has already thought through. In those cases, flag them explicitly ("Implementation note: ...").

When **writing** a ticket: describe the outcome, not the code path. Leave architectural and implementation decisions to the implementing agent, who has DNA files and current codebase state in context.

When **implementing** from a ticket: treat implementation notes as advisory unless flagged intentional. If they conflict with DNA, existing conventions, or a clearly better approach, raise it with the human rather than silently following.

## Making decisions autonomously

Tickets routinely leave things unspecified — scope boundaries, role permissions, UX details, edge cases not explicitly covered, whether a tangential sub-feature is in scope. When that happens you have two options: ask the human, or decide and surface the decision in the PR.

**Default to deciding, then surfacing.** Decide confidently when the cost of a wrong call is a follow-up PR, not data loss. Ask only when:

- The call is **irreversible** — destructive migrations, published API shapes, emails sent to real users, external-service state that can't be rolled back.
- It affects **non-code stakeholders** — pricing, legal wording, UX direction a PM should own, anything a customer would experience as a policy.
- It's **architectural and cross-cutting** — a decision that compounds across future work, not contained within the ticket.

Within a single contained ticket's product scope, prefer deciding. Round trips are expensive; follow-up PRs are cheap.

**Surface every autonomous decision in the PR body.** Under a `## Decisions taken without asking` section, list each one briefly — what you decided, and why (one line each is enough). This makes the decisions reviewable and leaves the human a clean path to push back. Burying scope calls in commit messages doesn't count.

**The 🤘 signal.** When the human ends a request with 🤘, they're explicitly granting wider latitude — lean harder into your own judgment, decide more, ask less. Still surface every decision in the PR body.

## During work

- **Never push directly to main** (unless explicitly told to). All changes go through a PR. For quick fixes: branch, commit, push, `gh pr create`, merge with `gh pr merge --merge`, then `git checkout main && git pull`.
- **Always create an issue for PRs** unless explicitly told not to. Verify the issue-tracker MCP token is valid first — if expired, warn the human immediately.
- **Include session ID in every PR description.** Before creating a PR, get the current Claude session ID by running:
  ```bash
  basename "$(ls -t ~/.claude/projects/$(pwd | sed 's|/|-|g')/*.jsonl | head -1)" .jsonl
  ```
  Add it as a footer line in the PR body: `Session: <session-id>`. This lets future agents trace back to the conversation that produced the changes and avoid reverting past decisions without context.
- Never contradict a decision in [[DECISIONS]]. If a decision seems wrong, raise it with the human.
- Follow the file structure in [[ARCHITECTURE]]. If no location is specified for a new file, ask.
- Follow UI conventions in [[UI_SPEC]]. When building new pages, read existing routes of similar complexity first — match their patterns.

### Reading files efficiently

**Grep for structure before reading large files.** For any file over ~300 lines, don't read the whole thing. First, run a structural grep to get a table of contents:

```bash
grep -n "^export \|^function \|^class \|^interface \|^type \|^const \|^let \|^async function\|#region\|// ---\|// ===" path/to/file.ts
```

Then read only the sections you need.

### Database migrations in worktrees

**Do not run `drizzle-kit generate` in a worktree.** Worktrees start with no migration history, so Drizzle produces a full schema dump numbered `0000` instead of an incremental migration. When merged to main, this collides with the real `0000` migration and Drizzle silently skips it, leaving tables uncreated.

Instead, write the migration SQL by hand:
1. Check the highest-numbered migration file on main (e.g. `0007_api_keys.sql`).
2. Create the next file in sequence (e.g. `0008_your_feature.sql`).
3. Write only the `CREATE TABLE`, `ALTER TABLE`, etc. statements for your new schema changes.
4. Do not include existing tables that already have migrations on main.

### Production operations

You have full SSH access to the production VPS. **Do not ask the human to run migrations, restart services, or perform other server tasks — do them yourself.**

> ⚠️ **Template placeholder.** Replace `<HOST_IP>`, `<DEPLOY_USER>`, `<SSH_KEY_PATH>`, `<APP_DIR>`, and `<DB_USER>` with your project's actual values. Then delete this admonition.

```bash
# SSH access
ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP>

# All commands on VPS run from <APP_DIR> with -f docker-compose.prod.yml
```

**Deployment is automatic — but only for code changes.** GitHub Actions builds and deploys only when files in `app/`, `nginx/`, `scripts/`, `Dockerfile`, `docker-compose.prod.yml`, or the workflow itself change. Docs-only PRs (e.g. `AGENTS/`, `CLAUDE.md`, `docs/`) do not trigger a deploy.

**To skip deploy on a code PR**, include `[skip deploy]` anywhere in the merge commit message. Use this when merging code changes that don't need immediate deployment (e.g. test-only changes, refactors with no runtime effect). The human may also instruct you to merge without deploying — use `[skip deploy]` in that case.

After merge, your responsibilities are: run migrations (if the change includes new `app/drizzle/*.sql` files) and verify. Don't leave these steps for the human.

Common operations:

- **Run migrations**: `drizzle-kit migrate` reports "applied successfully" even when no migrations ran. **Never trust its output alone.** Always follow this sequence:
  1. Run: `ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> "cd <APP_DIR> && docker compose -f docker-compose.prod.yml exec -T app npx drizzle-kit migrate"`
  2. Verify with a direct SQL check that the expected schema change exists (e.g. `SELECT column_name FROM information_schema.columns WHERE table_name = '...' AND column_name = '...';`)
  3. If the change is missing, apply the raw SQL from the migration file directly via psql.
- **Apply raw SQL**: `ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> "cd <APP_DIR> && docker compose -f docker-compose.prod.yml exec -T postgres psql -U <DB_USER>" <<'SQL' ... SQL`
- **Check logs**: `ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> "cd <APP_DIR> && docker compose -f docker-compose.prod.yml logs --tail=50 app"`
- **Restart app**: `ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> "cd <APP_DIR> && docker compose -f docker-compose.prod.yml up -d app"`
- **Manual deploy** (only if CI/CD fails): `ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> "cd <APP_DIR> && git pull && docker compose -f docker-compose.prod.yml pull app && docker compose -f docker-compose.prod.yml up -d app"`

## After work — the test-fix-learn cycle

**This cycle is non-negotiable for every PR — including one-line fixes.** The first implementation pass should be your best effort — think carefully, handle edge cases, get it right. But no matter how careful you are, some issues only surface under real end-to-end testing. This cycle ensures they're caught before the human ever sees the PR, and that the project learns from each one.

### Phase 1: First pass PR

- Run `cd app && pnpm check`, then both test suites:
  - `cd app && pnpm vitest run` — unit tests (mocked dependencies, fast)
  - `cd app && pnpm test:integration` — integration tests (real Postgres `app_test` DB, requires Docker)
  - If your change touches DB operations, services, API endpoints, or webhook handlers, integration tests matter most. Add integration tests for new services/endpoints following existing `*.integration.test.ts` patterns.
  - **When writing or modifying tests**, read the **Testing ideology** section in [[DEVELOPMENT]] first. It defines what's worth testing, what's redundant, and the project's stance on coverage.
- Update DNA if your changes introduced structural facts not anticipated by the issue's DNA impact section.
- **Update the feature inventory** in [[PRODUCT]] if your change adds, removes, or significantly modifies a user-facing feature.
- Commit, push, and open a PR. The **last commit message** of this phase must include: `[not user-tested]`. This signals that the implementation is complete but hasn't been validated end-to-end yet.
- **PR body structure.** At minimum: `## Summary` and `## Test plan` (checklist). Add `## Decisions taken without asking` if any autonomous scope calls were made (see "Making decisions autonomously") — don't bury them. Add `## Verification` for no-UI changes (see Phase 2). The session ID footer goes last.
- **Screenshots for frontend PRs.** If the PR includes visible UI changes, add before/after screenshots to the PR description. Use Playwright MCP (`browser_take_screenshot`) — screenshots default to `.playwright-mcp/` and can be uploaded to the PR via `gh`. If you save screenshots with an explicit filename (for PR uploads, docs, debugging, anything), put them in `screenshots/` — **never** at the project root. The `screenshots/` directory is gitignored (except `.gitkeep`) so dumps don't clutter the working tree.

### Phase 2: Self-testing (pick the right method; do it without asking)

Not every change benefits from the same verification method. Pick the approach that actually produces signal for what you changed — don't default to a Playwright walk just because it's the previous default. Do not wait for the human to tell you which to use.

**If the change has a UI surface (new routes, new components, visible behaviour changes, styling, interaction flows):**

1. **Stage the app.** Use the `/stage` skill to spin up a local dev server with a production database snapshot.
2. **Test all primary flows.** Use Playwright MCP to walk through every user-facing flow your change touches. Verify the obvious things — pages load, forms submit, data appears correctly, navigation works.
3. **Test non-obvious edge cases.** Before testing, take two minutes to enumerate edge cases on paper — don't just run through the happy path and stop. Walk this taxonomy deliberately:
   - **State machine edges** — every status / role / phase combination your change touches. Not just one happy path and one error. If your feature has N states, exercise all N.
   - **Permission edges** — each role at each boundary (every role in the system, unauthenticated, wrong org, revoked access, expired token).
   - **Empty / boundary states** — no data, one item, many items, max length, null/undefined, missing optional fields, whitespace-only input.
   - **Concurrency and re-entry** — two tabs open, stale state, refresh mid-action, back button, closing the browser and returning, accepting from a different account than invited, duplicate submission.
   - **Adjacent features** — anything that reads or writes the same data your change touches. Does the list still render correctly after you delete? Does the dashboard count still match?
   - **Failure modes** — third-party API down, network flake, malformed webhook payload, invalid data already in the DB.
4. **Fix everything you find.** Each bug gets a fix commit on the same branch. Push as you go.
5. **Tick off the test plan.** As you verify each item in the PR's test plan checklist, update the PR description to check the box (`gh pr edit`).
6. **Stop when confident.** You're done when you can't think of another way to break it.

**Phase 2 routinely takes longer than Phase 1 and produces many fix commits — that's the intended shape, not a sign something went wrong.** A 60-minute, 8-commit Phase 2 on a well-scoped ticket is a good outcome. Fast and wrong is worse than slow and right. Don't rush to report completion.

**If the change has no meaningful UI surface (webhook handlers, background jobs, LLM prompt wording, schema changes with no new fields visible to users, internal refactors, build/ops changes):**

A Playwright walk will produce no useful signal — the behaviour lives below the UI. Skip `/stage`. Instead:

1. Verify the test suite is green — unit + integration. Those are non-negotiable.
2. Read the diff critically one more time, as cold as you can. Pretend you haven't seen it. Does the control flow handle the edge cases integration tests don't cover (live prod data shape, webhook retry, concurrent jobs)?
3. **Queue a post-merge verification entry.** Add a detailed entry to [[POST_MERGE_VERIFICATION]] with trigger, exact commands, success criteria, and failure-diagnosis notes. Write it well enough that a future agent with no context can run it.
4. Acknowledge this in the PR description under a `## Verification` section: "No UI surface — programmatic verification queued in POST_MERGE_VERIFICATION.md (see <ISSUE-ID> entry). Will be run post-deploy."

**If you're genuinely unsure which category the change falls into**, do both: Playwright walk the thinnest surface that interacts with your code, AND queue a post-merge verification. Erring toward more verification is cheap.

### Phase 3: Document mistakes (only if you found any)

Before asking the human to merge:

1. **If self-testing found real bugs you had to fix**, add a `## Mistakes found during self-testing` section to the PR description listing each issue. Be specific — what was wrong, what caused it, how you fixed it. Then append to [[AGENT_MISTAKES]] with the date, issue ID, and a concise description focusing on the *category* of error (e.g. "missed edge case in prompt", "forgot to update related component", "wrong assumption about API behavior"). The goal is to surface patterns that better context or refactors could prevent — not to fill a quota.
2. **If self-testing found nothing**, that's fine. Don't fabricate issues. Just ask the human to review and merge.

### Phase 4: Clean up

- **Leave a clean state.** Kill any dev servers, docker containers, or background processes you started.
- **Offer a terminal command** so the human can start the app and verify your work if they want to.

### Phase 5: Post-merge verification (when the PR merges)

After a PR is merged and GitHub Actions finishes deploying:

1. Open [[POST_MERGE_VERIFICATION]]. Find any entry authored by this PR.
2. For each entry, check whether the **Trigger** condition is satisfied right now (e.g. "immediately after deploy" is satisfied once the action goes green; "next webhook" may not be).
3. If satisfied: run the **Steps** exactly. Compare results against **Success criteria**. If passing, remove the entry. If failing, follow **On failure** and fix forward in a new PR — do NOT remove the entry until the fix is verified.
4. If the trigger is not yet satisfied, leave the entry. Future sessions working in the same area will see it and pick it up.

Additionally, at the start of any session: scan [[POST_MERGE_VERIFICATION]] for entries whose triggers have plausibly fired since they were queued, and clear the backlog where you can.

## Deferred work

[[DEFERRED]] tracks **technical items** that are known but intentionally postponed: tech debt, hardening shortcuts, known limitations, scheduled fixes (e.g. token rotations with a future expiry date), and cleanup tasks that are either cheaper to do later or better bundled with future work. The common theme: *not worth doing now, but we'll need to remember it later.*

**Do NOT put features here.** Product features, UX work, new user-facing capabilities, and anything that belongs in a product roadmap → issue tracker. DEFERRED is not a wishlist or backlog; it's a tech-debt ledger. If you're tempted to add something featureful, create an issue instead.

Each item must include:
- **What**: the work, with enough context to act on it without archaeology.
- **Why deferred**: why it's not worth doing now — the cost/benefit reasoning that justifies postponement.
- **Trigger**: the concrete condition that flips this from "not now" to "do it" (a date, a volume threshold, a dependent feature landing, a specific user report, etc.). "Someday" is not a trigger.

**Keep it clean.** When your work touches an area with deferred items, scan DEFERRED for entries that your change resolved and remove them. When you complete a ticket that supersedes a deferred item, remove the deferred entry in the same PR. History is preserved in git and in the issue that addressed it — DEFERRED should only list what's still actually deferred.

## Guardrail changes

The human is the gatekeeper. To change a guardrail, propose the change explicitly and wait for approval. Edit your implementation to fit the DNA, or get the guardrail changed first.

# Collaborating with the human

## About the human

> ⚠️ **Template placeholder.** Replace this with a 2–3 paragraph profile of the human you're collaborating with: their experience level, language/framework comfort, technical strengths and gaps, communication preferences. The agent uses this to calibrate explanations and trade-off framing. Write it in third person — it's a brief for future agents.
>
> Example:
> *"Experienced frontend developer. Comfortable with SvelteKit, TypeScript, and web platform fundamentals. Using SvelteKit full-stack for the first time — server-side patterns are newer but picked up quickly. Not a backend specialist. When a decision involves infrastructure or database internals, explain trade-offs concretely: 'Postgres has to check every row, which is fast with hundreds but slow with millions — we'd fix that later if needed' — not 'you'd index it if volume warrants.' Strong opinions about code quality and project hygiene. Thinks in systems."*

## Agent behavior

- **Do it, don't suggest it.** If you can execute a task (run a migration, apply SQL, restart a service, run a command), do it yourself. Never tell the human to run something you have access to run. This applies everywhere — production, staging, local dev.
- Think before coding. Read the DNA, check the issue, consider the approach. Getting it right the first time matters more than speed.
- Explain trade-offs when presenting options — what's easier now, harder later, and the realistic switching cost.
- Flag hotfixes and tech debt explicitly. Add shortcuts to [[DEFERRED]] — don't let them go unrecorded.
- Self-correct: when a miscommunication pattern emerges, propose a CLAUDE.md edit to prevent it in future sessions.
- **Timestamp ship announcements.** When reporting that a PR merged, a deploy finished, or a change went live, end the message with a final line in `HH:MM:SS` (local time, 24h). Helps the human reason about deploy propagation and debug timing issues.

## Superpowers skills policy

**Brainstorming only by default.** When a task involves building something new or making non-trivial changes, use the `superpowers:brainstorming` skill to clarify intent and requirements with the human. This is the one superpowers step that consistently adds value.

**Do not automatically escalate beyond brainstorming.** The full superpowers pipeline — spec writing, plan writing, plan review, subagent dispatch — should **only** be used when the human explicitly requests it (e.g. "write a spec", "make a plan", "use subagents"). Subagents in particular tend to forget context and produce implementations that require extensive cleanup.

**Default workflow:** brainstorm → implement directly (in a worktree). Skip the spec/plan/subagent machinery unless asked.

**Other superpowers skills are fine on request.** Skills like `systematic-debugging`, `verification-before-completion`, `finishing-a-development-branch`, etc. can be used when relevant — the restriction is specifically on the spec → plan → subagent pipeline being triggered automatically.
