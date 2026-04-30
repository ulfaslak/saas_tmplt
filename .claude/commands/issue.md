# Issue Workflow

Full workflow for creating, implementing, and completing issues.

> ⚠️ **Template note.** This skill assumes you have an issue tracker (Linear, GitHub Issues, Jira, …) named in [[PRODUCT]] §"Issue tracker". Replace the Linear-specific instructions below with your tracker's equivalents (the *workflow* shape is what matters, not the specific tool).

## Creating an issue

Before writing code, every task gets an issue. The issue is created **early** — as soon as the feature or task is clear — so collaborators can see what's being worked on. The full spec is written afterward and linked back to the issue.

### Process

1. Review `AGENTS/DEFERRED.md` to see if any deferred items have matured and should be addressed.
2. Ask clarifying questions about the task — the goal is a plan that is fully coherent with the DNA.
3. **Create the issue early.** As soon as the feature/task is clear enough to name and describe at a high level (even before the full spec is written), create the issue with status **In Progress** and a short `## Goal` section. This gives collaborators real-time visibility — brainstorming and spec-writing can take hours, and the ticket should exist in "In Progress" throughout.
4. Continue refining the spec through brainstorming and Q&A with the human. Write the full issue description and present it to the human for approval using the template below.
5. Once the spec is approved, **update the issue** with the full description (replacing the initial short goal).

### Issue description template

~~~markdown
## Goal
What this task accomplishes in 1-2 sentences.

## DNA impact
A checklist of specific DNA changes this issue introduces. Each item names
the file and describes the exact change. These are labeled (e.g. D1, D2, ...)
so steps can reference them.

- [ ] D1: ARCHITECTURE.md — add X to file tree
- [ ] D2: ARCHITECTURE.md — add X data model schema
- [ ] D3: DECISIONS.md — add "X" under Data section
- ...

Write "None" if the task doesn't change any structural facts.

## Steps
Numbered, ordered list of concrete implementation steps.
Each step names the file(s) it touches, and references which DNA items
(from the checklist above) must be applied before that step.

1. Do X — touches `app/src/lib/server/foo.ts` [requires D1, D2]
2. Do Y — touches `app/src/routes/bar/+server.ts` [no DNA]
3. ...
~~~

Write the plan so thoroughly that another agent of lower intelligence could implement it without asking additional questions or making judgement calls.

## Implementing an issue

Unless the human specifies otherwise, implementation is handed off to a **subagent** running in a worktree (`Agent` tool with `isolation: "worktree"`). The flow:

1. Confirm the issue is in **In Progress** in the tracker (it should already be — it was moved there when created during brainstorming).
2. Launch the subagent with a prompt that includes: the full issue description, relevant DNA context, and explicit instructions to create a branch, implement, commit, and open a PR via `gh pr create`. The subagent should link the PR in the issue.
3. The subagent works independently. It should only stop and surface to the human if something genuinely unexpected blocks progress (the bar is high — most things can be fixed after the fact).
4. When the subagent finishes and the PR is open, move the issue to **In Review**.
5. After the PR is merged, move the issue to **Done** immediately — in the same session, not deferred. Stale "In Review" issues accumulate fast when this is skipped.
6. **Clean up the worktree.** Run `git worktree list` and remove any worktrees created for the issue (`git worktree remove <path>`). Don't leave stale worktrees behind.
7. **Verify deployed changes.** After the PR is merged and deployed, actively verify that the changes work in production. Don't just log untested items — test them yourself:
   - For API endpoints and webhooks: use `curl` against `https://<DOMAIN>` to confirm responses.
   - For database changes: SSH into the VPS and query the production database to confirm migrations applied correctly.
   - For UI changes: use `curl` to fetch the relevant pages and verify the HTML contains expected elements, or hit the underlying API endpoints.
   - For integrations: where feasible, trigger a test event and confirm it flows through correctly.

   If a check cannot be run pre-merge because it needs live prod state (webhook arriving, real LLM call, Stripe event, etc.), add an entry to `AGENTS/POST_MERGE_VERIFICATION.md` with a specific trigger, exact commands, success criteria, and failure-diagnosis notes. Genuinely human-only UI visual judgement — which is rare — goes in `AGENTS/HUMAN_TODO.md`, not POST_MERGE_VERIFICATION. The bar for human-only items is high; most things can be verified programmatically by the agent post-deploy.

## Executing steps within an issue

For each step in the issue spec:

1. Check if the step references any DNA items (e.g. `[requires D1, D2]`).
2. If yes, apply those DNA changes first — edit the DNA files, check off the items in the issue.
3. Then implement the code for that step.

DNA is always updated *before* the code that depends on it. This ensures any agent reading DNA at any point sees the current truth, even if another agent is mid-implementation on a different issue.
