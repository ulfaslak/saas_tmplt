# Review

Self-review of work done in the current session.

## Steps

### 1. Enumerate changes

List every file changed in the current working branch (compared to `origin/main`). For each file, write a one-line summary of what changed and why.

### 2. Correctness review

Re-read each changed file in full. For each one, check:

- **Logic errors**: off-by-ones, wrong conditions, missing early returns, race conditions.
- **Regressions**: did the change break an existing behavior or contract? Check callers of any function whose signature or semantics changed.
- **Consistency**: does the change follow the patterns established by neighboring code? If it introduces a new pattern, is there a good reason?
- **Security**: no injection vectors, no secrets in code, no unvalidated external input passed to sensitive operations.

Flag anything found. Fix it if straightforward; otherwise present it to the human.

### 3. Edge cases and failure modes

For each changed component, think through:

- What happens when inputs are empty, null, or unexpectedly large?
- What happens when external calls (DB, API, network) fail?
- What happens on concurrent access or rapid user interaction?
- What state is left behind after a partial failure?
- Will this behave correctly after a page reload, navigation, or session expiry?

List any edge cases that are not handled. For each, assess severity (will it crash? corrupt data? just look wrong?) and recommend whether to fix now or defer.

### 4. Test coverage

Consult the **Testing ideology** section in `AGENTS/DNA/DEVELOPMENT.md`, then assess:

- Are there existing tests that cover the changed behavior? If you haven't already, run them and confirm they pass.
- Does the change introduce new logic that warrants a test? Apply the testing ideology in `AGENTS/DNA/DEVELOPMENT.md`.

If new tests are needed, write them. If coverage is sufficient, state why.

### 5. Summary

Present a concise summary of your findings, and as applicable state your plan for fixing any issues found.