# Reference: Design System

Trip Tracker's visual identity is a "travel ledger" — a shared paper ledger for a
group of friends, not a fintech admin panel. This page documents the tokens,
type system, icon set, and component patterns so future changes stay consistent
with that identity instead of drifting back toward generic SaaS defaults.

All tokens live in `src/index.css`. Components consume them through CSS
variables and a small set of shared classes; components almost never hardcode
a color or font outside these tokens.

---

## Color palette

Six colors, each with one job. The two status colors — Settle and Stamp — are
deliberately separate from the brand accent (Compass), so a balance is never
visually confused with a button.

| Token | Hex | Name | Role |
|---|---|---|---|
| `--text-primary` | `#1C2A38` | Ink | Primary text, dark chrome (header, nav active state background is tinted from this) |
| `--bg-app` | `#F2ECDC` | Canvas | App background — warm ledger-paper tone |
| `--bg-surface` | `#FFFDF6` | Paper | Card/surface fill, one shade lighter than Canvas |
| `--primary-accent` | `#1F6E68` | Compass | Brand accent — primary buttons, links, active states, the boarding-pass stamp when settled |
| `--secondary-accent` | `#B98A3E` | Brass | Sparing highlight; also reused as `--color-warning` |
| `--color-success` | `#2C7A4B` | Settle | Status only — money owed *to* someone. Never decorative. |
| `--color-danger` | `#B8452E` | Stamp | Status only — money someone owes. A sealing-wax red, not the brand accent. |

Text tones step down from Ink: `--text-primary` (#1C2A38) → `--text-secondary`
(#52627A) → `--text-muted` (#8B96A8). Borders use `--border-color` (#DDD2B8),
a warm sand line — never cold slate grays.

**Not part of this system:** the six built-in expense categories keep their
own fixed chart colors (indigo/blue/cyan/emerald/amber/violet, defined as
`CATEGORY_COLORS` in `App.tsx`) for the Analytics donut chart. That's a
categorical data-visualization palette, a separate concern from brand chrome,
and intentionally wasn't restyled — changing it is its own design decision
(pick up the `dataviz` skill if that's ever revisited).

---

## Typography

Three type roles, each doing one job:

| Role | Font | Token | Used for |
|---|---|---|---|
| Display | Fraunces (variable, incl. italic) | `--font-family-title` | Headings, trip name, the boarding-pass balance figure, the stamp badge (italic) |
| Body / UI | IBM Plex Sans (variable) | `--font-family-body` | Everything you read or tap: labels, buttons, list titles, form fields |
| Data | IBM Plex Mono | `--font-family-mono` | Every amount, date, and running total — apply the `.money` class for `tabular-nums` so digits line up in a column |

All three are self-hosted from `src/assets/fonts/` (`@font-face` at the top of
`index.css`) rather than loaded from Google Fonts. This matters for an
offline-first PWA: the service worker's fetch handler only caches same-origin
requests, so a CDN font would silently bypass the offline cache and fail to
load without a network connection.

Fraunces and IBM Plex Sans are variable fonts — one file each covers their
full weight range (declared as `font-weight: 400 900` / `300 700`), so adding
a new weight in a component is just a CSS change, no new font file needed.

---

## Layout tokens

```css
--border-radius-sm: 6px;   /* inputs, buttons, badges */
--border-radius-md: 10px;  /* cards, the boarding-pass card */
--border-radius-lg: 16px;
--transition-smooth: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
```

Radii stay small and un-bubbly on purpose — the ledger identity reads as
printed document stock, not soft app-y rounded cards.

The `.perf-divider` class (a 1.5px dashed border using `--border-color`) is
the app's recurring structural motif — a perforation/tear line, used on the
boarding-pass card and between ticket-stub rows. Use it sparingly, as a
divider, not decoration on every card.

---

## Icon system

`src/components/Icons.tsx` is a hand-drawn set of single-stroke line icons
(24px viewBox, 1.75px stroke, `currentColor`) that replaced raw system emoji
as UI chrome. Emoji render inconsistently across OSes (chunky and colorful on
Windows, flat on Android, glossy on iOS) — inconsistent glyph weight next to
precise financial numbers is what originally made the app feel unprofessional.

Two icon categories:

- **Chrome icons** — nav tabs, add/edit/delete/search/export/import/check/
  alert/calendar/chevron. Always from `Icons.tsx`, colored via `currentColor`
  so active/inactive states are a color change, not a glyph swap.
- **Category icons** — `src/components/CategoryIcon.tsx` maps the six
  built-in category IDs (`cat-food`, `cat-stay`, `cat-travel`,
  `cat-activities`, `cat-shopping`, `cat-misc`) to matching line icons
  (utensils, house, paper plane, mountains, bag, box). **Custom categories a
  person creates keep their own chosen emoji** — there's no way to
  auto-generate a line icon for an arbitrary category, and the emoji picker
  in Settings is a deliberate personalization feature, not chrome. Always
  render category icons through `<CategoryIcon categoryId={...}
  fallbackEmoji={...} />` rather than raw `cat.icon`, so built-ins and
  custom categories both resolve correctly.

Every custom clickable element (`button`, `[role="button"]`, `input`,
`select`, `a`) gets `touch-action: manipulation` globally — without it,
mobile browsers can require a double tap on custom controls (the first tap
resolves a hover/zoom-detection state, the second actually fires the click).

---

## Component patterns

**Boarding-pass balance card** (`.boarding-pass` in `BalancesSettlements.tsx`)
is the signature element — a torn-ticket-stub balance summary with a
perforated divider (`.bp-perf`, punched circles via `::before`/`::after`) and
a rotated ink-stamp badge (`.stamp-badge`) straddling that divider, not
floating in the body. The stamp is keyed (`key={isFullySettled ? 'settled' :
'unsettled'}`) so React remounts it — and its `stampIn` pop animation —
whenever settled state actually changes, not just on first paint. The
sub-text below the amount states a real, computed insight (the dominant
outstanding transfer, or the category driving spend) rather than a generic
"N transfers" count, and only uses "Mostly …" phrasing when a transfer or
category genuinely accounts for ≥50% of the total — otherwise it falls back
to the plain count.

**Member picker** (`.member-grid` / `.member-card` / `.member-avatar`) is a
card/avatar-grid selector for "who paid" (single-select) and "split among"
(multi-select, with a `.member-check-badge` checkmark). Weight/exact/percent
split inputs render inline inside the selected card
(`.member-config-input`), with a live computed equivalent amount
(`.member-config-equiv`, e.g. "= ₹250.00") shown under weight/percentage
values. Members removed from a trip but still checked on an old expense
render as a red "Removed" card so they stay uncheckable rather than silently
disappearing.

**Category badges** (`.category-badge`) and **split-mode segmented control**
(`.segmented-control`) replace `<select>` dropdowns with tappable pill/segment
rows — more usable on mobile, and lets category badges show a real icon
(native `<option>` elements can't render anything but text, so the two
category `<select>` filters that remain — in the expense filter bar — still
show emoji, not line icons).

**Ticket-stub expense rows** (`ExpenseList.tsx`) are dashed-divider rows
inside one card rather than a stack of separate cards, wrapped in
`SwipeableRow` for a touch-only swipe-left-to-delete gesture
(`src/components/SwipeableRow.tsx`, gated to `pointerType === 'touch'` so it's
additive to, not a replacement for, the always-visible trash icon button).
Rows pending deletion (mid-undo-window, before the 5s timer actually removes
them) get `opacity: 0.35` and `pointer-events: none` via a `pendingDeleteId`
prop threaded down from `App.tsx` — otherwise the row stays fully
interactive while it's already "logically gone," which reads as broken.

**Trip header** (`.app-header` in `App.tsx`) is a dark Ink-navy strip: an
eyebrow line (currency · dates), the trip name in Fraunces, and a dashed-
divider stats row (member count · expense count) below — the same
perforation/stats-row language as the boarding-pass card, applied to the
page chrome itself.

---

## Layout safety rules

Two flexbox patterns recur across balance/settlement rows and are worth
keeping consistent:

- **Long names must not break alignment.** A row like `<name> owes <name>` /
  `<amount>` used `justify-content: space-between`, which looks fine until a
  long member or group name forces the row to wrap — at which point the
  amount block, now alone on its own line, gets left-aligned instead of
  staying at the row's right edge. Fix: drop `justify-content: space-between`,
  give the name block `flex: 1 1 auto; min-width: 0`, and give the
  amount/action block `margin-left: auto` (or `flex-shrink: 0` for
  single-line rows) — this keeps it right-aligned whether or not the row
  wraps.
- **Compact list rows** (member balance rows) don't wrap at all — give the
  name span `min-width: 0; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; flex: 1 1 auto` and the value span `flex-shrink: 0`,
  so a long name truncates/wraps gracefully instead of forcing the row wider
  than its container (a real page-level horizontal-scroll source, not just a
  cosmetic issue).

When auditing for horizontal overflow, a scroll container with its own
`overflow-x: auto` (e.g. the daily-spend chart's `minWidth: 350px` SVG) is a
deliberate, contained exception — it scrolls internally and doesn't push the
page itself sideways. Anything else whose bounding box exceeds its parent's
width is a real bug.
