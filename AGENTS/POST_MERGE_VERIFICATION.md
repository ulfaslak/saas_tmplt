# Post-merge verification

Changes whose correctness can only be observed against the live production system — webhook handlers, background jobs, LLM-driven flows, anything that depends on real external traffic or the real prod database. These get queued here with detailed verification steps, then verified by an agent (not the human) once the trigger condition fires.

The human shouldn't have to touch entries here. If a step requires human eyes, it belongs in HUMAN_TODO, not here.

## When to add an entry

Add an entry during Phase 2 of the test-fix-learn cycle when:

- The change has no meaningful UI surface, so a `/stage` Playwright walk produces no useful signal.
- Meaningful end-to-end verification requires real webhook traffic, real LLM calls with production prompts, real Stripe events, real OAuth redirects, or real prod data volumes — things that can't be cleanly simulated on staging.
- The change is a pure refactor/rename/plumbing change that integration tests cover, but you want one live-system sanity check before considering it shipped.

Add the entry *before* merging, in the same PR. The agent merging the PR then sees the new entry and either verifies immediately (if the trigger has fired — e.g. SSH + SQL query) or leaves it for a later session with natural reason to pick it up (e.g. next webhook that fires in prod).

## When NOT to add an entry

- The change has a clear UI surface — self-test on `/stage` with Playwright during Phase 2 instead.
- The change is fully covered by unit + integration tests with no production dependencies — no entry needed; test suite is the verification.
- The step requires a human (visual design judgement, real credit card, manual OAuth consent from a specific third party account) — that's HUMAN_TODO, not here.
- You're uncertain whether verification is actually possible — write the entry anyway with your best guess at a trigger, and note the uncertainty. Better to log a weak entry than to silently skip verification.

## Entry format

Each entry is its own H3 subsection. Required fields, in order:

- **PR** — GitHub URL.
- **Issue** — issue identifier and URL.
- **Session** — the Claude session ID from the PR footer. A future agent resuming this verification may need to read the original conversation for context.
- **Merged** — YYYY-MM-DD (filled in after merge).
- **Summary** — one sentence: what shipped and why verification matters.
- **Trigger** — the condition that must exist before verification is possible (e.g. "first webhook on prod after merge", "next Stripe webhook of type `invoice.paid`", "immediately — just SSH"). Be specific.
- **Steps** — exact, copy-pasteable commands. SSH invocations, SQL queries, curl calls, log greps. Do not abbreviate. Do not say "check the logs"; give the exact command. The future agent may have no context on how this subsystem works.
- **Success criteria** — what a verified result looks like. If the check is "query returns rows matching X", spell out what X looks like. If it's "log shows Y", paste the log line format.
- **On failure** — where to look, which files were touched (paths + line numbers), what the likely regressions are. Rolling back is usually not the right move; fix forward. Include enough context for a cold agent to start diagnosis.

Agent verifying an entry:
1. Check if the trigger condition is met. If not, leave the entry; move on.
2. Run the steps exactly.
3. If success criteria met: remove the entry entirely (git history preserves it).
4. If failure: diagnose with the "on failure" hints. Open a follow-up PR. Do NOT remove the entry until the fix is verified.

## Removing entries

- Success verified — remove the entry.
- Entry has been here 30+ days with no trigger firing — probably dead code or over-cautious; remove with a one-line comment in the PR that adds the removal, explaining why.
- The PR was reverted — remove the entry; if a replacement PR ships, a new entry goes with it.

---

## Entries

_No entries yet._
