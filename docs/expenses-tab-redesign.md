# Expenses Tab & Trip Dashboard Redesign

Reference doc for porting the `material-ui` branch's Expenses-tab and
trip-dashboard changes onto `main`. Everything below is real, committed
work on `material-ui` — `main` has none of it yet. Commit hashes are given
so you can `git show <hash>` or `git cherry-pick <hash>` any individual
piece instead of re-implementing from scratch.

```
git log main..material-ui --oneline
7b39e80 feat(expenses): collapsible day groups with sticky headers
927056b fix(expenses): permanently remove the Your Balance/Trip Spent banner
f0ab401 feat(balances): restore boarding-pass balance summary card
4dc6fa8 fix(expenses): move balance summary banner below the ledger
eb5d497 fix(trips): remove inline position:relative overriding the floating header
955fc9f fix(trips): measure real header height, brighten ambient backdrop, require dates
bd05500 fix(trips): reject map/flag/logo images from the ambient photo backdrop
1dc4a91 fix(trips): persist destination and stops to the database
f32d3f3 feat(trips): multi-stop route planner, translucent header map & ambient tourism photo slideshow
1de6cc8 feat(theme): apply Skyline Escape blue-teal Material 3 retheme
```

**Do not cherry-pick `f32d3f3` wholesale** — alongside the real feature work
it also bulk-committed the `ui-ux-pro-max` and `material-design-3-guide`
skill directories (176 files, most of the diff). Port the *code* changes
listed below individually instead.

---

## 1. Skyline Escape theme (`1de6cc8`)

Retheme from the old cream/teal "ledger paper" palette to a blue→teal
Material-3-inspired palette. All done through `src/index.css`'s existing
CSS custom-property token system, so components didn't need per-file
changes for color — only literal hardcoded hex/rgba values that bypassed
the tokens needed fixing (see file list below).

**Token changes** (`src/index.css`, both light `:root` and dark
`@media`/`[data-theme="dark"]` blocks):
- `--primary-accent`: `#1F6E68` → `#2F6FED` (light) / `#59BDB2` → `#7FA6FF` (dark)
- `--secondary-accent`: brass → `#17B6A6` teal
- `--color-success` → teal, `--color-danger` → warm red, tuned to the new palette
- New tokens: `--header-gradient`, `--header-gradient-scrolled`,
  `--header-gradient-solid` (translucent vs. solid blue→teal gradients)
- `--border-radius-sm/md/lg`: `6/10/16px` → `10/14/22px` (pill-heavier shape language)
- `--font-family-title`: `Fraunces` → `Plus Jakarta Sans` (self-hosted as
  `woff2` in `src/assets/fonts/`, matching the project's existing
  self-hosted-font convention — **not** a Google Fonts `<link>`, since the
  CSP's `style-src`/`font-src` don't allow external font hosts)

**Header background**: `.app-header` / `.trip-dashboard-header` switched
from a flat navy `background-color` to `background-image: var(--header-gradient*)`.

**Global button/chip shape**: `.gradient-btn`, `.secondary-btn` border-radius
bumped from `var(--border-radius-sm)` to `var(--border-radius-pill)`.

**Files touched**: `src/index.css`, `index.html` (`theme-color` meta),
`src/App.tsx`, `src/components/GlobalSettingsModal.tsx`,
`src/components/ExpenseForm.tsx`, `src/components/NotificationsBellButton.tsx`,
`src/components/SettingsView.tsx`, `src/components/TripsListScreen.tsx`,
`src/components/MembersGroupsTab.tsx`, `src/components/ExpenseList.tsx`,
`src/components/ExpenseReviewModal.tsx`, `src/components/TripJourneyMap.tsx`,
`src/components/LoginScreen.tsx`, `src/components/ResetPasswordScreen.tsx`,
`src/utils/avatarColor.ts` — each had a handful of hardcoded old-brand hex
literals (`#1F6E68`, `#F2ECDC`, `#00BFA5`, and their `rgba()` forms) that
bypassed the token system and needed direct replacement.

**Intentionally skipped**: `src/components/admin/ops-deck.css`,
`src/components/SuperadminAuthModal.tsx` (superadmin-only tooling, not
part of the traveler-facing app), `TripWrappedModal.tsx` (its own
self-contained dark card, a deliberate visual exception).

---

## 2. Trip header: gradient banner, real route map, dynamic height

**Route stops on the trip** (`1dc4a91`, schema): Added a Supabase
migration (`supabase/migrations/0067_add_trip_destination_and_stops.sql`)
adding `destination text` and `stops jsonb` columns to `trips`. Without
this migration, `TripBannerRouteMap` and `AmbientPhotoBackdrop` (below)
have no data to work with — **this must land before the rest of section 2
does anything visible**. Also fixed `insertTrip`/`updateTripRow` in
`src/services/tripApi.ts`, which accepted `destination`/`stops` as
parameters but never actually included them in the Supabase
insert/update payload (silently dropped on every save), and extended
`mapTrip()` + `src/types/database.ts`'s `TripRow` type to read them back.

**Translucent route map banner** (`f32d3f3`): `src/components/
TripBannerRouteMap.tsx` — a MapLibre GL map absolutely-positioned inside
the trip header (`inset: 0`, low opacity, `mixBlendMode: luminosity`),
plotting numbered pins + a route line for the trip's stops. Renders
`null` if the trip has no stops with resolvable coordinates.

**Header height bug** (`eb5d497`, the real fix; `955fc9f` was the first,
incomplete attempt): the `<header>` JSX had an inline
`style={{ position: 'relative' }}` that overrode its own CSS class's
`position: absolute`. That pulled the header into normal document flow,
pushing `.tab-pane` down by the header's real height *naturally* — while
`.tab-pane`'s own `padding-top` (sized to clear a *floating* header) added
that same clearance a second time, compounding into a large dead gap
between the header and the first card. Fix: remove the inline
`position: 'relative'` (keep `overflow: 'hidden'`, needed to clip the map
layer), restoring the header to `position: absolute` as its CSS class
already specified.

**Dynamic header height** (`955fc9f`): the header's real height varies
(destination/upcoming-badge eyebrow line, the route-stops chip row), so a
fixed pixel guess in `.tab-pane`'s `padding-top` either overlapped the
header or left a gap. `src/App.tsx` now measures the header with a
`ResizeObserver` and exposes `--trip-header-height` as a CSS custom
property; `.tab-pane` in `src/index.css` uses
`calc(var(--trip-header-height, 126px) + 12px)` instead of a bare
constant.

---

## 3. Ambient tourism photo backdrop (`f32d3f3`, `bd05500`, `955fc9f`)

`src/components/AmbientPhotoBackdrop.tsx` + `src/services/
placeImageService.ts`: fetches a real photo per trip stop (or the
overall destination) from Wikipedia/Wikimedia and shows it as a very
subtle, slowly cross-fading full-screen backdrop behind the trip
dashboard's tabs (`position: fixed`, low opacity, blurred).

Two bugs found and fixed while testing:
- **Wrong images (locator maps, flags, coats of arms)**: Wikipedia/
  Wikivoyage articles frequently lead with an infobox map/flag/seal
  instead of a photo (confirmed live: the real Wikivoyage page for "Goa"
  leads with `Map-India-Goa01.png`). `isPhotoUrl()` in
  `placeImageService.ts` only excluded `.svg` — extended it to also
  reject filenames matching `map|locator|flag-of|coat-of-arms|seal-of|
  emblem|logo|chart|diagram` (case-insensitive), and added a Wikivoyage
  lookup *before* the existing Wikipedia summary/generator-search chain
  (Wikivoyage is a travel guide, so its lead image is usually genuine
  destination photography). Required adding `en.wikivoyage.org` to
  `index.html`'s CSP `connect-src`.
- **Invisible despite loading correctly**: confirmed via the browser's
  Network tab that photos *were* fetching successfully, but rendered at
  `opacity: 0.16` + `blur(10px)`, which read as a flat color wash against
  the new light Skyline Escape background. Bumped to `opacity: 0.5` /
  `blur(4px)`.

---

## 4. Balances & Settlements screen

The "Suggested Settlements" and "Member & Group Balances" collapsible
sections you're seeing came from `f32d3f3`'s rewrite of
`src/components/BalancesSettlements.tsx` (`isTransfersExpanded` /
`isMembersSectionExpanded` state, WhatsApp-style `wa-group-card` styling)
— this is a from-scratch rewrite of that screen, not a small diff; treat
`main`'s current `BalancesSettlements.tsx` as needing full replacement
rather than a patch.

**Restored "Balance summary" boarding-pass card** (`f0ab401`): that same
`f32d3f3` rewrite had *removed* the older ticket-style summary card
(dashed perforation, rotated Settled/Unsettled stamp, big outstanding
amount, narrative sentence like "X owes Y, driven by Z spend", member/
transfer-count footer). Restored it from the commit right before removal
(`8f6aafc`) and re-added it above the newer Suggested Settlements
section (both now coexist). CSS classes: `.boarding-pass`, `.bp-top`,
`.bp-eyebrow`, `.bp-title`, `.bp-meta`, `.bp-perf` (dashed perforation +
punch-hole pseudo-elements), `.bp-body`, `.bp-who`, `.bp-amount`,
`.bp-sub`, `.bp-stamp-pos`, `.bp-foot`, `.stamp-badge` (+ `@keyframes
stampIn`) — all reference the *current* semantic tokens
(`--bg-surface`, `--color-danger`, etc.), so it automatically renders in
whatever palette is active rather than being hardcoded to the old colors.

---

## 5. Expenses tab specifically

**Redundant balance banner removed** (`4dc6fa8` moved it, `927056b`
removed it permanently): `ExpenseList.tsx` used to show a "Your Balance /
Trip Spent" banner above the ledger. First moved it below the ledger (so
it summarized the transactions just shown instead of sitting above an
empty list), then removed it entirely once the boarding-pass card
(section 4) was restored and made it redundant. Removal was a full
cleanup, not just hiding JSX: deleted the dead `myMemberId` /
`onGoToBalances` / `myNetBalance` / `totalTripSpent` props from
`ExpenseList`'s prop type and destructuring, the now-unused
`myNetBalance` `useMemo` in `App.tsx`, and the `.m3-balance-banner*` CSS
rules.

**Collapsible day groups with sticky headers** (`7b39e80`, the latest):
the flat transaction list (with simple inline date-divider rows) became
unwieldy as trips accumulate transactions. `ExpenseList.tsx` now groups
`displayedExpenses` into per-date sections:

```ts
const dayGroups = displayedExpenses.reduce<{ date: string; expenses: Expense[] }[]>(
  (groups, exp) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.date === exp.date) lastGroup.expenses.push(exp);
    else groups.push({ date: exp.date, expenses: [exp] });
    return groups;
  },
  []
);
```

- The two most recent day-groups (expenses already arrive newest-date-first)
  expand by default; older groups collapse into a tappable one-line
  summary (`{count} · {day total}`).
- Collapse state is an **override map keyed by date string**
  (`collapseOverrides: Record<string, boolean>`), not by list index or a
  plain "collapsed set" — the default (first 2 groups open) is
  recomputed fresh every render from `dayGroups`, and only *explicit user
  toggles* are stored. This is what makes it survive `Load More` /
  filter changes without fighting a user's manual expand/collapse
  choices.
- Each day header is `position: sticky; top: 0` inside the scrolling
  `.tab-pane`, so it pins while its day's rows scroll past.

---

## Porting checklist for `main`

1. Migration `0067_add_trip_destination_and_stops.sql` — apply to the DB
   first (this is a shared database, so it's likely *already applied* in
   production; just confirm before re-running).
2. `src/index.css` token block + font self-hosting (section 1) — the
   foundation everything else assumes.
3. `tripApi.ts` / `database.ts` fixes (section 2) — needed for stops/
   destination to persist at all.
4. `TripBannerRouteMap.tsx`, `AmbientPhotoBackdrop.tsx`,
   `placeImageService.ts` (+ its test file) — net-new files, straightforward
   to copy across once (2) is in place.
5. `App.tsx`'s header `ResizeObserver` + the inline `position: relative`
   removal (section 2) — copy both together, the second makes the first
   meaningful.
6. `BalancesSettlements.tsx` full rewrite + boarding-pass restoration
   (section 4) — biggest single diff, budget the most review time here.
7. `ExpenseList.tsx` banner removal + day-grouping (section 5) — last,
   since it's easiest to verify in isolation once the rest renders correctly.
