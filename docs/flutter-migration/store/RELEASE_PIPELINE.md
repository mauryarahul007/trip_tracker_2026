# Release pipeline and manual promotion (Phase 12.7)

Defined in `codemagic.yaml` (`flutter-android-release`, `flutter-ios-release`) and `.github/workflows/flutter-ci.yml`. **None of this has run**: it needs your Codemagic secrets and store accounts.

## Triggering
Push a tag `flutter-vX.Y.Z` (matching `package.json` `version`). Branch pushes never publish. Both workflows first run format, analyze and the full test suite; Android also checks that the Flutter fixtures still match the web source.

## Version rules
`tool/release_version.sh` prints `--build-name` (from `package.json`) and `--build-number` (commit count, the Capacitor scheme). It fails if the number is not above the last Capacitor store build (746; **check both consoles for the real last numbers** and set `TT_MIN_BUILD_NUMBER` if higher). The stores reject lower numbers.

## Secrets to create in Codemagic (never in the repo)
| Group / item | Contents |
|--------------|----------|
| `flutter_release_env` | `PROD_ENV_JSON_B64`: base64 of `env/prod.json` (Supabase URL and anon key, Google client ids) |
| `flutter_android_signing` | `TT_KEYSTORE_PATH` (uploaded keystore file), `TT_KEYSTORE_PASSWORD`, `TT_KEY_ALIAS`, `TT_KEY_PASSWORD`, `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` (Play API) |
| Integration `codemagic_asc_api_key` | App Store Connect API key (already used by the Capacitor iOS release) |
| Files in the build | `google-services.json`, `GoogleService-Info.plist` in `flutter_app` (B-136, B-182) |

## What each release job refuses to ship
- A bundle signed with the **debug key** (`tool/check_release_signing.sh`).
- A binary that contains a private key, service-account JSON, FCM server key or a `service_role` JWT (`tool/scan_binary_secrets.sh`; the anon key is expected).
- Unformatted code, analyzer findings, failing tests.

## Obfuscation and symbols
Builds use `--obfuscate --split-debug-info=build/symbols`. The `symbols/` folder is saved as a build artifact: **keep it for every released version**, it is the only way to read a release stack trace. Uploading symbols to a crash tool is not set up because there is none yet (crash reports go to the bug ledger as text): B-191.

## Manual promotion
1. Tag, wait for green, open the Play internal track draft and the TestFlight build.
2. Install from those channels on the device matrix (`QA_LOG.md`).
3. Promote per `ROLLOUT.md`: Play internal, closed, then production at 10%, 50%, 100% (halt available); TestFlight external beta, then App Store with phased release.
4. Record each decision in the `ROLLOUT.md` decision log.

## Rollback
Halt the staged rollout; fix; release a higher build number. The old Capacitor build cannot be restored on updated devices (`ROLLOUT.md` section 7).
