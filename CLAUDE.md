# About

> ⚠️ **Template placeholder.** Replace this block with a 1–3 sentence description of the project: what it is, who it's for, and where it lives. Be concrete — the description anchors every later decision.
>
> Example: *"This project implements an AI compliance platform that monitors product updates (GitHub PRs, Linear tickets) and analyzes whether they impact legal documents. It is implemented as a single SvelteKit app (in `app/`), deployed to a VPS via Docker Compose. There is no separate backend."*

This project was bootstrapped from [`saas_tmplt`](https://github.com/ulfaslak/saas_tmplt) — see [TEMPLATE.md](TEMPLATE.md) for the full bootstrap checklist before deleting that file.

# Knowledge base

If this project has a sibling repo (or directory) with non-code context — meeting transcripts, decisions, CRM notes, playbooks, team info — name it here so future agents look there first when the human references "what we discussed in the call" or "the decision from last week." This is read-only context; agents should never modify files in that repo.

> ⚠️ **Template placeholder.** If you have no knowledge base, delete this section entirely.

# 🚨 The API keys in `.env` are not yours to spend

If the repo `.env` holds model-provider keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, …), **they bill the human's own metered accounts, uncapped.** Writing or running your own code that calls a model provider with one of them is **strictly prohibited unless the human explicitly asks for it in the current session.** Other credentials — payment providers, the integrations' OAuth clients and tokens, the deploy key — exist to be used; see "Production operations" for what to do with them.

# Persistent agent context

`AGENTS/` contain persistent context. `AGENTS/DNA/*.md` files are _hard context_, `AGENTS/*.md` files are _soft context_, and `AGENTS/SPECS/` contain _plans_.

## Hard context: DNA

`AGENTS/DNA/` is the project's architectural guardrails: technical decisions, structure, interface contracts, etc.. The DNA grows with the project, but must never drift from the code. It evolves but doesn't change. Contributions that violate DNA cause cancer and must be avoided. Rules:

1. Don't write code which violates DNA.
2. Grow DNA: when your work adds new structure, record it.
3. Don't let it drift: if something in DNA/ no longer matches the code, fix it. If it's unclear whether DNA or code should change, think deeply and resolve it only if you are certain, otherwise ask the human.
4. Do not take DNA changes lightly. If you make changes, you must have applied deep reasoning before doing so. Err on the side of asking the human before changing an existing DNA item.

### Reading DNA files

Read only the DNA files relevant to your task. All files are in `AGENTS/DNA/`.

**Each file holds one class of facts.** A fact is only recorded in one place.

| File                  | Holds                                                                                             | Test                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [[DECISIONS]]         | A **choice** among alternatives we could have made differently. "Postgres + Drizzle ORM."         | Could someone violate it by choosing otherwise? Disagreeing means arguing with the human. |
| [[INVARIANTS]]        | What must stay **true at runtime**, and the failure that taught it.                               | Could you write a test that fails when it stops being true?                               |
| [[ARCHITECTURE]]      | **Where** code and data live: file structure, data models, module boundaries.                     | Could you verify it with `ls` or by opening the file?                                     |
| [[PRODUCT]]           | What the **customer** gets: vision, personas, the feature inventory.                              | Could a user observe it?                                                                  |
| [[UI_SPEC]]           | How the app is **laid out and behaves on screen**: layout, components, badges, route groups.      | Would a designer recognise it as a convention?                                            |
| [[DESIGN]]            | Brand: colour, typography, spacing, voice and copy rules.                                         |                                                                                           |
| [[DEVELOPMENT]]       | How to **work on** the app: local setup, migrations, testing ideology, deploy and ops procedures. | Is it a thing you _do_, not a thing the app does?                                         |
| [[DEVELOPMENT_SETUP]] | Provisioning the infrastructure from scratch: VPS, CI/CD, disaster recovery.                      |                                                                                           |

Statements migrate as they change kind. A decision that has been implemented and now has guards around it usually belongs in [[INVARIANTS]] rather than [[DECISIONS]] — the choice is settled, and what matters is what must not break.

| Task type                                              | Read these files                |
| ------------------------------------------------------ | ------------------------------- |
| Any implementation work                                | [[DECISIONS]], [[ARCHITECTURE]] |
| Server logic — services, jobs, webhooks, API endpoints | + [[INVARIANTS]]                |
| UI / frontend changes                                  | + [[UI_SPEC]], [[DESIGN]]       |
| DB schema, migrations, writing tests                   | + [[DEVELOPMENT]]               |
| Production deploy / ops                                | [[DEVELOPMENT]]                 |
| Product scope or feature questions                     | [[PRODUCT]]                     |
| Infra provisioning, CI/CD, disaster recovery           | [[DEVELOPMENT_SETUP]]           |
| Broad or unclear scope                                 | All DNA files                   |

## Soft context

We also maintain records of project state in `AGENTS/*.md` files:

- **HUMAN_TODO**: Check [[HUMAN_TODO]] for pending manual tasks that can only be completed by the human. You are conditioned to do as much as you possibly can, see § "Highly valued agent behavior", however some tasks are genuinely beyond your scope.
- **SCHEDULED_JOBS**: [[SCHEDULED_JOBS]] is the registry of everything that runs on a schedule (backup jobs, queue crons, cert renewal) with each one's cadence and, crucially, its **alarm**. Read it before touching anything periodic, and add a row (with an alarm) when you create a recurring job. It is record-keeping, not DNA: it tracks what happens to be scheduled right now, so it changes as jobs come and go.
- **POST_MERGE_VERIFICATION**: Check [[POST_MERGE_VERIFICATION]] for queued verification steps. If any entry's trigger has fired (especially for areas near your current work), run it and clear it. When investigating a bug, this list is also a good place to look.
- **ENVIRONMENT_NOTES**: [[ENVIRONMENT_NOTES]] collects the things that are true about this environment but not derivable from the code: e.g. which local resources are **shared** between worktrees, build traps, and how to verify things on prod. Read it before blaming your change for a confusing local failure, and before a Phase-5 check.
- **AGENT_MISTAKES**: [[AGENT_MISTAKES]] collects the mistakes you have made in the past. The /cleanse skill uses this to update agent context (e.g. adding ENVIRONMENT_NOTES for frequent gotchas).
- **DEFERRED**: [[DEFERRED]] tracks **technical items** that are known but intentionally postponed: tech debt, hardening shortcuts, known limitations, scheduled fixes (e.g. token rotations with a future expiry date), and cleanup tasks that are either cheaper to do later or better bundled with future work. The common theme: _not worth doing now, but we'll need to remember it later._ **Do NOT put features here.** Product features, UX work, new user-facing capabilities, bugs discovered, and anything that belongs in a product roadmap → GitHub issue. Each item must include:
  - **What**.
  - **Why deferred**.
  - **Trigger** (on what condition does this become actionable?)

GitHub Issues fall under the soft context category too. They are the single source of truth for oncoming dev work, bugs, feature requests, etc.. Run `gh issue list` to see open work (planned + in-flight). An open issue that carries a **claim comment** ("🔨 Started work on this.") is already being worked on by another agent — read it with `gh issue view <N> --comments` to understand current state, and keep away from it. When you pick one up, post the claim yourself with `gh issue comment <N> --body "🔨 Started work on this."`, and link the PR with `Closes #N` so merging closes the issue.

# Workflow rules

In sessions where you edit files in this repository you must follow certain rules. Sessions where files aren't being changed are not covered by these rules unless explicitly stated.

## Always use worktrees when editing files in this repository

Branch from `origin/main`. Edits on main are forbidden and there are **no size exceptions** (read-only tasks do not fall into this category (research, exploration, answering questions) and require no worktree.). Use `git gtr`:

1. **List:** Run `git gtr list` to see all existing worktrees.
2. **Create:** From the primary clone, run `git gtr new <branch-name>` (example: `git gtr new feat/oauth`). This creates a worktree in a sibling directory (`../<repo>-worktrees/<branch>/`), copies `.env` files, and runs `pnpm install` automatically via `.gtrconfig`.
3. **Work:** `cd` into the worktree path shown by gtr. All edits, commits, and pushes happen there. **Commit early and frequently in worktrees.** This is to minimize the risk of losing work in the unlikely case that the worktree is deleted.
4. **After merge:** From the primary clone, remove your worktree. Run `git gtr rm <branch-name>`, then `git checkout main && git pull`. If the worktree directory is deleted while it's your cwd, the session becomes permanently stuck. **Never remove another agent's worktree.**

**Do not run `drizzle-kit generate` in a worktree.** Write migrations by hand, following [[DEVELOPMENT]] § "Writing a migration" - read it before touching `app/drizzle/`.

## PR body structure

At minimum, include `## Summary` and `## Test plan` (checklist). Add `## Decisions taken without asking` if any autonomous scope calls were made. Add `## Verification` for no-UI changes (see Phase 2). Add `## Mistakes found during self-testing` if you found any. The session ID footer goes last.

- **Screenshots for frontend PRs.** If the PR includes visible UI changes, add before/after screenshots to the PR description. Use Playwright MCP (`browser_take_screenshot`) — screenshots default to `.playwright-mcp/` and can be uploaded to the PR via `gh`. If you save screenshots with an explicit filename, put them in `screenshots/` (gitignored), never at the project root.
- **Include session ID in every PR description.** Before creating a PR, get the current Claude session ID from the `CLAUDE_CODE_SESSION_ID` environment variable (`echo $CLAUDE_CODE_SESSION_ID`). Add it as a footer line in the PR body: `Session: <session-id>`. This lets future agents trace back to the conversation that produced the changes and avoid reverting past decisions without context.

## Making decisions autonomously

Given a prompt and the persistent context we maintain in `AGENTS/DNA/` (e.g. [[DECISIONS]]) most decisions can be made autonomously, because they derive nicely from the context. Therefore you **default to deciding, then surfacing what was decided**. Decide confidently when the cost of a wrong call is a follow-up PR, not costly data loss. **Ask only when:**

- The call is **irreversible**. E.g. destructive migrations, published API shapes, emails sent to real users, external-service state that can't be rolled back.
- It affects **non-code stakeholders**. E.g. pricing, legal wording, UX direction a PM should own, anything a customer would experience as a policy.
- It's **architectural and cross-cutting**. E.g. a decision that compounds across future work, not contained within the ticket.

**Surface every autonomous decision in the PR body.** Under a `## Decisions taken without asking` section, list each one briefly: what you decided, and why (one line each is enough). Do not document decisions in commit messages.

## The test-fix-learn cycle

**This cycle is non-negotiable for every PR, no size exceptions.** This cycle ensures errors are caught before the human ever sees the PR, and that the project learns from each one.

### Phase 1: First pass PR

The first implementation pass should be your best effort. Think carefully, handle edge cases, get it right.

- Run `cd app && pnpm check`, then both test suites:
  - `cd app && pnpm vitest run` — unit tests (mocked dependencies, fast)
  - `cd app && pnpm test:integration` — integration tests (real Postgres `app_test` DB, requires Docker)
  - If your change touches DB operations, services, API endpoints, or webhook handlers, integration tests matter most. Add integration tests for new services/endpoints following existing `*.integration.test.ts` patterns.
  - **When writing or modifying tests**, read the **Testing ideology** section in [[DEVELOPMENT]] first. It defines what's worth testing, what's redundant, and the project's stance on coverage.

- Commit, push, and open a PR. The **last commit message** of this phase must include: `[not user-tested]`. This signals that the implementation is complete but hasn't been validated end-to-end yet.

### Phase 2: Self-testing

Pick, without asking, the testing approaches from below that apply. Multiple can apply simultaneously:

**If the change has a UI surface:**

1. **Stage the app.** Spin up a local dev server against a realistic database — a production snapshot once prod exists. (Build a `/stage` skill for this early; the workflow assumes one.)
2. **Test all primary flows.** Use Playwright MCP to walk through every user-facing flow your change touches. Verify the obvious.
3. **Test non-obvious edge cases.** For example: state machine edges, permission edges, empty/boundary states, concurrency and re-entry, adjacent features, failure modes, a new secret, duplicated hard-coded rosters, conditional-rendering shadowing, rendered layout not just DOM (run `app/scripts/layout-probe.js` at 390px and desktop), gate run vs. gate shipped, etc.. Anchor your findings in evidence.

**If the change touches server-side logic that cannot be tested by levers in the frontend:**

1. Verify the test suite is green — unit + integration. Those are non-negotiable. **Then run the build once** — `cd app && pnpm build`. Route-export violations and other compile-time framework rules (e.g. a `+server.ts` exporting a non-HTTP name) are caught _only_ by the build, which no Phase-1 gate and no other local check runs — so for server-only changes that skip the `/stage` walk, this is the cheapest catch for a class of error that otherwise fails only inside the deploy pipeline.
2. **Queue a post-merge verification entry.** Add a detailed entry to [[POST_MERGE_VERIFICATION]] with trigger, exact commands, success criteria, and failure-diagnosis notes. The bar is **runnable-as-written by a cold agent**: checked-in script paths (never an elided `/* … */` body), no `$lib` imports the prod image doesn't ship, real connection flags. Then **run the entry's commands once** (at least the read-only ones) before merging — a queued verification is code, and an untested query silently never runs — and paste the **actual output** of that run into the PR's `## Verification` section, not an assertion that it happened.
3. Acknowledge this in the PR description under a `## Verification` section: "No UI surface — programmatic verification queued in [[POST_MERGE_VERIFICATION]] (see #N entry). Will be run post-deploy."

**If the change modifies files that live on the VPS** (`scripts/deploy.sh`, `nginx/`, `docker-compose.prod.yml`, `Dockerfile`, `.github/workflows/`), add one extra step: after merge, SSH into the VPS and `diff` the in-repo file against the on-disk file. The repo version is what _should_ be running; the VPS version is what _is_ running, and the two can silently diverge — an uncommitted hot-fix can block `git pull` for months, the deploy log can show output from a stale script, etc. Inspecting deploy logs and runtime behaviour isn't enough: the log might be your code's output, or it might be last month's. Diffing repo-vs-VPS is the only way to know which.

**Regardless of what the change is:**

1. **Fix everything you find.** Each bug gets a fix commit on the worktree branch. Push as you go. For each fix, run the **negative control** once: revert the fix (or restore the triggering input), watch the check fail, then re-apply. If adding tests **break what the test claims to catch, not just the code it covers.**
2. **Tick off the test plan.** As you verify each item in the PR's test plan checklist, update the PR description to check the box (`gh pr edit`).
3. **Stop when confident.** You're done when you can't think of another way to break it.

**Phase 2 routinely takes longer than Phase 1 and produces many fix commits. That's the intention, not a sign something went wrong.** A 60-minute, 8-commit Phase 2 on a well-scoped ticket is a good outcome. Fast and wrong is worse than slow and right. Don't rush this.

### Phase 2.5: Adversarial subagent review (server-logic diffs)

Launch a cold **`adversarial-reviewer`** subagent before your turn ends.

- **Always apply when the change touches server-side logic.** Specifically, modified files in `app/src/lib/server/` (services, webhook handlers, DB operations, API endpoints) i.e. the same surface where "integration tests matter most."
- **Lean towards applying when the change is large.** Changes that touch multiple parts of the app, or are complex and require deep understanding of the codebase.
- **Skip when the change is trivial UI changes.** E.g. styling, copy, a one-line CSS fix, a component-only tweak, etc..
- **How.** Give it **only the diff and the files it needs to read, not your reasoning, not the ticket's framing, not "here's what I built and why."** It must not know the happy path.
- **The subagent reviews; it does not implement.** You triage the findings: fix the real ones as fix commits on the branch (they feed Phase 3), and note in the PR body why you rejected any you didn't act on.

### Phase 3: Document mistakes (only if you found any)

Before asking the human to merge **if self-testing found real bugs you had to fix**, add a `## Mistakes found during self-testing` section to the PR description listing each issue. Then append to [[AGENT_MISTAKES]] with the date, issue ID, and a concise description focusing on the _category_ of error (e.g. "missed edge case in prompt", "forgot to update related component", "wrong assumption about API behavior"). The goal is to surface patterns that better context or refactors could prevent. **If self-testing found nothing**, add nothing.

### Phase 4: Clean up

- **Leave a clean state.** Kill any dev servers, docker containers, or background processes you started.

### Phase 5: Post-merge verification

**If you merge a PR in-session, you own Phase 5.** Don't claim the work is done until you've waited for the deploy to land and cleared every POST_MERGE_VERIFICATION entry whose trigger has fired. Reporting "merged ✅" while skipping this is a regression of behavior.

**If you merged with `[skip deploy]`** or the PR was docs-only, there is no deploy to wait for and the steps below don't apply. Say so in one plain line and you're done.

After merging:

1. **Wait for the deploy to go green.** E.g. `gh run watch <run-id>` or poll `gh run list --limit=3` until status is `completed` / conclusion `success`. If the deploy fails, fix forward before anything else. **A green deploy is necessary but not sufficient** — it only proves the container started and the healthcheck passed, not that pages render: a failing server `load`, a missing table, or a broken query all survive a healthcheck and an unauthenticated `303 → /login`. Before treating a deploy as verified, load the real _authenticated_ route your change touches, not just the health endpoint.
2. **Scan ALL entries in [[POST_MERGE_VERIFICATION]].** A deploy fires every pending "after next deploy" trigger, including entries queued by earlier PRs. Re-evaluate the whole file.
3. For each entry, check whether the **Trigger** condition can be satisfied now. If it has fired: run the **Steps** exactly. Compare results against **Success criteria**. If passing, remove the entry. If failing, follow **On failure** and fix forward in a new PR — do NOT remove until the fix is verified.
4. If a trigger isn't yet satisfied, leave the entry. Future sessions will pick it up.

Help keep POST_MERGE_VERIFICATION clean. If you find stale items that have clearly been verified, remove them.

## Production operations

You have full SSH access to the production VPS. **Do not ask the human to run migrations, restart services, or perform other server tasks. Do them yourself.** The same holds for third-party services the project integrates with.

> ⚠️ **Template placeholder.** Replace `<HOST_IP>`, `<DEPLOY_USER>`, `<SSH_KEY_PATH>` and `<APP_DIR>` with your project's actual values (here and in [[DEVELOPMENT]] § "Operating prod"). Then delete this admonition.

```bash
ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP>
# Prod stack: `docker compose -f <APP_DIR>/docker-compose.prod.yml ...`
```

**Deployment is automatic, but only for code changes.** Every push to `main` that touches `app/`, `nginx/`, `scripts/`, `Dockerfile`, `docker-compose.prod.yml`, or the workflow itself builds the image and deploys it to prod. Docs-only PRs (e.g. `AGENTS/`, `CLAUDE.md`, `docs/`) do not trigger a deploy. `[skip deploy]` in the merge commit message skips the deploy on code PRs; use it for changes with no runtime effect, or when the human asks, and say in one plain line that prod does not have the code yet.

**After-work duties:**

- Routine code PRs: Phase 5 only.
- PRs introducing new `app/drizzle/*.sql` files: the deploy does not run migrations. After the deploy goes green, run them, then verify the schema change actually landed on prod with a direct SQL check. Drizzle silently no-ops if the journal is out of sync — never trust its "applied successfully" line alone. If it's missing, apply the raw SQL from the migration file.

Read [[DEVELOPMENT]] § "Operating prod" for recipes for running migrations, verifying a migration applied, applying raw SQL, tailing logs, restarting the app after an `.env` change, and the manual deploy fallback.

## Strategies for context management

Be context conscious. Nothing is worth reading twice. Treat context as a resource with a burn rate.

### Don't read large files, grep for structure

For any file over ~300 lines, don't read the whole thing. Since this is a TypeScript codebase, you can run a structural grep to get a table of contents:

```bash
  grep -n "^export \|^function \|^class \|^interface \|^type \|^const \|^let \|^async function\|#region\|// ---\|// ===" path/to/file.ts
```

Then read only the sections you need.

### Keeping context spendable

- **Edit files with the Edit/Write tools, not with `python3`/`perl`/`sed` heredocs.** When a file is written out-of-band the harness re-emits the _entire file_ back into context as a modification notice. Reach for a script only when the change genuinely cannot be expressed as string replacements (a mechanical rewrite across many files), and expect to pay for it.
- **Write long prose — PR bodies, issue bodies, verification entries — to a scratchpad file with Write, then `--body-file` it.** A heredoc pushes every line through the shell channel and back in the result.
- **Always hand read-heavy reconnaissance to an `Explore` subagent.** If the answer is small but the search is large, use a subagent.
- **Don't re-read a file you just edited to check the edit landed.** Edit fails loudly if the match missed.
- **Pipe test output through `tail`/`grep`.** A full vitest run is hundreds of lines; the summary is four, and the failure detail is a targeted grep away.

# Collaborating with the humans

## About the humans

> ⚠️ **Template placeholder.** Replace this with a one-to-three-line profile per human you collaborate with: experience level, language/framework comfort, technical strengths and gaps, how they want trade-offs explained.
>
> Example: *"Experienced with SvelteKit, TypeScript, and web platform fundamentals. Not a backend or devops specialist. When a decision involves infrastructure or database internals, explain trade-offs concretely in plain language. Strong opinions about code quality and project hygiene. Thinks in systems."*

## Signals from the human

- **The 🤘 signal.** When the human ends a request with 🤘, they're explicitly granting wider latitude and want you to finish the job. Lean harder into your own judgment, decide more, ask less. Merging PRs is allowed. You must of course still follow the workflow rules and stop in case you are genuinely blocked or about to do something very stupid.

- When the human asks for a **mock / mockup** they want a standalone HTML preview of a design *before* it's built. See the full workflow + fidelity checklist in `AGENTS/SPECS/README.md`.

- The human may use speech-to-text. Such messages have characteristic near misses (e.g. "CLAUDE.md" transcribed as "Cloud MD"). When you see things like that, expect other *near misses* and adjust your understanding accordingly. If something is genuinely uninterpretable, ask.

## Writing for the human

The last message of your turn should be optimized for the human's understanding. Software engineering jargon is strongly discouraged. Ideally you write ~80% ASD-STE100 compliant. End substantial work with a response that follows this format:

```
<Description of where the work landed. Details from the process are only included if they are relevant to the outcome. Keep this section short.>

⚠️ HEADS UP

<ALL CAPS PIECE OF INFORMATION THAT THE HUMAN MUST ABSOLUTELY TAKE NOTE OF>
<...>

Recap

<Same short recap as generated with /recap>

Next steps

- <...>
- <...>

<status label: Merged/Not merged/Deployed/Live> · <timestamp: HH:MM:SS (24-hour format)>
```

Guidelines that apply when explaining your work:

- **Lead with the outcome.**
- **Explain decisions, tradeoffs, risks and blockers**
- **Make the final response self-contained.**
- **Let response depth follow stakes, not effort.**
- **Signal your confidence clearly.** Never conflate what is verified, inferred, and assumed. "Tests pass" is not "this works in prod"; a green deploy is not a rendered page. Never claim success without fresh evidence you actually looked at.
- **Link what you name.** Embed markdown links into anything you name that can carry a link (GitHub issue or PR, mock, HTML document, source, etc.), so the human doesn't have to manually go and find things.

### Status updates during long work

The test-fix-learn cycle routinely runs for an hour with dozens of tool calls. Long silent stretches make a session unreadable, so post a brief update IN ALL CAPS at each **meaningful state change** — a phase boundary, a bug found, an approach abandoned, a blocker hit - insofar as it is worth for the human to know if they scroll through the transcript. Keep it at one-sentence ALL CAPS, with optional short lower-case explanation below.

## Highly valued agent behavior

- **Do it, don't suggest it.** If you can execute a task (run a migration, apply SQL, restart a service, run a command), do it yourself. Never tell the human to run something you have access to run. This applies everywhere — production, local dev. Unless it's a potentially breaking operation that can't be undone, go ahead and do it.
- **Don't offer to do work the human already asked for.**
- **Match the requested mode.** _Explain, review, diagnose, "what do you think about", "why does X happen"_ are **read-only** — answer them, don't start editing files or opening worktrees. _Change, build, fix, add, ship_ carry implementation **and** the verification that goes with it (the full test-fix-learn cycle, not just the edit). When the mode is genuinely ambiguous, answer first and offer the implementation in one line.
- **Report blockers with evidence.** Exhaust the safe in-scope alternatives before declaring yourself blocked. When you are actually blocked, state three things: the exact condition, the evidence for it, and the specific action needed to continue. "Couldn't get X working" is not a blocker report.
- **Never trigger a skill just because its name appears in the human's text.** Skills have ordinary names — `stage`, `reset`, `ship`, `run`, `review`, `issue`. "Reset the staging DB" or "let's review the schema" are English sentences, not skill invocations. Aside from direct invocation, only run a skill when the human directly asks you to.
