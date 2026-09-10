# 4. Implementation rules

Match this repo. Small diffs. No duplicate logic.

## Style and stack

- React 19 function components. `ref` is a regular prop (no `forwardRef`). Prefer `use()` over `useContext()` for new context reads.
- TypeScript, Vite, Zustand stores in `src/store/`.
- Direct imports. Do not add barrel `index.ts` re-exports.
- UI: existing components and CSS. Confirmations go through `ConfirmDialog`, not `window.confirm`.
- Icons: follow neighboring files (`src/components/Icons.tsx` or existing lucide usage). Do not introduce a new icon library.

## Reuse

| Need | Use |
|------|-----|
| Client DB | `src/services/supabaseClient.ts` |
| Trip mutations / fetch | `src/services/tripApi.ts` and `src/store/tripStore.ts` |
| Auth | `src/store/authStore.ts` |
| Settlement | `src/utils/settlement.ts` |
| Feature flags | `src/utils/featureFlags.ts` |
| Bugs / features CLIs | `npm run bug`, `npm run feature` (do not invent a second tracker) |

If the same helper already exists in `src/utils/`, call it. Do not copy the function into the component.

## Tests

This repo colocates Vitest files as `*.test.ts` next to the unit (`src/utils/settlement.test.ts`, `src/store/tripStore.test.ts`). Add or update a test when you change logic those files already cover, or when a new util needs a contract. Do not add a new test runner.

## Do not

- Rewrite a whole file for a local fix.
- Remove features, screens, or split modes unless the user asked.
- Add a dependency when Zustand, Supabase, or an existing util already solves it.
- Bypass RLS or put secrets in client code. Public anon key stays in the existing client pattern only.
