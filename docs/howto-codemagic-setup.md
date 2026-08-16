# Codemagic CI/CD Setup Guide (Android & iOS)

This project is configured for automated native Android and iOS builds using [Codemagic](https://codemagic.io/).

---

## 1. Workflows Configured in `codemagic.yaml`

| Workflow ID | Platform | Artifacts Produced | Use Case |
|---|---|---|---|
| `android-release` | Android (Linux VM) | `.aab` (Bundle) + `.apk` | Google Play Store & signed device distribution |
| `android-debug` | Android (Linux VM) | Universal `.apk` | Quick testing without keystores |
| `ios-release` | iOS (Mac Mini M2) | `.ipa` | Apple App Store & TestFlight |
| `ios-simulator` | iOS (Mac Mini M2) | `.app` (Zip) | Testing on iOS Simulator |

---

## 2. Environment Variables & Secret Groups

In your Codemagic Dashboard, navigate to **Apps -> Your App -> Environment variables** and configure the following groups:

### Group 1: `trip_tracker_secrets`
Add your frontend environment secrets:
- `VITE_SUPABASE_URL`: Your Supabase Project URL (e.g. `https://xxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Anonymous Public Key

---

### Group 2: `android_signing` (For `android-release`)
In **Codemagic -> Team Settings -> Code signing identities -> Android keystores**:
1. Upload your release `.keystore` / `.jks` file.
2. Enter your **Key alias**, **Key password**, and **Keystore password**.
3. Create a reference named `android_signing`.

Codemagic will automatically expose:
- `CM_KEYSTORE_PATH`
- `CM_KEYSTORE_PASSWORD`
- `CM_KEY_ALIAS`
- `CM_KEY_PASSWORD`

---

### Group 3: iOS Code Signing (For `ios-release`)
In **Codemagic -> Team Settings -> Integrations -> Apple Developer Portal**:
1. Add an **App Store Connect API key**:
   - Key Name: `codemagic_asc_api_key`
   - Issuer ID: (From App Store Connect -> Users and Access -> Integrations -> Keys)
   - Key ID: (Key ID)
   - API key file: (.p8 file)
2. Codemagic will automatically generate provisioning profiles and distribution certificates for bundle ID `com.triptracker.app`.

---

## 3. How Native Versioning Works

Before every build, `scripts/sync-native-version.mjs` runs automatically:
- Reads `version` from `package.json` (e.g. `1.0.0`).
- Reads the incremental build number from Codemagic's `$CM_BUILD_NUMBER`.
- Automatically stamps:
  - `versionCode` & `versionName` in `android/app/build.gradle`.
  - `MARKETING_VERSION` & `CURRENT_PROJECT_VERSION` in `ios/App/App.xcodeproj/project.pbxproj`.

---

## 4. Triggering Builds

### Option A: Via Codemagic UI
1. Go to **Codemagic -> Apps -> Trip Tracker 2026**.
2. Click **Start new build**.
3. Select your branch (`main`) and choose the workflow (`android-release`, `android-debug`, `ios-release`, or `ios-simulator`).
4. Click **Start build**.

### Option B: Automatic Triggers (Optional)
To trigger builds automatically on push to `main` or on tag creation, update the `triggering` block in `codemagic.yaml`:
```yaml
triggering:
  events:
    - push
    - tag
  branch_patterns:
    - pattern: 'main'
      include: true
```
