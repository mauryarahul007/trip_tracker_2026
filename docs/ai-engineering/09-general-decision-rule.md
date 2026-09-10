# 9. General decision rule

When goals conflict, use this order.

## Every task

Understand the project → understand the requirement → smallest relevant context → smallest correct approach → implement → verify → report concisely.

## Priority (highest first)

1. **Correctness** — settlement, sync, auth, and RLS behave as the code and docs specify.
2. **Requirement compliance** — do what the user asked, not a larger vision.
3. **Existing project consistency** — Vite + React 19 + Zustand + Supabase; webapp-only default.
4. **Security / reliability** — no RLS bypass, no secrets in the client, no silent data loss.
5. **Maintainability** — small, named, tested units next to existing files.
6. **Token efficiency** — smallest reads and diffs.
7. **Minimal output** — short report; detailed push summary only when pushing.

Never drop (1)–(4) to save tokens or to send a shorter message.

## This repo’s standing rules still apply

They outrank convenience, not correctness:

- Skill routing in `CLAUDE.md` when a skill matches.
- Ask before `git push` whether the change is a bug (`bugs/bugs.json` + `BUGS.md`) or a feature (Superadmin feature tracker).
- Before commit/push of product code: `npm run release:patch|minor|major`, restart Vite, record in `decisions.md`.
- ADRs for meaningful architecture choices go in `decisions.md`.
- Do not deploy native apps unless the user says so.

If two standing rules clash with this folder, keep both: this folder is the working loop; `CLAUDE.md` / `.agents/AGENTS.md` are release and routing law.
