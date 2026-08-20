# Environment notes

Hard-won facts about the local dev environment, the shared resources agents
collide on, and how to verify things on prod. None of it is derivable from the
code, and all of it has cost at least one session.

**Why this file exists.** Facts discovered by one agent and written only into
that agent's private memory are invisible to every other agent — another CLI's
session, a collaborator's session, or a Claude launched from a different
directory sees none of it, so the same trap gets rediscovered at full cost.
Anything true about *how this repo behaves* belongs here. Private memory is
for preferences and conversational state, never for project facts.

This is **record-keeping, not DNA** — it describes what happens to be true
right now, so entries change and get deleted as bugs get fixed. When you fix
something listed here, remove the entry in the same PR.

---

## The shared local resources

One machine runs **one** Postgres container (`docker compose up -d postgres`)
and **one** Playwright browser profile, while many worktrees run their own dev
servers against them. When a local failure is confusing, suspect contention
between worktrees before suspecting your change.

- **`app_test` is one database shared by every worktree.** Two concurrent
  `pnpm test:integration` runs interfere with each other.
- **The dev database is shared too.** A migration applied from one worktree is
  visible to all of them.

> ⚠️ **Template placeholder.** The entries above describe the template's
> defaults — verify they match your setup, then extend this file as your
> environment grows its own traps (ports, seeded accounts, staging access,
> build quirks). Delete this admonition once the file reflects your project.
