# 3. Plan the smallest correct change

Identify the minimum files. Prefer extending what exists. Do not redesign for a hypothetical future.

## Pick the smallest surface

- One screen → one component under `src/components/` (plus a store action if state changes).
- Shared math → `src/utils/` (settlement, currency, categories) and its colocated `*.test.ts`.
- Persistence / sync → existing `src/services/*` and `tripStore` / `authStore`. Do not add a parallel API layer.
- Schema → a new file under `supabase/migrations/` only when the data model must change. Never edit applied migrations in place.

Trace a dependency only when the change cannot be correct without it.

## Prefer

- A patch inside `tripStore.ts` or an existing modal over a new global store.
- Reusing `ConfirmDialog`, `src/components/common/*`, and existing CSS patterns over new primitives.
- Extending `src/services/supabaseClient.ts` usage over a second client.

## Do not

- Change architecture, public APIs, database schema, or dependencies unless the requirement needs it.
- Add Zustand stores, context providers, or npm packages “for later”.
- Touch Capacitor native projects, Codemagic, or `npm run cap:sync` on a web-only task.
- Introduce abstractions (generic hooks, barrel files, new design tokens) that the current call site does not use.

## Backward compatibility

Join codes, offline receipt queue, RLS policies, and settlement results are user-visible contracts. Preserve them unless the user asked to change that contract.

The goal is not only working code. It is working code that fits this repo.
