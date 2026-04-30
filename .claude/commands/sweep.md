# Sweep

A focused search for **one specific failure mode** across the codebase, followed by a prioritized report and (on approval) tickets + DNA updates.

Sweeps are different from [[cleanse]]:

- `/cleanse` checks DNA-to-code consistency. Scope is the DNA. Outcome is a coherent spec.
- `/sweep` checks a single suspected failure pattern against the whole codebase. Scope is the code. Outcome is a ranked list of concrete findings, each actionable as a ticket.

Use `/sweep` when you suspect a class of problem is present but haven't seen it enumerated. The user names the failure mode (or picks from the menu); this skill enumerates everywhere it shows up, ranks by impact, and feeds the result back as tickets.

## Invocation

`/sweep <failure-mode>` — runs the sweep directly.

`/sweep` alone — present the menu below, ask the user to pick one, then run. The user may also describe a mode freeform ("find places where we construct dates without timezone awareness").

## The menu

Each entry here is a failure *pattern* — not a specific bug, but a shape of mistake that recurs in codebases like this one. Pick the one most relevant to current concerns.

1. **Pattern drift & duplicate logic** — near-identical code in 3+ places that has already drifted (different behavior across copies), or where a fix applied once has to be manually re-applied to the others. Symptoms: "the second handler forgot the notification check the first one has." Classic cause of silent regressions.

2. **Unvalidated write boundaries** — places where LLM output or user input lands in a typed column (JSONB, enum, structured field) without running through the canonical validator. Symptoms: production 500s on read because a write-time shortcut let bad data through.

3. **Tenant-isolation leaks** — queries against tenant-scoped tables that omit the `orgId` filter or rely on an upstream filter that a refactor might remove. Ask: "if someone called this function with a different org's ID, would it leak?"

4. **Missing soft-delete filters** — queries on soft-deletable tables that forget `isNull(deletedAt)`. Symptoms: deleted items reappear in unexpected places (count queries, aggregations, joins).

5. **Silent catch-and-swallow** — `try {} catch {}` or `catch (e) { logger.warn(...); }` where the caught error is genuinely a bug that should fail loudly. The log warning gets lost; the system proceeds with bad state.

6. **Non-transactional multi-step mutations** — DB writes that should be atomic but aren't wrapped in `db.transaction()`. Partial failure leaves inconsistent state. Especially risky for sequential numbering (`MAX(col) + 1`) and cross-table invariants.

7. **Permission guard asymmetry** — cases where the UI hides a feature based on `canX()` but the corresponding server action doesn't enforce it (or vice versa). Either half alone is a vulnerability.

8. **Inconsistent observability** — log sites that don't use `event.locals.logger` (so `requestId` isn't bound), jobs that don't thread `requestId` through, LLM calls not routed through the central metering wrapper. Drifts the moment new code skips the convention.

9. **Dead code & orphaned exports** — functions/types/files with no non-test importers. Bloats search results, confuses agents doing pattern research.

10. **Convention drift in routes** — inconsistent `resolveOrg` vs inlined auth lookups, inconsistent `fail()` error shapes, inconsistent action naming. Creates ambiguity for agents who grep for "how do we do X here."

11. **Freeform** — user describes the mode. Treat their description as the sweep criterion and proceed.

## Procedure

### 1. Scope & calibration

Before searching:

- Read the relevant DNA files (`ARCHITECTURE`, `DECISIONS`, plus whatever the failure mode touches — e.g. `DEVELOPMENT` for DB patterns, `UI_SPEC` for frontend drift).
- Define **"ripe" criteria** for this specific sweep. What counts as a finding worth fixing vs. a finding worth leaving? Be explicit — write it down in the report. Example: "a triage-handler duplicate is ripe if the copies have already drifted; a 3-line boilerplate repeated twice is not."
- Define what the sweep deliberately **won't** find (out-of-scope). Keeps the report focused.

### 2. Sweep

Enumerate every instance of the failure pattern. For this phase:

- Use Grep liberally. Check both obvious and adjacent filenames (a "webhook handler" drift might also show up in the debounce handler).
- For each hit, open the file and verify — is this really the pattern, or is it a false positive? Record file paths and line numbers so the human can follow.
- Consider the history: is the pattern shrinking, stable, or growing? (Check `git log` briefly if a trend would change prioritization.)

**Research only.** Do not edit code during the sweep itself. Edits belong in follow-up PRs against the tickets the sweep produces.

### 3. Prioritize

Rank findings into three buckets:

- **Ripe** — meets the ripe criteria; worth a ticket. Explain why.
- **Noted** — matches the pattern but below the bar (too small, too isolated, or acceptable given context). Mention briefly so the human can challenge the judgment.
- **Out of scope** — matches by shape but is intentional / different domain. Name them so the human knows you looked.

Ordering within ripe: correctness > safety > agent-readability > size. A small bug beats a big stylistic cleanup.

### 4. Report

Produce a single markdown report with:

- **TL;DR** — one paragraph. Number of ripe findings, headline concern.
- **Calibration** — the ripe criteria you used (from step 1).
- **Findings** — one section per ripe item. Include: name, what/where (with paths and line numbers), why it's ripe, suggested fix or design sketch, estimated blast radius.
- **Noted / out of scope** — a short list with one line each.
- **What's already great** — brief. If relevant patterns are already well-factored, say so. Balance matters — agents on the next sweep read this.
- **Suggested order** — a proposed sequence if the human acts on multiple items. Flag dependencies between them.

### 5. Offer follow-up

Ask the human:

- Create tickets? If yes, file one per ripe finding in the issue tracker. Follow the project's ticket conventions in `CLAUDE.md` — describe the scope, include implementation notes flagged as advisory (these are refactor tickets; notes are part of the scope), cross-reference related tickets in the batch.
- DNA updates? If any finding codifies a rule that's already de facto true (e.g. "always use `resolveOrg`"), propose the one-line DNA addition and apply it on approval. Do **not** pre-bake aspirational rules that describe the post-refactor state — those belong in the ticket's acceptance criteria, not DNA.
- Anything to add to [[DEFERRED]]? A noted-but-not-ripe item sometimes deserves a trigger-based entry if the cost of re-discovering it later is high.

## Ticket writing from findings

Refactor tickets look different from feature tickets. They're almost entirely implementation detail, and that's fine — flag implementation notes as **advisory**, per `CLAUDE.md`'s ticket-content rule. Things to include:

- A **Summary** that states the structural problem, not just the symptom.
- **Scope** — what's being touched, listed concretely (files, line numbers).
- **Design sketch (advisory)** — the shape of the refactor. Make clear it's one plausible design, not a mandate.
- **Acceptance criteria** — concrete, checkable. Include both behavior (tests pass) and structure (file X drops below N lines, pattern Y consolidates to one site).
- **Implementation notes** — gotchas, invariants that must survive, things that look wrong but are intentional. Quote other tickets, DNA, or AGENT_MISTAKES entries where they provide context.
- **Out of scope** — what *not* to change. Especially important when the refactor could tempt an agent into an adjacent area.

Cross-reference tickets inline when they share state (e.g. `<TICKET-A> may obsolete file Y — if that ships first, skip step Z`). Easier to rebase than to rediscover.

## When not to sweep

- If you haven't seen the pattern yet — do targeted debugging or a `/cleanse` first. `/sweep` is for suspected *shapes*, not specific bugs.
- If the scope is a single file — just read it and fix what you find.
- If the human only wants a quick check — offer that instead; `/sweep` is token-heavy by design.

## Output

Present the report inline, then ask the follow-up question (step 5). Don't silently create tickets or edit DNA without approval — these touch shared state.
