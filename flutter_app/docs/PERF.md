# Performance and stability budget (Phase 12.3)

**Status: nothing here has been measured.** There is no Android SDK, device or Mac on the development machine (B-004, B-007). This file sets the budgets and the exact procedure so the first device pass produces comparable numbers, and records the code-level measures already in place. Fill the "Measured" columns on the device matrix in `docs/flutter-migration/QA_LOG.md`.

## Budgets (proposals; owner confirms)
| Metric | Target | Where measured | Measured |
|--------|--------|----------------|----------|
| Cold start to trips list (20 trips, profile build, mid-range Android) | < 2 s | `flutter run --profile`, DevTools timeline | |
| Cold start, low-end (2-3 GB) | < 3.5 s | same | |
| Trips list scroll | >= 55 fps, jank < 3% | DevTools performance overlay | |
| Open a trip | < 400 ms to first paint | timeline | |
| Add an expense (tap Save to row visible) | < 150 ms | timeline | |
| Chat scroll, 1,000 messages | >= 55 fps | DevTools | |
| Map hero expand | no dropped frames > 3 in a row | DevTools | |
| Memory after 30 minutes of normal use | < 250 MB RSS, no growth trend | DevTools memory | |
| Android release size per ABI | <= 60 MB (arm64-v8a) | `flutter build apk --release --split-per-abi --flavor prod` then `--analyze-size` | |
| iOS IPA size | <= 90 MB | Xcode organizer / Codemagic artifact | |
| Battery, live location on for 1 hour | < 6% drain | OS battery stats | |

## Procedure
```bash
cd flutter_app
flutter run --profile --flavor staging -t lib/main.dart --dart-define-from-file=env/staging.json
flutter build apk --release --flavor prod --split-per-abi --analyze-size --target-platform android-arm64 \
  --dart-define-from-file=env/prod.json
```
Use profile mode only (debug numbers are meaningless). Seed 20 trips and a 1,000-message trip on staging. Record the device, OS, build number and date next to each number.

## Measures already in the code
- **Image cache capped** at 64 MB / 150 images (`main.dart`) so receipt photos and map tiles cannot grow it without bound.
- **Drift (SQLite) reads** are streams with `distinct`; lists use builders (`ListView.builder`), not eager children, on the long lists (notifications, flags, expenses).
- **Deferred map**: the trip map hero is built lazily (`DeferredTripMapHero`), collapsed by default.
- **Release builds**: R8 code and resource shrinking on, Dart obfuscation with split debug info (`store/RELEASE_PIPELINE.md`), icon tree-shaking is Flutter's default for release.
- **No blur or 3D transforms** (the WebKit jank sources, `IOS_DEFECTS.md`).
- **Feature code paths behind flags** are not built into the widget tree when the flag is off.

## Known risks to check first
1. **Parsing on the UI thread.** Backup restore (up to 10 MB JSON), CSV export and Splitwise import run on the main isolate. A 10 MB parse is on the order of 100 ms but unmeasured. If DevTools shows a long frame, move `summarizeBackup` and the importers to `Isolate.run` (not done: isolates and `FakeAsync` widget tests need a test seam). Logged as B-192.
2. **Outbox flush after a long offline period**: many queued items flush serially; watch for frame drops and battery.
3. **Realtime reconnect storms** after airplane mode (the manager backs off up to 60 s).
4. **R8 shrinking** has not been exercised: a release build might strip a reflection-loaded class (Firebase, notifications). The first release build must be smoke-tested, not only built (B-193).
