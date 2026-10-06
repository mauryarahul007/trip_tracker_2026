# Google Sign-In client IDs for the Flutter app

The app signs in with the native Google SDK, gets a Google **ID token**, and hands it to Supabase (`signInWithIdToken`). That needs three OAuth clients in one Google Cloud project, plus the Supabase Google provider told to trust them.

| Client | Used for | Where the ID goes |
|---|---|---|
| **Web application** | The "server" audience of the ID token; also what Supabase's Google provider already uses for the web app | `GOOGLE_SERVER_CLIENT_ID` (dart-define) **and** Supabase → Auth → Providers → Google → Client ID |
| **Android** | Lets Google Play services recognise the app (package + signing SHA-1) | nothing in code; just has to exist |
| **iOS** | Native sign-in on iPhone | `GOOGLE_IOS_CLIENT_ID` (dart-define) |

## Steps

1. Open <https://console.cloud.google.com> and pick (or create) the project the web app's Google login already uses. Reuse it so all clients share one consent screen.
2. **APIs & Services → OAuth consent screen**: confirm the app name, support email and logo. If publishing status is "Testing", add your Google account under *Test users* (otherwise only test users can sign in). Move to "In production" before store release.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - **Web application** (skip if you already have the web app's client): name it `Trip Tracker Web`. Authorized redirect URI: `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`. Copy the **Client ID** (ends in `.apps.googleusercontent.com`) and **Client secret**.
   - **Android**: name `Trip Tracker Android`, package name `com.triptracker.app`, **SHA-1** of the signing key:
     - debug: `cd flutter_app/android && ./gradlew signingReport` (use the `debug` SHA1), or `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
     - release: the SHA-1 of your upload key. If you use **Play App Signing**, also add the *App signing key* SHA-1 from Play Console → Setup → App integrity (create a second Android client for it).
   - **iOS**: name `Trip Tracker iOS`, bundle ID `com.triptracker.app`. Copy the **Client ID**. (The iOS client also gives a *reversed client ID*; add it as a URL scheme in `ios/Runner/Info.plist` under `CFBundleURLTypes` so Google can return to the app.)
4. **Supabase dashboard → Authentication → Providers → Google**: Client ID = the **Web** client ID, Client Secret = the Web secret. In **Authorized Client IDs** (comma separated) add the **iOS** client ID and the Android client ID(s). Without this Supabase rejects tokens whose audience is not the web client.
5. Put the two IDs in your (git-ignored) env file, e.g. `flutter_app/env/dev.json`:
   ```json
   {
     "SUPABASE_URL": "...",
     "SUPABASE_ANON_KEY": "...",
     "GOOGLE_SERVER_CLIENT_ID": "<WEB client id>.apps.googleusercontent.com",
     "GOOGLE_IOS_CLIENT_ID": "<IOS client id>.apps.googleusercontent.com"
   }
   ```
   Run with `flutter run --dart-define-from-file=env/dev.json`.
6. Test on a **real device or an emulator with Google Play services** (plain AOSP emulators cannot show the Google account picker).

## Common failures

| Symptom | Cause |
|---|---|
| `ApiException: 10` / "developer error" on Android | SHA-1 or package name in the Android client doesn't match the build you are running (debug vs release vs Play-signed) |
| Picker works, Supabase says "invalid audience" / "nonce" | Web client ID missing from the Supabase Google provider, or iOS/Android IDs not listed under Authorized Client IDs |
| "Access blocked: app not verified" | Consent screen is in *Testing* and your account isn't a test user |
| Nothing happens, no error | `GOOGLE_SERVER_CLIENT_ID` was not passed (check the `--dart-define-from-file`) |

## Sign in with Apple (iOS)

The Apple button is only shown on iOS (App Store Guideline 4.8 requires it when Google sign-in is offered). It needs an Apple Developer account, the *Sign In with Apple* capability on the App ID, and the provider configured in Supabase; see `AUTH_SETUP.md` §2. Android and the web never show it.
