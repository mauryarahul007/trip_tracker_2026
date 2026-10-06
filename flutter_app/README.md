# Trip Tracker Mobile App (Flutter)

Welcome to the native mobile client for Trip Tracker, built with Flutter for iOS (15.0+) and Android (API 24+ / Android 7.0+).

---

## 1. Quick Start & Setup

### Prerequisites
- **Flutter SDK**: 3.47.x (Channel `stable`, Dart 3.13.5+) installed at `~/development/flutter` or in PATH.
- **Java**: JDK 21 (Temurin / OpenJDK).
- **Android SDK**: API 24 to 34 (Command-line tools + platform-tools).

```bash
# Verify Flutter toolchain
flutter doctor -v

# Fetch dependencies & generate localizations
cd flutter_app
flutter pub get
flutter gen-l10n
```

---

## 2. Environment Flavors & Configuration

Trip Tracker mobile supports 3 isolated environment flavors:

| Flavor | Android Build Type | Supabase Environment | Example File | Private File (Ignored) |
|---|---|---|---|---|
| `dev` | `debug` / `devDebug` | Development local / container | `env/dev.example.json` | `env/dev.json` |
| `staging` | `stagingDebug` / `stagingRelease` | Remote Supabase Staging | `env/staging.example.json` | `env/staging.json` |
| `prod` | `release` / `prodRelease` | Supabase Production | `env/prod.example.json` | `env/prod.json` |

> [!IMPORTANT]
> **Zero Secrets Policy:** Never commit `env/*.json` (only commit `env/*.example.json`). All sensitive URLs and API keys are passed compile-time via `--dart-define-from-file`.

### Running with a Specific Flavor
```bash
# Run Dev flavor on connected device / emulator
flutter run --flavor dev -t lib/main.dart --dart-define-from-file=env/dev.json

# Run Staging flavor with smoke-test enabled
flutter run --flavor staging -t lib/main.dart --dart-define-from-file=env/staging.json

# Run Release Prod build
flutter run --flavor prod --release -t lib/main.dart --dart-define-from-file=env/prod.json
```

---

## 3. "No Local iOS Build" Workflow

Since development machines may be Linux or Windows workstations without local macOS / Xcode installations, iOS builds are verified via **Codemagic CI**:

1. **Local Development & Unit Verification**:
   - Write all code, tests, and design system components locally.
   - Run `flutter analyze` (Zero issues policy) and `flutter test`.
2. **Android Local Verification**:
   - Build Android debug APK: `flutter build apk --debug --flavor dev -t lib/main.dart`.
3. **Remote iOS Verification (Codemagic)**:
   - Push to `flutter` branch (or PR).
   - Codemagic triggers `flutter-ios-debug` on a hosted `mac_mini_m2` instance with Xcode `latest`.
   - The workflow compiles:
     1. Unsigned iOS Simulator build (`.app`)
     2. Unsigned iOS Device build (`.app`)
   - Download the simulator artifact from the Codemagic dashboard to verify iOS rendering if needed.

---

## 4. Architecture & Folder Rules

The codebase follows a strict **Feature-First + Clean Architecture** structure:

```
flutter_app/
  lib/
    app/            # App widget, GoRouter navigation, Auth state notifier, bootstrap
    core/           # Platform haptics, error boundary, logging, env, network, feature flags
    data/           # Supabase client gateway, secure storage, Drift SQLite database (Phase 5)
    domain/         # Pure value objects, business logic, settlement math (Phase 5)
    features/       # Feature slices (e.g. auth, trips, trip_details, smoke_test, travel)
      <feature>/
        domain/         # Feature-specific models & pure business logic (Zero Flutter imports)
        application/    # Riverpod notifiers, use-cases, and state machines
        presentation/   # Flutter UI widgets, screens, and modals
    l10n/           # AppLocalizations and arb dictionaries
    shared/         # Design system tokens, typography, colors, theme, and reusable widgets
  test/             # Unit and widget tests
  env/              # Environment config templates
```

### Strict Import Boundary Rules
1. **Domain Isolation**:
   - Files in `domain/` and `features/<name>/domain/` MUST NOT import `package:flutter/**` or UI packages.
   - Domain contains pure Dart logic, validation, and immutable data structures.
2. **Layer Flow**:
   - `presentation` -> `application` -> `domain`.
   - `data` implements interfaces defined in `domain`.
   - Presentation never accesses `data` directly; it always communicates through Riverpod providers in `application` or interfaces in `domain`.

---

## 5. Verification Commands (Quality Gate)

Always run before any handoff:

```bash
# 1. Formatting check
dart format --output=none --set-exit-if-changed .

# 2. Static analysis (must output 0 issues)
flutter analyze

# 3. Test suite
flutter test

# 4. Android APK verification build
flutter build apk --debug --flavor dev -t lib/main.dart
```
