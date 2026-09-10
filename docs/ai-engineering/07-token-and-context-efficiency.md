# 7. Token and context efficiency

Unnecessary context is a cost. Correctness still wins.

## Do

- Read the smallest set of files that can support a correct edit.
- Prefer `src/utils/settlement.ts` over opening every file under `src/utils/`.
- Use Grep/Glob with a tight path (`src/store`, `src/components/ExpenseForm.tsx`) instead of repo-wide search.
- Expand to `docs/reference-data-model.md` or a migration only when types or schema are in play.
- Patch in place. Do not regenerate a 2,000-line store for a 10-line fix.

## Do not

- Re-read `tripStore.ts` or `App.tsx` after they are already in the conversation.
- Rediscover standing rules that `CLAUDE.md` / `.agents/AGENTS.md` already loaded.
- List the entire `src/components/` tree to “get oriented”.
- Paste large code blocks into the user reply when a short summary and a citation suffice.
- Open all nine files in this folder at once. This file is for when context is bloating or you are about to scan broadly.

## Hard stop

If skipping a read would make the change wrong (auth, RLS, settlement math, delete), read it. Token savings never beat a bad write to trip data.
