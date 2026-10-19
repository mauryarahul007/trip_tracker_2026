# Authentication Contract & Setup Guide (Native Flutter & Backend)

This document establishes the authentication contract for the native Flutter app (`flutter_app/`), configuration requirements in Supabase Auth, and compliance with Apple App Store / Google Play Store policies.

---

## 1. Google Native Sign-In

### Architecture & Token Exchange
Flutter uses native Google Sign-In SDKs (`google_sign_in` plugin) on iOS and Android rather than web OAuth popups. 
1. Client requests Google OAuth credentials with a cryptographically secure SHA-256 hashed nonce.
2. Google Play Services / iOS Google Sign-In returns an OpenID Connect (OIDC) ID token.
3. Client dispatches the ID token to Supabase Auth:
   ```dart
   await supabase.auth.signInWithIdToken(
     provider: OAuthProvider.google,
     idToken: idToken,
     nonce: rawNonce,
   );
   ```

### Client ID Provisioning Matrix
In Google Cloud Console and Supabase Dashboard (**Authentication → Providers → Google**):

| Platform | Client Type | Configuration / Fingerprint | Supabase Dashboard Location |
|---|---|---|---|
| **Web / Backend** | Web application | OAuth 2.0 Web Client ID (Authorized redirect URIs: Supabase project callback) | Primary Client ID |
| **Android** | Android app | Package `com.triptracker.app`, SHA-1 fingerprint of signing keystore | Authorized Client IDs |
| **iOS** | iOS app | Bundle ID `com.triptracker.app`, App Store ID / Team ID | Authorized Client IDs |

> [!NOTE]
> Client IDs are public non-secret identifiers and are passed to Flutter via `--dart-define-from-file` in `env/*.json`. Secrets (`client_secret`) are stored exclusively in Google Cloud and Supabase Dashboard.

---

## 2. Sign in with Apple

### Guideline 4.8 Compliance
Apple App Store Review Guideline 4.8 mandates that applications offering third-party social logins (such as Google) must also offer **Sign in with Apple** with equivalent prominence.

### Apple Developer & Supabase Dashboard Configuration
In Apple Developer portal:
1. **App ID**: `com.triptracker.app` with "Sign In with Apple" capability enabled.
2. **Services ID**: `com.triptracker.app.auth` configured with return URL:
   `https://<project-ref>.supabase.co/auth/v1/callback`
3. **Key ID**: Generated Sign in with Apple private key (`.p8`).
4. **Team ID**: 10-character Apple Developer Team ID.

In Supabase Dashboard (**Authentication → Providers → Apple**):
- **Service ID**: `com.triptracker.app.auth`
- **Team ID**: Apple Team ID
- **Key ID**: Apple Key ID
- **Secret Key**: `.p8` private key contents

### Private Relay & First-Login-Only Name Delivery
- **Private Relay Email:** Apple allows travelers to mask their personal email with an `@privaterelay.appleid.com` address. Supabase Auth handles this natively as the user's primary email.
- **First-Login Name Delivery:** Apple sends the user's given and family name in the authorization credential **only on the very first authorization**. Subsequent sign-ins omit the name.
- **Trigger Hardening (Migration 0113):**
  [`handle_new_user()`](file:///home/rahulm/Documents/trip_tracker_2026/supabase/migrations/0113_auth_and_telemetry_native_parity.sql) has been upgraded with a deterministic display name fallback:
  ```sql
  v_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(split_part(new.email, '@', 1)), ''),
    'Traveler'
  );
  ```

---

## 3. Email, Password & Reset Redirects

### Redirect URL Allow-List
In Supabase Dashboard (**Authentication → URL Configuration → Redirect URLs**), the following URIs must be allow-listed:
- `com.triptracker.app://auth-callback` (Custom scheme redirect for OAuth and email confirmations)
- `https://triptracker.app/reset-password` (Universal Link for password reset)
- `https://triptracker.app/join/*` (Universal Link for trip invitations)

---

## 4. Bot Protection & Captcha Policy

- **Cloudflare Turnstile:** Restricted exclusively to the Superadmin Ops Deck login.
- **Supabase Level Captcha:** Confirmed **DISABLED** for regular traveler authentication (`supabase/config.toml` has `auth.captcha.enabled = false`). Native mobile clients do not render web CAPTCHA widgets.
- **Native Abuse Protection:** Server-side rate limiting on join codes is enforced by IP hash (`public.trip_join_preview_attempts` in migration 0081).

---

## 5. Guest & Demo Account Policy

- **Current Web Architecture:** Guest/demo mode runs client-side with pre-seeded demo state in local storage without registering server rows in `auth.users`.
- **Flutter Implementation:** Flutter app mirrors this client-only sandboxed guest mode in Phase 6. When a guest traveler chooses to link their account to Google/Apple, a real Supabase session is established and local guest data is imported.

---

## 6. Moderation, Bans & Signup Pause

- **User Bans:** Enforced directly in PostgreSQL RLS via [`public.is_banned()`](file:///home/rahulm/Documents/trip_tracker_2026/supabase/migrations/0060_ops_deck_expansion.sql). Any query or mutation attempted by a banned user's JWT is denied by Postgres, regardless of the client platform.
- **Sign-in / Signup Gate (`signup_gate`):** Superadmins can toggle `signup_gate` in `public.app_config`. The mobile app queries `public.get_app_flag('signup_gate')` before rendering login CTAs.

---

## 7. Account Deletion & Data Privacy (App Store Guideline 5.1.1)

Self-service account deletion is provided via [`public.delete_own_account()`](file:///home/rahulm/Documents/trip_tracker_2026/supabase/migrations/0075_delete_own_account.sql):

| Data Category | Deletion & Anonymization Mechanism | Status |
|---|---|---|
| **Credentials & Auth** | `delete from auth.users where id = auth.uid()` | **Complete** |
| **Profile Row** | Cascades via FK `profiles.id references auth.users(id) on delete cascade` | **Complete** |
| **Push Tokens** | Cascades via FK `device_push_tokens.user_id references profiles(id) on delete cascade` | **Complete** |
| **Owned Trips** | Cascades via FK `trips.owner_id references profiles(id) on delete cascade` | **Complete** |
| **Shared Trip Expenses** | Anonymized via `expenses.created_by_user_id on delete set null` (0072). Preserves split math without personal identity. | **Complete** |
| **Member Links** | Anonymized via `members.linked_user_id on delete set null` (0001). | **Complete** |
| **Storage Objects** | **Known Gap:** Receipt images uploaded in owned trips remain in the S3 bucket (`storage.objects`) until cleared by scheduled storage cleanup or bucket lifecycle rule. | Documented gap |
