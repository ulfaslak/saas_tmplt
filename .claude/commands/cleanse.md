# DNA Cleanse

When invoked, ask the user: **shallow or deep?**

A software project is like a living organism. It grows and changes over time, but its ideological core, it's DNA, must remain self-consistent and coherent over time, otherwise cancer will set in and the project will die. The purpose of a cleanse is to identify and fix any inconsistencies or contradictions in the DNA, and to ensure that the project remains cancer free.

## Shallow cleanse

Review the DNA documents against each other and glance at the implementation.

1. Read all files in `AGENTS/DNA/`.
2. Check internal consistency: do all DNA files agree with each other? Are there contradictions, duplications, or references to things that don't exist in another doc?
3. Skim the implementation (file tree, key files) to catch anything obviously out of sync — a decision that the code clearly violates, a UI spec that doesn't match the actual page, etc. Don't read every file.
4. Check [[DEFERRED]] for items that have already been resolved but not removed.

## Deep cleanse

Thorough review of DNA against the full implementation.

1. Read all files in `AGENTS/DNA/`.
2. Do everything in the shallow cleanse.
3. Read every source file in `app/src/`, except generated files (shadcn-svelte `ui/` primitives). For each one, verify:
   - It follows decisions in DECISIONS.md (correct libraries, patterns, conventions).
   - Any UI it renders follows the conventions in UI_SPEC.md and DESIGN.md.
4. **Database reality check.** Compare Drizzle schema (`schema.ts`) against the actual database. Run `psql` or equivalent against the dev database:
   ```sql
   SELECT table_name, column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_schema = 'public'
   ORDER BY table_name, ordinal_position;
   ```
   Flag any discrepancies:
   - Tables/columns in the DB but not in the Drizzle schema (manual changes never codified).
   - Tables/columns in the Drizzle schema but not in the DB (migrations written but never applied).
   - Type or nullability mismatches between the two sources.
   Then check that [[ARCHITECTURE]]'s "key non-obvious schema details" section is still accurate against the code.
5. Check for orphaned code — files or exports that nothing imports.
6. Review [[DEFERRED]] for items that are stale, resolved, or now irrelevant.
7. Consider whether each issue may result from lacking guardrails in `AGENTS/DNA/` or `CLAUDE.md`. If so, suggest ways to improve the agent behavior specification.
8. **Agent mistake review.** Read [[AGENT_MISTAKES]] and look for patterns — recurring error categories, common root causes, or classes of mistake that keep happening. For each pattern found:
   - Determine if it can be prevented by updating workflows (CLAUDE.md), DNA files, or code (e.g. adding a helper, a type guard, a test pattern).
   - Propose the specific change and implement it if the human approves.
   - Mark addressed patterns in [[AGENT_MISTAKES]] with a `[learned]` tag and a reference to what was changed.

   The goal is to close the feedback loop: mistakes → patterns → guardrails → fewer mistakes. One-off errors with no pattern should be left as-is — not every mistake needs a systemic fix.

## Test pruning (both shallow and deep)

After exploring the codebase (shallow: skimming, deep: reading every file), sanity-check the existing test files against the code you just saw. Flag or remove tests that are **completely redundant** by these criteria:

| # | Criterion | Action |
|---|-----------|--------|
| 1 | **Shadowed by integration test** — a unit test mocks the DB and asserts the same behavior that an integration test already covers with a real DB | Remove |
| 2 | **Tests deleted/renamed code** — the test imports or references functions/modules that no longer exist (would already be failing) | Remove |
| 3 | **Tautological** — test asserts what the type system or framework guarantees, with no runtime logic being exercised | Remove |
| 4 | **Exact duplicate** — two `it` blocks assert the same input→output with no meaningful variation | Remove the duplicate |
| 5 | **Dead fixture** — test helper/factory functions that are no longer imported anywhere | Remove |

**Do not remove:**
- Tests covering edge cases, even if a "happy path" integration test exists for the same service
- Integration tests (these are high-value by definition)
- Any test you're not confident about — flag it for the human instead

Refer to the **Testing ideology** section in [[DEVELOPMENT]] for the principles behind these criteria.

## Broken links (both shallow and deep)

Scan all markdown files in `AGENTS/`, `AGENTS/DNA/`, `CLAUDE.md`, and `.claude/commands/` for Obsidian-style `[[links]]`. For each link found:

1. Resolve the target: `[[DECISIONS]]` should match a file named `DECISIONS.md` somewhere in the repo (case-insensitive basename match).
2. Flag any link whose target file does not exist — these are broken links.
3. Flag any plain-text references to DNA/AGENTS docs that should be `[[links]]` but aren't (e.g. `` `DECISIONS.md` `` instead of `[[DECISIONS]]`).

Fix broken links in place. Convert plain-text references to `[[links]]` where appropriate.

## Output

Present all issues found (DNA inconsistencies, test pruning candidates, etc.) with proposed fixes, then let the human reply. If the human approves, implement the fixes directly — create a branch, commit, open a PR, and offer to merge.

If no problems are found, say so.

## Issue hygiene

As part of every cleanse (shallow or deep), query the issue tracker for stale issues (those in **In Review** for an extended period). For each:

1. Check whether the linked PR has been merged (via `gh pr view`).
2. If merged, move the issue to **Done**.
3. Check for stale worktrees (`git worktree list`). **Before removing any worktree**, verify it is not actively managed by another Claude session — check for a `.claude` process lock or ask the human. Only remove worktrees that are confirmed orphaned.

This ensures the issue tracker stays current without requiring a separate housekeeping step.
