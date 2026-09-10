# 2. Understand the requirement

Before coding, know what the user wants, what must stay the same, and what would be unsafe to guess.

## Determine

- The actual request (feature, fix, or docs), not a broader rewrite.
- Inputs and outputs (UI action, store update, Supabase write, CSV, push, etc.).
- Existing behavior that must be preserved (split modes, RLS, offline queue, join codes, settlement).
- Constraints already in the repo: webapp-only by default, ConfirmDialog instead of `window.confirm`, no new deps if the tree already solves it.

## Infer from this app when the request is incomplete

If the user is vague but the feature already exists, match current patterns:

- Expenses: four split modes, undo-delete / recycle bin, receipt attach via existing compress + offline queue.
- Members: join code / link, groups for split selection.
- Sync: Zustand store + `tripApi` + Supabase RLS; do not invent a second source of truth.
- Admin: Superadmin Ops Deck under `src/components/admin/`, not a new portal.

Default target is the **webapp**. Native Android/iOS wrappers (`android/`, `ios/`, Capacitor plugins) stay untouched unless the user explicitly asks.

## Ask once, then proceed

Ask **one** concise question only when a wrong guess would be destructive or irreversible (schema, auth, delete paths, native deploy, public security).

Do not ask for permission to follow existing patterns, file names, or stack choices that the repo already settled.

## Do not

- Expand the request into a platform rewrite, new design system, or extra features “while we are here”.
- Change iOS/Android build pipelines because a web UI changed.
