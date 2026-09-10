# 6. Verification

Run only the checks the change needs. Say what you could not run.

## Match the change to a command

| Change | Run |
|--------|-----|
| Formatting / obvious JS issues | `npm run lint` (oxlint) |
| One util, store, or component with a colocated test | `npx vitest run path/to/file.test.ts` |
| Cross-cutting store/API behavior | `npm test` (`vitest run`) |
| Types, imports, or production bundle | `npm run build` (`tsc -b` && Vite build && service-worker stamp) |
| UI, layout, routing, or client state | Exercise the flow in the browser (not a screenshot alone) |

Do not run Codemagic, `npm run cap:sync`, or native builds unless the user asked for native work.

## UI / layout

If you changed what the user sees, click through that flow. Check other screens that share the same store fields (for example expense list + analytics + balances after a split change). Cover empty and error states when the patch touches them. Desktop and a narrow viewport when layout changed.

## After verify

- State which commands ran and whether they passed.
- If the browser was not available, say that and what you used instead (tests, `npm run build`).
- Do not claim “all tests pass” if you only ran one file.

## Standing release checks (only when committing / pushing)

Version bump, Vite restart, `decisions.md`, and bug/feature logging live in `CLAUDE.md` and `.agents/AGENTS.md`. They are not part of day-to-day verification of a local patch.
