# GitHub Actions Mobile Builds (Android & iOS)

This repository includes automated GitHub Actions workflows to compile **Android (APK & AAB)** and **iOS (.app Simulator & .xcarchive)** builds directly on GitHub without requiring external CI/CD tools.

---

## 1. Workflows Overview

| Workflow | File | Environment | Outputs |
|---|---|---|---|
| **Build Android App** | [`.github/workflows/build-android.yml`](file:///.github/workflows/build-android.yml) | `ubuntu-latest` (Java 17 + Node 20) | Debug/Release `.apk` + Release `.aab` |
| **Build iOS App** | [`.github/workflows/build-ios.yml`](file:///.github/workflows/build-ios.yml) | `macos-14` (Apple Silicon M1/M2) | Simulator `.app.zip` + `.xcarchive.zip` |

---

## 2. Triggering a Build Manually

### For Android:
1. Go to your GitHub repository -> **Actions** tab.
2. Under **Workflows** on the left, click **Build Android App (APK & AAB)**.
3. Click **Run workflow**:
   - Choose branch: `main`
   - Select **Build Type**:
     - `debug` (for an installable testing `.apk` without signing keys)
     - `release` (for signed `.apk` and Google Play Store `.aab`)
4. Click **Run workflow**.

### For iOS:
1. Go to your GitHub repository -> **Actions** tab.
2. Click **Build iOS App**.
3. Select **Build Target**:
   - `simulator` (zipped `.app` to drag & drop into macOS iOS Simulator)
   - `unsigned-ipa` (zipped `.xcarchive` for Xcode organizer / manual resigning)
4. Click **Run workflow**.

---

## 3. Downloading Artifacts

1. When the workflow run completes (green checkmark), click on the completed run.
2. Scroll down to the **Artifacts** section at the bottom of the summary page.
3. Click the artifact name (e.g. `android-build-debug-12`) to download the `.zip` containing your `.apk` or `.aab`.

---

## 4. Configuring Repository Secrets (Optional for Release Signing)

In your GitHub repository, go to **Settings -> Secrets and variables -> Actions**:

- `VITE_SUPABASE_URL`: Your Supabase URL (e.g. `https://xxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Anonymous Public Key
- `ANDROID_KEYSTORE_BASE64` (Optional): Base64 encoded string of your release `.keystore` (`base64 -w 0 release.keystore`)
- `CM_KEYSTORE_PASSWORD` (Optional): Keystore password
- `CM_KEY_ALIAS` (Optional): Key alias name
- `CM_KEY_PASSWORD` (Optional): Key password
