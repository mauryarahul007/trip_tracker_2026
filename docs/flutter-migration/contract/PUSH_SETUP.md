# Push Notifications Contract & Setup Guide (FCM v1 & APNs)

This document specifies the push notification architecture for the native Flutter app, Firebase Cloud Messaging (FCM v1) setup, APNs credential configuration, and deep-link payload contracts.

---

## 1. Firebase Project Setup & Credentials

In accordance with architectural decision **D2** and **D5**, the Flutter mobile app reuses the existing production Firebase project:
- **Project Name / ID:** Trip Tracker Firebase Project (same project used by Capacitor).
- **Package / Bundle ID:** `com.triptracker.app` (both iOS and Android).

### Configuration Files
- **Android:** Place `google-services.json` in `flutter_app/android/app/google-services.json` (git-ignored, template in `google-services.example.json`).
- **iOS:** Place `GoogleService-Info.plist` in `flutter_app/ios/Runner/GoogleService-Info.plist` (git-ignored).

### APNs Key in Firebase Console
iOS devices register for push notifications with FCM via APNs:
1. Generate an **Apple Push Notifications service (APNs) Auth Key** (`.p8`) in Apple Developer portal.
2. In Firebase Console (**Project Settings → Cloud Messaging → Apple app configuration**):
   - Upload the `.p8` key file.
   - Enter the **Key ID** (10 characters) and **Team ID** (10 characters).

---

## 2. Token Registration & Multi-Client Schema

Migration [`0111_native_push_tokens.sql`](file:///home/rahulm/Documents/trip_tracker_2026/supabase/migrations/0111_native_push_tokens.sql) extends `public.device_push_tokens`:

```sql
create table public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  client text check (client is null or client in ('capacitor', 'flutter', 'web')),
  app_version text,
  fcm_token text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fcm_token)
);
```

### Registration RPC
Flutter clients register their FCM device token upon login via:
```dart
await supabase.rpc('register_device_push_token', params: {
  'p_fcm_token': fcmToken,
  'p_platform': Platform.isIOS ? 'ios' : 'android',
  'p_client': 'flutter',
  'p_app_version': packageInfo.version,
});
```

---

## 3. FCM v1 Payload Schema & Deep Link Routing

The [`send-push`](file:///home/rahulm/Documents/trip_tracker_2026/supabase/functions/send-push/index.ts) Edge Function dispatches push notifications using the FCM HTTP v1 API.

### Payload Structure
```json
{
  "message": {
    "token": "<DEVICE_FCM_TOKEN>",
    "notification": {
      "title": "<TRIP_NAME>",
      "body": "<MESSAGE_BODY>"
    },
    "data": {
      "type": "expense_added",
      "tripId": "8b5cf6e2-...",
      "route": "/trip/8b5cf6e2-.../expenses",
      "click_action": "FLUTTER_NOTIFICATION_CLICK",
      "expenseTitle": "Dinner at Gion",
      "amount": "4500",
      "currency": "JPY"
    },
    "android": {
      "priority": "high",
      "notification": {
        "click_action": "FLUTTER_NOTIFICATION_CLICK",
        "sound": "default",
        "channel_id": "trip_tracker_high_importance"
      }
    },
    "apns": {
      "headers": {
        "apns-priority": "10",
        "apns-push-type": "alert"
      },
      "payload": {
        "aps": {
          "alert": {
            "title": "<TRIP_NAME>",
            "body": "<MESSAGE_BODY>"
          },
          "sound": "default",
          "badge": 1,
          "content-available": 1,
          "mutable-content": 1
        }
      }
    }
  }
}
```

### Route Resolution Mapping
| Notification Type | Target Navigation Route |
|---|---|
| `chat_message` | `/trip/:tripId/chat` |
| `expense_added`, `expense_updated`, `expense_deleted`, `expense_restored` | `/trip/:tripId/expenses` |
| `settlement_reminder`, `settlement_confirmation_requested` | `/trip/:tripId/ledger` |
| `member_added`, `member_added_notice`, `member_joined` | `/trip/:tripId/members` |
| `trip_deleted` | `/` |

---

## 4. Stale Token Pruning & Deduplication

1. **Dead Token Pruning:** `send-push` catches FCM error status `UNREGISTERED` or `NOT_FOUND` and immediately deletes the stale token row from `public.device_push_tokens`.
2. **Active Timestamping:** Each successful send updates `last_seen_at = now()`.
3. **Dual-Install Coexistence:** If a user has both Capacitor and Flutter installed during migration testing, both devices receive notification pings with their respective platform-appropriate payloads.
