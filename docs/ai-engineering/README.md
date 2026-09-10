# AI software-engineering procedure

Agent operating docs for Trip Tracker 2026. Not product user docs.

The always-on Cursor rule (`.cursor/rules/ai-software-engineering.mdc`) holds the loop. **Open only the phase you are in.** Do not load this whole folder at once.

## When to read which file

| Phase | Open this | When |
|-------|-----------|------|
| 1 | [01-understand-before-you-build.md](01-understand-before-you-build.md) | Starting a task; you do not yet know which files matter |
| 2 | [02-understand-the-requirement.md](02-understand-the-requirement.md) | The request is ambiguous, or you need to know what must not change |
| 3 | [03-plan-the-smallest-correct-change.md](03-plan-the-smallest-correct-change.md) | Before editing; choosing files and approach |
| 4 | [04-implementation-rules.md](04-implementation-rules.md) | While writing or patching code |
| 5 | [05-debugging.md](05-debugging.md) | A bug, stack trace, or failing test is the task |
| 6 | [06-verification.md](06-verification.md) | After a code change, before declaring done |
| 7 | [07-token-and-context-efficiency.md](07-token-and-context-efficiency.md) | Context is growing, or you are about to scan broadly |
| 8 | [08-output-rules.md](08-output-rules.md) | Writing the user-facing result |
| 9 | [09-general-decision-rule.md](09-general-decision-rule.md) | Priorities conflict (correctness vs speed vs existing patterns) |

## Standing repo rules (already always-on)

Do not copy these into every phase doc. Follow them from the source:

- [`CLAUDE.md`](../../CLAUDE.md) — skill routing, bug/feature logging before push, version bump + Vite restart
- [`.agents/AGENTS.md`](../../.agents/AGENTS.md) — ADRs in `decisions.md`, commit narrative, webapp-only default, post-push cleanup

## Product docs vs this folder

User-facing Diataxis docs (`docs/howto-*`, `docs/reference-*`, `docs/explanation-*`) describe the app. Use those as **source of truth for product behavior**. This folder describes **how the agent should work**.
