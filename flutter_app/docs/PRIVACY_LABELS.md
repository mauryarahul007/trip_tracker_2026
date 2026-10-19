# Store privacy labels: data collection disclosures

Source for the Apple App Privacy "nutrition label" and the Google Play Data safety form (Phase 12 submits them). Derived from what the Flutter client actually sends, as of Phase 10. Re-check against the code before each submission; this list is **not legal text**. The in-app Privacy Policy screen links to the full policy at `https://trip-tracker.blackmaroon.in/privacy`.

No data is sold, shared for advertising, or used for tracking. There is no third-party analytics or ad SDK.

## 1. Data collected

| Data | Why | Linked to user | Where it goes | Optional | Deletable |
|---|---|---|---|---|---|
| Email, name, profile photo URL (Google / Apple / email sign-in) | Account, show you to trip members | Yes | Supabase Auth + `profiles` | No (guest mode collects nothing) | Delete account |
| Trip, member, expense, split, settlement, note, checklist, pass data | Core app function, sync to companions | Yes | Supabase (`trips`, `members`, `expenses`, ...) | No | Delete trip / account |
| Chat messages | Trip chat | Yes | Supabase `trip_messages` | Yes | Delete message / account |
| Receipt photos | Attach to expenses | Yes | Supabase private bucket `receipts` | Yes | Delete expense / account |
| Precise location (only while Live Location Share is on, 12 h max) | Show your position to trip members | Yes | Supabase `member_locations` | Yes | Stops on expiry, off switch, account delete |
| Coarse place names / coordinates typed or tagged on expenses and stops | Maps, weather, route | Yes | Supabase + Open-Meteo / Photon / OSRM requests (no user id sent) | Yes | With the trip |
| Device push token (FCM) | Deliver alerts | Yes | Supabase `device_push_tokens` | Yes (asked once, in context) | Removed on sign-out |
| App version and platform | Version gate, push registration, support | Yes (push token row) | Supabase | No | With account |
| Bug reports and feature requests (text, scrubbed recent app logs) | Support, fixes | Yes (author id) | Supabase `bugs`, `features` | Yes | On request |
| Crash reports (error text, stack trace; user id is a one-way hash) | Fix crashes | Hashed id only | Supabase `bugs` (auto-filed, signed-in accounts only) | No | On request |
| Growth telemetry: `app_open`, `sync_fail`, `queue_stuck`, `flush_ok` (platform, app version, client) | Reliability and retention | Yes | Supabase `app_events` | Server flag `enableGrowthTelemetry`, default OFF | With account |
| Contacts (name and phone you pick for an invite) | Compose an invite message | No (not stored) | Stays on device | Yes | n/a |

Logs and bug reports pass through a scrubber (`pii_scrub.dart`) that removes emails, phone numbers and tokens before anything leaves the device.

## 2. Data NOT collected

Payment or bank details (the app moves no money), advertising id, browsing history, health data, address book contents, audio recordings, biometric templates (Face ID / fingerprint stays in the OS secure enclave; the app only receives pass or fail).

## 3. Apple answers (App Privacy)

- Contact Info: Name, Email Address. Linked. App functionality.
- User Content: Other User Content (trips, expenses, notes, chat), Photos. Linked. App functionality.
- Location: Precise Location (only during Live Location Share). Linked. App functionality.
- Identifiers: User ID, Device ID (push token). Linked. App functionality.
- Diagnostics: Crash Data, Performance Data (sync health). Linked (hashed id for crashes). App functionality.
- Tracking: **No**.

## 4. Google Play Data safety answers

- Personal info: name, email. Collected, not shared, required for account.
- Photos: collected (receipts), not shared, optional.
- Location: approximate and precise, collected, shared with the trip members the user chooses, optional.
- App activity and diagnostics: crash logs, diagnostics. Collected, not shared.
- Device or other IDs: push token. Collected, not shared.
- Data encrypted in transit: yes (TLS). Users can request deletion: yes (Settings, Delete account, and the public deletion page).

## 5. Open points for Phase 12

- Confirm the answers above against the final dependency list (`DEPENDENCIES.md`).
- Add the document vault and voice notes rows if those features ship (they are off today).
- Provide the Apple "Sign in with Apple" and account deletion review notes.
