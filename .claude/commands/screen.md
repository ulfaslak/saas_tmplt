# Screen

A focused search for **one specific failure mode** across the codebase, followed by a prioritized report and (on approval) GitHub issues + DNA updates.

A screen is different from a [[cleanse]]:

- `/cleanse` checks DNA-to-code consistency. Scope is the DNA. Outcome is a coherent spec.
- `/screen` checks a single suspected failure pattern against the whole codebase. Scope is the code. Outcome is a ranked list of concrete findings, each actionable as a ticket.

Use `/screen` when you suspect a class of problem is present but haven't seen it enumerated. The user names the failure mode (or picks from the menu); this skill enumerates everywhere it shows up, ranks by impact, and feeds the result back as tickets.

## Invocation

`/screen <failure-mode>` — runs the screen directly.

`/screen` alone — present the menu below, ask the user to pick one, then run. The user may also describe a mode freeform ("find places where we construct dates without timezone awareness").

## The menu

Each entry is a failure *pattern* — not a specific bug, but a shape of mistake that recurs in codebases and misleads an agent that only has the code to go on. Pick the one most relevant to current concerns.

1. **Many ways to do one thing** — N patterns for the same job (the auth lookup, the error shape, date construction, logging) and nothing says which is canonical. The agent picks one at random or invents another, and the spread grows. Fix: decide, refactor the stragglers, write the rule down. Mild form: one dominant pattern with a few exceptions and no rule saying so.

2. **Copies that have drifted** — duplicated logic whose copies now disagree, so a fix lands in one and the others keep the bug. The agent has no reason to look for the siblings. Fix: one implementation, or a test that pins the copies equal.

3. **Invariants enforced by memory** — a rule every call site must remember: the tenant filter, the soft-delete filter, the transaction wrapper, the validator at a write boundary, the permission check. Forgotten once, copied forever, because the agent learns the pattern from the nearest example. Fix: a helper, type, or middleware that makes forgetting impossible.

4. **Facts that must change together** — the same fact in several places with nothing linking them: a roster in three files, an enum mirrored in the DB and the UI, a key string shared by a producer and a consumer, a UI check and its server-side twin. The agent updates the one it found. Fix: one source and derive the rest, or a test that fails when they diverge.

5. **Names and docs that lie** — identifiers, comments, docs, and context files that no longer match behaviour. The agent believes them, because it has nothing else. Fix: rename or delete; never leave a lie standing.

6. **One word, two meanings** — overloaded vocabulary (a "case" that is a DB row here and a legal matter there), so grep returns the wrong thing and the agent reasons about the wrong concept. Fix: a glossary, and rename the minority meaning.

7. **Failures that don't fail** — swallowed errors, defaults that mask missing data, fallbacks that hide breakage. The system proceeds with bad state and "tests green" stops being evidence. Fix: fail loudly at the boundary.

8. **Tests that can't fail** — tautological mocks, assertions on the mock itself, skipped tests, snapshots of bugs. They lend false confidence to every change the agent makes. Fix: delete them or make them bite.

9. **Code that looks alive** — dead exports, always-on feature flags, abandoned migrations, the unused one of two implementations. The agent copies the corpse as if it were the pattern. Fix: delete.

10. **Blast radius without a guard** — scripts and entry points that can hurt production, shared resources, or other sessions with no dry-run, confirmation, or scope check. An agent will run them at speed. Fix: guard, dry-run flag, allowlist.

11. **Freeform** — user describes the shape. Treat their description as the screening criterion and proceed.

## Procedure

### 1. Scope & calibration

Before searching:

- Read the relevant DNA files (`ARCHITECTURE`, `DECISIONS`, plus whatever the failure mode touches — e.g. `DEVELOPMENT` for DB patterns, `UI_SPEC` for frontend drift).
- Define **"ripe" criteria** for this specific screen. What counts as a finding worth fixing vs. a finding worth leaving? Be explicit — write it down in the report. Example: "a duplicated handler is ripe if the copies have already drifted; a 3-line boilerplate repeated twice is not."
- Define what the screen deliberately **won't** find (out-of-scope). Keeps the report focused.

### 2. Screen

Enumerate every instance of the failure pattern. For this phase:

- Use Grep liberally. Check both obvious and adjacent filenames (a "webhook handler" drift might also show up in the retry or debounce path).
- For each hit, open the file and verify — is this really the pattern, or is it a false positive? Record file paths and line numbers so the human can follow.
- Consider the history: is the pattern shrinking, stable, or growing? (Check `git log` briefly if a trend would change prioritization.)

**Research only.** Do not edit code during the screen itself. Edits belong in follow-up PRs against the tickets the screen produces.

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
- **What's already great** — brief. If relevant patterns are already well-factored, say so. Balance matters — agents on the next screen read this.
- **Suggested order** — a proposed sequence if the human acts on multiple items. Flag dependencies between them.

### 5. Offer follow-up

Ask the human:

- Create GitHub issues? If yes, file one per ripe finding (`gh issue create`). Follow the project's issue conventions in `CLAUDE.md` — describe the scope, include implementation notes flagged as advisory (these are refactor issues; notes are part of the scope), cross-reference related issues in the batch.
- DNA updates? If any finding codifies a rule that's already de facto true (e.g. "always go through the org-resolving helper"), propose the one-line DNA addition and apply it on approval. Do **not** pre-bake aspirational rules that describe the post-refactor state — those belong in the ticket's acceptance criteria, not DNA.
- Anything to add to [[DEFERRED]]? A noted-but-not-ripe item sometimes deserves a trigger-based entry if the cost of re-discovering it later is high.

## Ticket writing from findings

Refactor tickets look different from feature tickets. They're almost entirely implementation detail, and that's fine — flag implementation notes as **advisory**, per `CLAUDE.md`'s ticket-content rule. Things to include:

- A **Summary** that states the structural problem, not just the symptom.
- **Scope** — what's being touched, listed concretely (files, line numbers).
- **Design sketch (advisory)** — the shape of the refactor. Make clear it's one plausible design, not a mandate.
- **Acceptance criteria** — concrete, checkable. Include both behavior (tests pass) and structure (file X drops below N lines, pattern Y consolidates to one site).
- **Implementation notes** — gotchas, invariants that must survive, things that look wrong but are intentional. Quote other tickets, DNA, or AGENT_MISTAKES entries where they provide context.
- **Out of scope** — what *not* to change. Especially important when the refactor could tempt an agent into an adjacent area.

Cross-reference issues inline when they share state (e.g. `#N may obsolete file Y — if that ships first, skip step Z`). Easier to rebase than to rediscover.

## When not to screen

- If you haven't seen the pattern yet — do targeted debugging or a `/cleanse` first. `/screen` is for suspected *shapes*, not specific bugs.
- If the scope is a single file — just read it and fix what you find.
- If the human only wants a quick check — offer that instead; `/screen` is token-heavy by design.

## Output

Present the report inline, then ask the follow-up question (step 5). Don't silently create tickets or edit DNA without approval — these touch shared state.
