# Manual QA log (Phase 12.2)

Nothing in this file has been run on a device yet: **every cell below is open**. The headless suite (565+ widget and unit tests, accessibility checks) does not replace this. Fill the table as you go; file failures with `npm run bug:add` using `--by qa-flutter` and put `[flutter]` first in the title (the bug schema has no client field: `environment.client` is set only by in-app reports; ask before changing the schema).

## Device matrix
| Id | Device | OS | Why | Tester | Date |
|----|--------|----|-----|--------|------|
| D1 | iPhone SE-class (small screen) | iOS 15+ | Smallest layout, keyboard and safe-area bugs | | |
| D2 | iPhone, current | latest iOS | Main target | | |
| D3 | iPad | latest | Letterbox decision (supported or phone layout centred) | | |
| D4 | Android low-end (2-3 GB RAM) | API 24-30 | Performance budget | | |
| D5 | Android current | latest | Main target | | |
| D6 | Android tablet or foldable | latest | Sanity: no crashes, readable | | |

## How to run a pass
1. Install the staging build. 2. Work through `FEATURE_TEST_STEPS.md` sections `FLUTTER-P6`, `P7-*`, `P8`, `P9`, `P10A` to `P10E` in order (the Flutter-specific ones; web steps are adapted by their test-steps reference in `PARITY_MATRIX.md`). 3. Record pass or fail per device. 4. A failing step gets a bug with the section id and step number.

## Step results (fill per device)
| Section | D1 | D2 | D3 | D4 | D5 | D6 | Bugs |
|---------|----|----|----|----|----|----|------|
| FLUTTER-P6 auth, trips, join, share | | | | | | | |
| FLUTTER-P7 expenses and ledger | | | | | | | |
| FLUTTER-P8 members, notes, chat, passes | | | | | | | |
| FLUTTER-P9 maps, location, OCR, wrapped | | | | | | | |
| FLUTTER-P10A notifications | | | | | | | |
| FLUTTER-P10B settings, trip settings | | | | | | | |
| FLUTTER-P10C prefs, version gate, flags | | | | | | | |
| FLUTTER-P10D feedback, diagnostics | | | | | | | |
| FLUTTER-P10E push, reminders (six-state matrix) | | | | | | | |

## `contract/IOS_DEFECTS.md` re-verification
Each line needs evidence (video or screenshot link). The last column says what the headless tests already cover, so the device check can focus on what they cannot.

| Id | Defect | Headless coverage today | Device result | Evidence |
|----|--------|-------------------------|---------------|----------|
| DEF-01 | Virtual Keyboard Displacing Screen Layout (BUG-214) | `resizeToAvoidBottomInset` and sheet `viewInsets` are in code; no real keyboard in tests | | |
| DEF-02 | Keyboard Covering Composer on Focus (BUG-213) | Chat send flow tested; no focus-loss repro possible headless | | |
| DEF-03 | Viewport Auto-Zoom on Input Focus (BUG-211) | Not applicable (no WebView); confirm no zoom | | |
| DEF-04 | Home Bar / Safe Area Clipping (BUG-011, BUG-028) | `SafeArea` in `AppScaffold`; tests have no notch | | |
| DEF-05 | Compositor Lag with Stacked Blurs (BUG-228) | Device only (compositing, gestures, scroll feel) | | |
| DEF-06 | Trip Stack 3D Transform Hitching (BUG-230, BUG-244) | Device only (compositing, gestures, scroll feel) | | |
| DEF-07 | Gesture Contention: Horizontal Chips vs Vertical Sheet Drag | Device only (compositing, gestures, scroll feel) | | |
| DEF-08 | Touch Target Accessibility & Keyboard Navigation (BUG-111, BUG-112) | Device only (compositing, gestures, scroll feel) | | |
| DEF-09 | Duplicate Channel Subscriptions & Memory Leaks (BUG-146, BUG-223) | Device only (compositing, gestures, scroll feel) | | |

## Exit tally (fill at the end)
P0 open: __  P1 open: __  P2 triaged: __  Parity rows flipped to `done`: __
