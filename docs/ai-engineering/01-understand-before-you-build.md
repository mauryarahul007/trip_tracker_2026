# 1. Understand before you build

Inspect only the parts of Trip Tracker that the request needs. Expand context when the current files are not enough.

## Start here (in this order)

1. `package.json` — scripts, stack (React 19, Vite, Zustand, Supabase, Capacitor, Vitest, oxlint).
2. `CLAUDE.md` and `.agents/AGENTS.md` — standing agent rules.
3. The matching product doc under `docs/` if one exists (for example `docs/reference-data-model.md` for types, `docs/howto-record-expense.md` for expense UX).
4. The nearest entry: `src/main.tsx`, `src/App.tsx`, then the store/service/component named in the request.

## Where behavior usually lives

| Concern | Look first |
|---------|------------|
| Trip, expense, member, settlement state | `src/store/tripStore.ts` |
| Auth / session | `src/store/authStore.ts` |
| Supabase client | `src/services/supabaseClient.ts` |
| Trip API / sync | `src/services/tripApi.ts` |
| Split / settlement math | `src/utils/settlement.ts` |
| UI for a screen | `src/components/` (and `src/components/admin/` for Ops Deck) |
| Schema / RLS | `supabase/migrations/` |
| Tests for the same unit | colocated `*.test.ts` next to the file |

Treat project docs and the user's words as the source of truth. Do not assume a different framework, folder layout, or API than what is in this repo.

## Do

- Reuse existing architecture, naming, and dependencies.
- Follow a type, store action, or component from its call site only when the task needs that path.

## Do not

- Glob the whole repository or list every file under `src/`.
- Read every `docs/*.md` file “for background”.
- Assume Next.js, Redux, or a REST API. This app is Vite + React 19 + Zustand + Supabase.
