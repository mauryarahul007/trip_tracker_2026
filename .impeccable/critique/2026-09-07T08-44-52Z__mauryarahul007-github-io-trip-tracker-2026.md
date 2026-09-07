---
target: Trip Tracker 2026 webapp (live app + codebase)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-09-07T08-44-52Z
slug: mauryarahul007-github-io-trip-tracker-2026
---
Method: dual-agent (A: general-purpose · B: general-purpose)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Sync/offline state, draft-restore, skeleton loaders present; settlement/reminder actions lack toast confirmation |
| 2 | Match System / Real World | 4 | Travel-native vocabulary throughout (Boarding Pass, Expeditions, UPI/WhatsApp settle) — strongest heuristic |
| 3 | User Control and Freedom | 3 | Escape/history-back wired everywhere; trip delete in ActionSheet has no visible confirm/undo at point of action |
| 4 | Consistency and Standards | 1 | 23 distinct radius values vs documented 3-step scale; 9-hue Settings icon palette violates "teal+orange only" rule; hardcoded blue onboarding CTA |
| 5 | Error Prevention | 3 | Live split-sum validation, duplicate-expense detection, honeypot; destructive actions inconsistently confirmed |
| 6 | Recognition Rather Than Recall | 3 | Split-mode presets, FAB mode-label chip reduce recall burden |
| 7 | Flexibility and Efficiency | 3 | Cmd/Ctrl+K palette, voice input, OCR, quick-amount chips, swipe actions |
| 8 | Aesthetic and Minimalist Design | 2 | Up to 5 stacked dismissible banners possible on one expense-form screen; decorative rainbow icons carry no semantic meaning |
| 9 | Error Recovery | 3 | Field-scoped errors, duplicate-warning breakdown; trip date-guard falls back to plain `alert()` |
| 10 | Help and Documentation | 1 | No in-app help/glossary; one-time tips dismiss permanently with no discoverable recovery path |
| **Total** | | **26/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: Real point of view exists — `BoardingPassHeroCard.tsx`'s 3D flip card (itinerary front, balance-ledger back, mono tabular dates, stamp badge) is genuinely authored for a trip-expense splitter and matches DESIGN.md's own north star. But specificity doesn't survive past the hero surfaces. Settings (`SettingsView.tsx`) reverts to a stock iOS-style multicolor icon list — 9 hues including purple/indigo — directly contradicting the documented "teal + orange only" rule. First-run onboarding (`OnboardingSwipe.tsx`) uses a hardcoded blue gradient CTA, not teal or orange. Strong signature at the top of the IA, generic-to-contradictory execution underneath.

**Deterministic scan**: `detect.mjs --json src` (221 files scanned) returned exit 2, 1503 findings: 1474 advisory (design-system-color 605, design-system-font-size 654, design-system-radius 215 — concentrated in `index.css` at 607 hits, then `TravelPassWalletView.tsx` 109, `ExpenseForm.tsx` 68, `TripWrappedModal.tsx` 62, `SettingsView.tsx` 60) and 29 warning-severity (layout-transition ×12, bounce-easing ×11, overused-font ×3, side-tab ×2, gradient-text ×1). The design-system-radius/color advisory volume independently corroborates Assessment A's P2/P1 findings on radius drift and palette violation without either assessment seeing the other's output.

**False positives identified by Assessment B**: `overused-font` ×3 on `index.css:30,37,44` — flags the `@font-face` declarations for Plus Jakarta Sans, which DESIGN.md documents as the deliberate brand display font; the static scanner can't apply the brand-font exemption that only exists in the browser-based scan path. `side-tab` ×2 on `index.css:1325,8109` — flags `border-left` accents on `.expense-review-banner`/`.bug-resolution-note`, which match the rule's own documented "status/alert region" exemption, but that exemption never fires from the CSS-only scanner (no role information available statically).

**Browser visualization**: Unavailable in this session — no browser-automation tool (Playwright/Chrome DevTools/Puppeteer) was exposed to either sub-agent; only read-only `WebFetch` existed, which returned no rendered DOM for this client-side SPA. All findings above are derived from source/CSS/DESIGN.md reading, not live visual inspection. No overlay is visible in any browser tab.

## Overall Impression

The app has one excellent, truly differentiated component (the boarding-pass card) sitting inside a codebase that doesn't consistently enforce its own design system. The biggest opportunity isn't inventing new visual ideas — it's making Settings, onboarding, and the notification center actually use the teal/orange system that already exists and is already documented, plus fixing one real accessibility bug (orange balance text failing contrast) and one real cognitive-load problem (the expense-add form doing too much at once, on the single most frequent action in the app).

## What's Working

1. **`BoardingPassHeroCard.tsx`** — 3D flip card, itinerary front/balance back, tabular mono dates, stamp badge. The clearest, most product-specific expression of the design system in the codebase; should be the template other surfaces get pulled toward, not the exception.
2. **Split-mode presets in `ExpenseForm.tsx`** — Equal All / 50-50 / Only Payer / Exclude Payer presets each wired to a distinct haptic pattern. Removes real recall burden from the most annoying part of expense-splitting.
3. **Settle Up progress bar + confetti in `BalancesSettlements.tsx`** — live "X of Y settled" gradient bar plus success haptic and confetti burst on settlement. Correctly targets the app's actual emotional peak (debt disappearing).

## Priority Issues

**[P0] "You owe" balance text fails WCAG contrast in light mode**
- Why it matters: `TransferRow` renders the app's single most important number — the amount a user owes — in `#FF7A00` bold 15px on white. Computed contrast ≈2.6:1, under the 4.5:1 AA minimum for normal text. The most emotionally loaded, financially critical text in the app is hard to read for anyone with even mild low vision, and fails accessibility compliance outright.
- Fix: Use a darkened orange (~15-20% darker than `#FF7A00`) or the existing `--color-danger` (`#DC2626`, already passes contrast) for the *text*; keep literal `#FF7A00` for filled buttons/badges where white-on-orange is fine.
- Suggested command: `/impeccable harden`

**[P1] Settings and notification icons break the app's own color rule**
- Why it matters: 9 squircle-icon hues (amber/blue/indigo/teal/emerald/orange/purple/slate/rose) directly violate DESIGN.md's "no purple, no neon," "teal + orange only" rules. Settings is the second-most-visited screen after the dashboard for most users, and it currently reads as a generic multicolor icon-list app, undermining the "confident travel-tech" identity everywhere else works to build. Also a genuine accessibility issue: colors aren't semantic (don't consistently mean warning/success), so color-blind users lose information for nothing.
- Fix: Collapse to teal (default), orange (destructive/warning-adjacent only), neutral gray. Remove purple/indigo/rose/slate/blue/amber/emerald as icon-tint options.
- Suggested command: `/impeccable colorize`

**[P1] First-run onboarding CTA is a hardcoded off-system blue**
- Why it matters: `OnboardingSwipe.tsx` uses `linear-gradient(135deg, #2f6fef, #1e40af)` — not a token, not teal or orange — on the very first button a new user sees. This is the worst possible screen for a palette slip: it sets the first color impression before the teal/orange identity has a chance to register. A stale `var(--primary-accent, #2f6fef)` fallback also lingers in six other files.
- Fix: Swap the hardcoded gradient for the documented `.gradient-btn` orange treatment; remove the dead blue fallback values so a future CSS-load failure doesn't silently regress the app to blue.
- Suggested command: `/impeccable polish`

**[P2] Radius scale isn't actually a scale**
- Why it matters: DESIGN.md documents 10/14/20px + pill (9999px). `index.css` actually contains 23 distinct radius values and two competing "pill" values (`999px` ×13, `9999px` ×25) that read as visually near-identical but are numerically inconsistent — the exact kind of drift that compounds over time and erodes the "authored" feel. Independently confirmed by the detector's 215 design-system-radius advisories.
- Fix: Mechanical pass — collapse `999px → 9999px`, snap outlier card radii (24/27/28/32/33px, e.g. `TransferRow`'s hardcoded `28px`) to the nearest documented step, define the never-assigned `--border-radius-pill` custom property in `:root`.
- Suggested command: `/impeccable layout`

**[P3] `ExpenseForm.tsx` overloads the single highest-frequency screen**
- Why it matters: 1,945-line component; quick-fill, voice input, OCR, currency conversion, geotagging, duplicate detection, itemized receipts, draft recovery, and 5 split modes can all surface at once — up to 5 stacked dismissible banners above the fold on a fresh expense. This is the screen used most often, on the go, one-handed, and it currently carries the highest cognitive load in the app (fails 3 of 8 cognitive-load checklist items: single focus, one-thing-at-a-time, ≤4 visible options).
- Fix: Progressive-disclose power features (voice/OCR/geotag/quick-fill) behind one "Smart Fill" entry point instead of each owning an always-visible affordance.
- Suggested command: `/impeccable distill`

## Persona Red Flags

**Jordan (First-Timer)**: Lands on `OnboardingSwipe.tsx` and sees a blue CTA — first color impression contradicts the teal/orange identity every later screen uses. The add-trip form (name + dynamic multi-stop route builder + date range + currency, all on one non-paginated screen) is a lot to parse on a first trip. The one-time "use a Preset" tip in `ExpenseForm.tsx` dismisses permanently via `localStorage` with no discoverable way back — the only recovery is a 450ms long-press on the center FAB, undocumented anywhere in the UI.

**Sam (Accessibility-Dependent)**: Directly hit by the P0 finding — "You owe $X" fails AA contrast in light mode. Several stepper-dot and icon-only controls rely on `title` hover tooltips for full context, invisible to touch/keyboard-only users (most other elements do carry `aria-label`, this is inconsistent rather than universal). The 9-hue Settings palette isn't semantic, so a color-blind user loses information the color was never actually encoding.

**Riley (Stress-Tester)**: Trip deletion in the ActionSheet calls `onDeleteTrip(trip)` directly from a list item with no visible confirm step in that code path — a distracted tap could destroy a trip (an `UndoToasts.tsx` component exists elsewhere in the codebase but isn't visible at the point of the destructive action itself). The custom-settlement-amount field in `TransferRow` silently falls back to the full transfer amount on invalid input (`parseFloat(customValue) || t.amount`) instead of blocking submission — entering `0`, blank, or garbage produces a wrong-but-plausible result rather than an error.

## Minor Observations

- `TripsListScreen.tsx` mixes inline `style={{...}}` with class-based styling — a likely root cause of the radius/color drift, since token changes made centrally in `index.css` don't reach inline-styled instances.
- Icon register is inconsistent: custom `Icons.tsx` SVGs sit next to raw emoji (🧳 🗺️ 🧾 ⚡ 🛡️ ✈ ✎) on the same screen (e.g. trip-form stamp uses "✈ NEW"/"✎ EDIT" emoji beside proper icon buttons), undercutting the authored feel.
- Trip date-guard on trip creation uses a plain `alert()`, a step down in polish from the rest of the form's inline field-scoped error handling.
- Superadmin bug-tracker entry point (shield emoji button) lives directly in the consumer-facing `TripsListScreen.tsx` header; worth confirming the gating prop is never accidentally passed to non-admin sessions.

## Questions to Consider

- If the Boarding Pass motif and strict teal+orange rule are the actual differentiator, why does the highest-traffic screen after the dashboard — Settings — carry none of it?
- DESIGN.md itself admits no formal spacing scale exists and the pill-radius variable was never defined. Is DESIGN.md aspirational, or descriptive of what already shipped — and is there any lint/Stylelint rule stopping the gap from growing?
- Settling up gets confetti; adding an expense (used ~10x more often per trip) gets a 1,945-line form with up to 5 competing banners. Should the emotional-design investment be inverted toward a "Quick Add" (amount first, everything else optional/inferred) flow?
