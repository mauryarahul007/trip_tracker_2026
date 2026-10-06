# Native Mobile Permissions Matrix

This document tracks all OS permissions requested by the native Flutter client on iOS and Android, their user-facing purpose, and compliance requirements for App Store and Google Play reviews.

## 1. Permissions Table

| Feature | Android Permission | iOS Info.plist Key | Usage Rationale shown to User |
|---|---|---|---|
| **Receipt Photos (Camera)** | `android.permission.CAMERA` | `NSCameraUsageDescription` | "Trip Tracker uses the camera to attach receipt photos to expenses." |
| **Receipt Photos (Gallery)** | `READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE` | `NSPhotoLibraryUsageDescription` | "Trip Tracker lets you pick a receipt photo from your library." |
| **Biometric App Lock** | `android.permission.USE_BIOMETRIC` | `NSFaceIDUsageDescription` | "Trip Tracker uses Face ID to unlock the app." |
| **Live Location Sharing (Foreground)** | `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` | `NSLocationWhenInUseUsageDescription` | "Trip Tracker shares your live location with trip members when you turn on Live Location Share." |
| **Live Location Sharing (Background)** | `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE_LOCATION` | `NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes: location` | "Trip Tracker shares your live location in the background with trip members when you turn on Live Location Share." |
| **Network & Outbox Sync** | `android.permission.INTERNET` | N/A (Standard) | Network communications for real-time collaboration and outbox sync. |

---

## 2. In-App Permission Education Flow

Per Phase 9 requirements, permissions are never requested blindly on app boot or tab change:
1. **In-Context Trigger:** Permission prompts only trigger upon explicit user interaction (e.g. tapping "Start Sharing Live Location" in `LiveLocationShareModal`).
2. **Pre-Prompt Rationale:** The UI explains why access is needed (12-hour bounded window, squad-only visibility, battery preservation) before calling system permission APIs.
3. **Graceful Recovery:** If permission is denied or permanently denied (`LocationPermissionStatus.deniedForever`), the UI provides a clear error notification and a direct shortcut to open device App Settings.

---

## 3. Privacy & Battery Protections

- **Bounded Duration:** Live location shares automatically expire after 12 hours (`SHARE_DURATION_MS = 12 * 60 * 60 * 1000`).
- **Heartbeat Rate:** Heartbeat triggers at 60-second intervals or upon application lifecycle resume (`AppLifecycleState.resumed`), preventing aggressive GPS hardware drain.
- **Immediate Cancellation:** Tapping "Stop Sharing Location" terminates background timers, ceases location reads, and marks the server record `is_sharing: false`.
