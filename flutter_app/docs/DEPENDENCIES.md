# Flutter App Dependencies & Architecture Rationales

This document records all third-party dependencies used in `flutter_app/`, their pinned versions, and architectural justifications as governed by `docs/flutter-migration/README.md` decisions D3–D6.

---

## Foundation Dependencies (Phase 2)

| Package | Version | Decision Ref | Purpose & Rationale |
|---|---|---|---|
| `flutter_riverpod` | `^3.4.3` | **D3** | Compile-safe state management, testable DI, automatic subscription cleanup on dispose (prevents Realtime memory leaks). |
| `go_router` | `^18.0.2` | **D3** | Declarative typed routing, deep-link handling, auth redirection guards, and bottom navigation shell state preservation. |
| `supabase_flutter` | `^2.18.0` | **D5** | Official Supabase client for authentication, PostgREST queries, Realtime subscriptions, and Storage uploads. |
| `flutter_secure_storage` | `^11.2.0` | **D6** | Encrypted hardware-backed storage for Supabase auth tokens and biometrics sessions (iOS Keychain / Android EncryptedSharedPreferences). |
| `intl` | `^0.20.3` | **Phase 2** | Number, currency, and date formatting, time of day calculations, and i18n support. |
| `flutter_localizations` | `SDK` | **Phase 2** | Built-in Flutter localization support driving compile-safe AppLocalizations. |
| `connectivity_plus` | `^7.3.2` | **Phase 2** | Realtime device network status monitoring driving the offline indicator banner. |
| `cupertino_icons` | `^1.0.9` | **Phase 2** | iOS-style default icons for Apple platform consistency. |

---

## Domain, Offline & Data Layer Dependencies (Phase 5)

| Package | Target Version | Decision Ref | Purpose & Rationale |
|---|---|---|---|
| `drift` | `^2.24.x` | **D4** | Strongly-typed SQLite ORM for offline-first storage and outbox synchronization. |
| `sqlite3_flutter_libs` | `^0.5.x` | **D4** | Native SQLite engine binaries for iOS and Android. |
| `path_provider` | `^2.1.x` | **D4** | Access to app documents and support directories for local database file storage. |
| `freezed` | `^2.5.x` | **D3** | Immutable value objects, copyWith, and union types. |
| `json_serializable` | `^6.9.x` | **D3** | Compile-time JSON serialization matching Supabase PostgREST schemas. |

---

## Native Device Capabilities (Phase 7–10)

| Package | Target Version | Decision Ref | Purpose & Rationale |
|---|---|---|---|
| `maplibre_gl` | `^0.19.x` | **D6** | Native MapLibre vector maps replacing MapLibre GL JS / WebKit map view. |
| `google_mlkit_text_recognition` | `^0.14.x` | **D6** | On-device OCR receipt parsing replacing Tesseract.js in Web Workers. |
| `speech_to_text` | `^7.0.x` | **D6** | Native microphone speech-to-text recognition replacing Capacitor speech plugin. |
| `qr_flutter` & `mobile_scanner`| Latest | **D6** | QR code generation for trip invitations and camera scanning for boarding passes. |
| `local_auth` | `^2.3.x` | **D6** | Face ID / Touch ID / Android BiometricPrompt authentication. |
| `flutter_contacts` | `^1.1.x` | **D6** | Device address book contact picker for trip squad invitations. |
| `geolocator` | `^13.0.x` | **D6** | Foreground and heartbeat GPS coordinates for live location sharing. |
| `share_plus` | `^10.1.x` | **D6** | Native platform share sheet for settlement summaries and join links. |
| `image_picker` | `^1.1.x` | **D6** | Camera and photo gallery picker for receipt images and profile avatars. |
| `pdfrx` | `^1.1.x` | **D6** | High-performance native PDF document viewer for travel passes and tickets. |
| `firebase_core` / `firebase_messaging` | `^4.15` / `^16.7` | **D5** | FCM v1 push receiver and token. Build needs `google-services.json` / `GoogleService-Info.plist` (not in repo); without them push reports "not available". |
| `flutter_local_notifications` | `^22.3.1` | **D5** | Scheduled pass reminders (inexact alarms, no exact-alarm permission) and the Android push channel. Latest *stable*; the 23.x line is prerelease. |
| `timezone` / `flutter_timezone` | `^0.11` / `^5.1` | **D5** | Local-zone scheduling for reminders and the IANA zone sent with quiet hours. |
| `package_info_plus` | `^10.2` | **D5** | App version for the version gate, push registration and bug reports. |
