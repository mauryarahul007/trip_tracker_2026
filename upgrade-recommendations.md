# Upgrade Recommendations

Analysis of the codebase (Aug 11, 2026) — 15 proposed upgrades, visual and logical, ranked by category.

## Architecture / code health

1. **App.tsx monolith** — 1230 lines, 40+ `useState` hooks, every tab's form logic crammed in one file (`src/App.tsx`). Split into per-feature hooks (`useExpenseForm`, `useGroupForm`, `useTripForm`) or container components per tab. Biggest win for maintainability.

2. **Zero memoization on derived state** — `calculateSettlements`, `categoryTotals`, `memberSpentMap`, `dailySpendData` (`src/App.tsx:242-324`) recompute on every render, including unrelated keystrokes (search box, form typing). Wrap in `useMemo`.

3. **`visibleMembers` recreated every render** — forces `eslint-disable-next-line react-hooks/exhaustive-deps` workarounds in two effects (`src/App.tsx:359-364`, `394-396`). Memoize `activeTripMembers`/`visibleMembers` once, drop the disable comments.

4. **Zero test files in repo** — settlement math (`src/utils/settlement.ts`, `resolveShares` in `tripStore.ts:83-139`) handles real money splits (equal/custom/exact/percentage + group netting) with no automated coverage. Highest-risk logic in the app, none of it regression-tested.

5. **Currency symbol logic duplicated 4+ times** — `baseCurrency === 'INR' ? '₹' : baseCurrency` repeated in `App.tsx`, `AnalyticsTab.tsx:31`, `ExpenseList.tsx:69`, `App.tsx:830`. Extract `getCurrencySymbol(code)` util once.

## Logical / reliability

6. **"Offline-first" claim doesn't match behavior** — `manifest.json:5` says "Offline-first cost splitting," but every mutation (`addExpense`, `updateExpense`, etc. in `tripStore.ts`) awaits the Supabase round-trip before updating UI state. No optimistic update, no offline queue, despite a registered `sw.js`. Either drop the claim or add optimistic updates + a mutation queue for flaky connections.

7. **No ErrorBoundary anywhere** — uncaught render error = blank white screen, no recovery UI. One boundary around the trip dashboard would catch it.

8. **Category color collision risk** — `CATEGORY_COLORS` hardcoded map + 5-color fallback array cycled by `idx % 5` (`App.tsx:259-271`). Trips with 6+ custom categories get repeated colors in charts. Switch to deterministic hash-based color assignment.

9. **Double confirmation friction on delete** — modal confirm (`ConfirmDialog`) *then* a 5-second undo toast for the same delete action (expenses/trips/groups). Redundant guard rails slow down a common action; keep the modal only for truly destructive ops (`Clear All Data`) and rely on undo-toast alone for everything else.

## Performance

10. **No debounce on expense search** — every keystroke in `ExpenseList` search filters the full list and re-triggers the (currently unmemoized) settlement/analytics pipeline. Debounce + memoize fixes both at once.

11. **No virtualization on expense list** — `ExpenseList.tsx` renders every row with full inline-style objects; fine now, degrades once a trip has hundreds of expenses. Worth `react-window` or simple pagination past ~100 rows.

## UI / UX

12. **Tab switch fully unmounts inactive tabs** — `activeTab === 'x' && <Tab/>` (`App.tsx:1017-1190`) remounts the whole subtree on every switch, losing scroll position. CSS-based show/hide (`display:none`) would feel smoother.

13. **Inline styles everywhere instead of CSS classes** — nearly every component hand-writes `style={{...}}` blocks (see `AnalyticsTab.tsx`, `ExpenseList.tsx`). Fine for one-offs, but repeated patterns (stat-card label, section header) should be CSS classes — current approach risks visual drift between light/dark themes since each spot must independently reference the right token.

14. **PWA installed but no install prompt** — manifest + service worker exist, but nothing surfaces "Add to Home Screen" to the user. Easy win: listen for `beforeinstallprompt`, show a CTA in Settings.

15. **Analytics line chart gets cramped** — `AnalyticsTab.tsx:180-258` prints a permanent value+date label under every data point with no hover tooltip. Past ~10 days of data, labels overlap. Switch to hover/tap tooltips, thin the always-visible labels.

## Priority pick

Biggest bang-for-buck if only a few get done: **#1** (split App.tsx), **#2/#3** (memoize derived state), **#4** (test the money math), **#6** (fix the offline-first mismatch).
