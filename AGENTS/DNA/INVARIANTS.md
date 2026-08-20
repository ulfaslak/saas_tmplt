# Invariants

What must stay true at runtime, and the failure that taught it.

**Admission test: could you write a test that fails when this stops being
true?** If yes, it belongs here. A choice among alternatives goes in
[[DECISIONS]]. Where code lives goes in [[ARCHITECTURE]]. Anything a customer
can observe goes in [[PRODUCT]]. A fact that is here is not in those files — a
second copy drifts, and the two disagree silently.

**One entry per invariant** — that part is absolute. The `###` heading states
the rule, phrased so it can be violated. Under it: the mechanism that enforces
it, and the incident that made it necessary.

Past **~600 characters**, stop and re-read: an entry that long is usually
several invariants fused, and each one becomes checkable on its own once split.
It is a smell, not a cap — a single rule whose incident is genuinely long may
run past it. What must never happen is two rules sharing a heading, at any
length. (An *Orientation* block, which sketches a flow so the entries below it
make sense, is exempt from both. Mark it as one.)

An entry that no longer matches the code is a bug in one of them. Find out
which before you trust it.

Group entries under `##` topic headings as they accumulate (e.g. "Webhooks",
"Auth", "Background jobs").

> ⚠️ **Template placeholder.** This file starts empty on purpose — invariants
> are earned, not invented. The first entries usually arrive via Phase 3 of the
> test-fix-learn cycle: when a bug teaches you a rule that must never break
> again, record it here with the incident. Delete this admonition once the
> first real entry lands.

---

*(No invariants recorded yet.)*
