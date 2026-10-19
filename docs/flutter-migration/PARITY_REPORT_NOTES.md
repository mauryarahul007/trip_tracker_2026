## Verdict (hand-written)

**Parity with the web app is not reached for Tier 1.** 24 of 48 T1 rows are not `done`: 14 are built but unverified on a device or staging, 3 are deferred, and **7 are not built**. The phase exit criterion ("every T1/T2 row done, or skipped with owner sign-off") therefore needs either work or your explicit sign-off row by row. Nothing here is hidden: every non-done row has a backlog entry.

### T1 rows that are not built at all (decision needed)
Destination suggest, destination covers, traveler pass back, clone trip squad, extended undo, calm haptics, expense photo link. For each: **build before the first store release**, or **skip with your sign-off** (the web keeps it; the Flutter flag simply has no effect). Recommendation: skip calm haptics and destination covers (cosmetic), build clone trip squad and extended undo only if beta users ask, and treat the rest as post-launch.

### T1 rows built but unverified (close by device QA, Phase 12.2)
Login, reset password, delete account, join, share (need client IDs, domain, staging); router flags; chat, notes, member money row, packing assistant (device and two-account checks). These flip to `done` only when `QA_LOG.md` records a pass.

### T2
Travel passes are manual only (no scanner import, PDF, vault attachment). Offline map tiles are not built. T2 is required before the Capacitor sunset, not before the first store release.

## Intentional differences from the web app
| Area | Difference | Why |
|------|-----------|-----|
| UI | Native Flutter UI, no WebView | The point of the migration (D7) |
| Ops Deck / Superadmin | Not in the app | Web only (D8) |
| Updates | Store releases only, no over-the-air bundle | D9 |
| Push foreground (iOS) | Badge and sound, in-app banner is the alert | One banner per event |
| Notifications | Tap opens the relevant trip tab (web opens the trip) | Native deep links |
| Legal text | Summary plus link to the full web text | Web text has web-specific claims (B-172) |
| Backup restore | Creates new trips with new ids | Repositories own ids (B-146) |
| Document vault and pass attachments | Not in the app | Local-only data, no native store yet (B-020, B-090) |
| Settings | Trip settings are owner-only (server also allows admins) | B-033 |
| Typography and spacing | Material 3 base with the web tokens | Native feel |
| Contrast | Selected chips, segmented buttons and primary buttons in dark mode use different fills than the web | Accessibility fixes (Phase 12.4) |

## Deferred T3 and T4 work
Listed above and in `BACKLOG.md`. None blocks the first store release; each ships behind its server flag when built.
