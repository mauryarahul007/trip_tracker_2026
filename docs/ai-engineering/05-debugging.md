# 5. Debugging

Find the actual failure. Fix the root cause with the smallest safe patch. Do not refactor around it.

## Steps

1. Name the failure: UI symptom, Vitest assertion, `tsc` error, oxlint finding, or runtime exception.
2. Read the stack, the failing function, and its immediate callees. Typical homes: `src/store/tripStore.ts`, `src/services/tripApi.ts`, `src/utils/settlement.ts`, the screen under `src/components/`.
3. Reproduce with the existing tool: a targeted Vitest file, the Vite app at `http://localhost:5173`, or the logged error. Logical trace is enough when you cannot run the UI.
4. Fix the cause (wrong selector, stale Zustand state, unhandled Supabase error, off-by-one in settlement), not only a catch-and-ignore.
5. Check the same path still works: related split mode, offline/online, auth vs logged-out.

## Do

- Keep the diff inside the failing unit plus its test.
- If a test already describes the bug, make that test pass; do not delete it.

## Do not

- Broad-refactor stores, restyle the screen, or “clean up” unused imports across the app while hunting a bug.
- Restart from a new architecture because the stack trace is ugly.
- Touch native shells because a web exception fired.

If three honest fixes fail, stop and report the blocker with the evidence you have (error text, file, what you tried).
