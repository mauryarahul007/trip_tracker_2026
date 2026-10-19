# Accessibility and internationalisation report (Phase 12.4)

## What is automated (and passing)
`test/a11y/a11y_test.dart`, 28 tests, run on every `flutter test`:
- **Tap targets**: Android (48 dp) and iOS (44 pt) guidelines on login, trips list, add expense, balances, members, chat, settings, notifications.
- **Labels**: every tappable has a semantic label (`labeledTapTargetGuideline`).
- **Contrast**: WCAG 4.5:1 on the same screens in **light** and, for trips list, settings, add expense and balances, **dark**.
- **200% text**: ten real screens lay out with no overflow or layout assertion; shared components also at 200% in LTR and **RTL**.

## Defects this found and fixed
| Defect | Fix |
|--------|-----|
| 29 icon buttons had no label (back, close, rename, delete, archive, send, move) | Tooltips added (system "Back"/"Close" strings where possible) |
| Selected chips and segmented buttons painted a dark fill under dark text (contrast 1.18:1, light theme) | Theme: tinted selected colour with accent text (`chipTheme`, `secondaryContainer`) |
| Primary and danger buttons in the **dark** theme had white text on bright teal (2.0:1) | `AppButton` picks white or near-black by contrast ratio |
| Confirm dialog overflowed at 200% text on a small phone | Content scrolls |
| Settings, Theme row crashed layout at 200% text (a `SegmentedButton` as a `ListTile` trailing) | Stacked layout |
| Dropdowns in Report a problem overflowed at 200% | `isExpanded: true` (also applied to the other dropdowns) |

## What automation cannot tell you (needs a person with a device)
- **VoiceOver / TalkBack** reading order and wording on: login, trips list, add expense, settle up, chat send, join by code. Record in `QA_LOG.md`.
- **Focus order** and keyboard navigation on tablets.
- **Reduce motion**: confirm the app respects the OS setting (the motion suite is animation-light, but not audited; B-194).
- **Haptics off**: the Settings switch turns the facade off (tested); confirm no vibration on a device.
- **Contrast of every screen** beyond the eight above, in dark mode: the guideline test covers a sample.
- **Dynamic type above 200%** and bold text.

## Internationalisation
- Only English ships. Strings are in `lib/l10n/*.arb`; some Phase 2, 6 and 10 strings are still hard-coded in widgets (B-044), including most of Settings and Feedback. Adding a locale needs those moved first.
- **RTL**: layouts do not break (shared components tested under RTL); screens were not tested one by one in RTL, and icons that imply direction (back arrows) are mirrored by Flutter automatically.
- Money and dates use `intl` with the device locale; zero-decimal currencies and 4-digit grouping quirks are documented in `BACKLOG.md` (known limitations).

## Gaps (logged)
B-044 (hard-coded strings), B-194 (reduce-motion audit), manual screen-reader pass (B-151).
