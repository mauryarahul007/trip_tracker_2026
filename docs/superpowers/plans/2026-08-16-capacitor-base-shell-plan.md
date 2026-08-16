# Capacitor Base Shell + Store-Ready Build Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the existing trip_tracker_2026 web app in a Capacitor native shell for Android and iOS, fix the two things that break in that shell (asset base path, Google OAuth redirect), and stand up a Codemagic CI pipeline that produces signed, store-installable build artifacts without a local Mac.

**Architecture:** Capacitor copies the existing Vite production build (`dist/`) into two new native projects (`android/`, `ios/`) added at the repo root. A platform check (`Capacitor.isNativePlatform()`) branches the one piece of app code that behaves differently natively: Google sign-in, which switches from a full-page browser redirect to an in-app-browser + deep-link callback. Everything else — UI, Zustand store, IndexedDB/localStorage persistence, Supabase calls — runs unmodified inside the native WebView.

**Tech Stack:** `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/browser`, `@capacitor/app`, `@capacitor/assets` (dev-only, icon/splash generation), Codemagic (cloud CI/CD, macOS + Linux build pools).

**Spec:** `docs/superpowers/specs/2026-08-16-capacitor-base-shell-design.md`

## Global Constraints

- App ID is `com.triptracker.app` — permanent once published, must be used verbatim everywhere it appears (capacitor.config.ts, Info.plist bundle ID, AndroidManifest applicationId, custom URL scheme, Codemagic signing config).
- The existing `npm run build` (GitHub Pages target, base path `/trip_tracker_2026/`) must not change behavior. Native builds set `VITE_BASE_PATH=/` as an environment variable at build time — following the exact pattern `.github/workflows/deploy-ec2.yml` already uses for its own root-path deploy target — not a new npm script.
- No camera or location permission strings go into `Info.plist`/`AndroidManifest.xml` in this plan — those belong to the follow-up Camera/Geolocation plan (an unused permission is a common store-review rejection reason).
- Web sign-in behavior (`authStore.ts`'s existing browser redirect flow) must be byte-for-byte unchanged for non-native platforms.

---

### Task 1: Install Capacitor and initialize config

**Files:**
- Modify: `package.json` (new dependencies)
- Create: `capacitor.config.ts`

**Interfaces:**
- Produces: `capacitor.config.ts` default-exports a `CapacitorConfig` object with `appId: 'com.triptracker.app'`, `appName: 'Trip Tracker 2026'`, `webDir: 'dist'` — every later task that touches native config reads this file as the source of truth for app ID/name.

- [ ] **Step 1: Install core Capacitor packages**

Run: `npm install @capacitor/core @capacitor/cli`

- [ ] **Step 2: Create `capacitor.config.ts`**

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.triptracker.app',
  appName: 'Trip Tracker 2026',
  webDir: 'dist',
};

export default config;
```

- [ ] **Step 3: Verify the CLI reads the config**

Run: `npx cap --version` then `npx cap doctor`
Expected: prints Capacitor CLI/core versions with no "config not found" error. `cap doctor` will report Android/iOS platforms as "not installed" — expected at this point, fixed in Task 2.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json capacitor.config.ts
git commit -m "chore: install Capacitor core and add base config"
```

---

### Task 2: Add native Android and iOS platform projects

**Files:**
- Modify: `package.json` (new dependencies)
- Create: `android/` (generated native Android project)
- Create: `ios/` (generated native iOS project)

**Interfaces:**
- Consumes: `capacitor.config.ts` from Task 1 (appId/appName/webDir).
- Produces: `android/app/build.gradle` (Android app module, edited in Task 7/8), `ios/App/App/Info.plist` (edited in Task 5/6), `ios/App/App.xcodeproj` (SPM-based project, no CocoaPods/workspace — build entry point for Codemagic in Task 10; see that task's plan-correction note).

- [ ] **Step 1: Install platform packages**

Run: `npm install @capacitor/android @capacitor/ios`

- [ ] **Step 2: Build the web app once so `dist/` exists**

Run: `npm run build`
Expected: `dist/index.html` and hashed asset files exist. `npx cap add` copies whatever is currently in `webDir` as the platform's initial bundled state.

- [ ] **Step 3: Add both native platforms**

Run: `npx cap add android`
Run: `npx cap add ios`
Expected: `android/` and `ios/` directories are created at the repo root, each a complete native project scaffolded with the appId/appName from `capacitor.config.ts`.

- [ ] **Step 4: Verify `cap doctor` is clean**

Run: `npx cap doctor`
Expected: both Android and iOS report as installed with matching versions, no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json android ios
git commit -m "feat: add Capacitor Android and iOS native projects"
```

---

### Task 3: Native build produces root-relative assets (base path fix)

**Files:**
- Modify: `capacitor.config.ts`

**Interfaces:**
- Consumes: existing `vite.config.ts` `VITE_BASE_PATH` override (already used by `.github/workflows/deploy-ec2.yml`) — no changes needed to `vite.config.ts` itself.
- Produces: documented convention that any native build/sync must run with `VITE_BASE_PATH=/` set, consumed by Task 8's Codemagic config.

- [ ] **Step 1: Reproduce the bug locally**

Run: `npm run build && npx cap sync`
Then open `dist/index.html` and check the generated `<script src=...>`/`<link href=...>` paths.
Expected (the bug): paths are prefixed `/trip_tracker_2026/assets/...` — correct for GitHub Pages, broken for a native shell serving from its own local root. This confirms the failure mode described in the spec before fixing it.

- [ ] **Step 2: Rebuild with the root base path**

Run: `VITE_BASE_PATH=/ npm run build && npx cap sync`
Then re-check `dist/index.html`.
Expected: paths are now `/assets/...` (root-relative, no `/trip_tracker_2026/` prefix).

- [ ] **Step 3: Add a code comment documenting the required env var for native builds**

In `capacitor.config.ts`, add a comment above the config object:

```typescript
// Native builds (this file) must be produced with VITE_BASE_PATH=/ set —
// see .github/workflows/deploy-ec2.yml for the equivalent pattern used by
// the root-path web deploy target. `npm run build` alone defaults to the
// /trip_tracker_2026/ GitHub Pages path and must not be used to feed `cap sync`.
import type { CapacitorConfig } from '@capacitor/cli';
```

- [ ] **Step 4: Confirm the GitHub Pages build is unaffected**

Run: `npm run build`
Then check `dist/index.html` again.
Expected: paths are back to `/trip_tracker_2026/assets/...` — proves the two build targets are independent and neither leaked into the other.

- [ ] **Step 5: Commit**

```bash
git add capacitor.config.ts
git commit -m "docs: document VITE_BASE_PATH=/ requirement for native builds"
```

---

### Task 4: Generate app icons and splash screens

**Files:**
- Create: `resources/icon.png` (1024x1024 source icon)
- Create: `resources/splash.png` (2732x2732 source splash)
- Modify: `package.json` (new devDependency, new script)
- Modify: `android/app/src/main/res/**` (generated icon/splash variants)
- Modify: `ios/App/App/Assets.xcassets/**` (generated icon/splash variants)

**Interfaces:**
- Consumes: `public/favicon.svg` (existing brand mark — a multicolor purple/blue mark, not a flat theme-colored glyph) and `public/manifest.json`'s `background_color` (`#F2ECDC`, a warm cream — distinct from `theme_color` `#1F6E68`, which tints browser chrome, not icon canvases) as the source palette.
- Produces: populated native icon/splash asset catalogs — no code-facing interface, this is a one-way asset generation step.

- [ ] **Step 1: Install the asset generator**

Run: `npm install -D @capacitor/assets`

- [ ] **Step 2: Rasterize the existing SVG favicon into a 1024x1024 source icon**

Run: `mkdir -p resources`
Convert `public/favicon.svg` to a 1024x1024 PNG on a `#F2ECDC` background and save as `resources/icon.png`. If no local SVG rasterizer (e.g. `rsvg-convert`, `inkscape`, or `sharp` via a one-off Node script) is available in the environment, use `npx sharp-cli` or an equivalent already-available tool — the deliverable is a real 1024x1024 PNG file at this path, not a placeholder.

- [ ] **Step 3: Create a 2732x2732 splash source**

Save a `#F2ECDC`-background, centered version of the same mark as `resources/splash.png` (2732x2732 — Capacitor's asset generator derives all required iOS/Android splash sizes from this single source).

- [ ] **Step 4: Add a generation script and run it**

In `package.json` scripts, add:
```json
"generate:assets": "capacitor-assets generate --android --ios"
```

The `--android --ios` scoping is required, not optional: the bare `capacitor-assets generate` also auto-detects `public/manifest.json` as a PWA target and rewrites/deletes existing web PWA icon assets (`public/favicon.svg`, `public/manifest.json`'s icons array) — which would violate this plan's constraint that the existing web build stay unaffected. Scoping to `--android --ios` generates only the native platforms' assets.

Run: `npm run generate:assets`
Expected: populates `android/app/src/main/res/mipmap-*/` (launcher icons) and `ios/App/App/Assets.xcassets/AppIcon.appiconset/` + `Splash.imageset/` with the full required size matrix. `public/favicon.svg` and `public/manifest.json` must be untouched — verify with `git status public/` showing no changes.

- [ ] **Step 5: Verify generated files exist**

Run: `find android/app/src/main/res -iname "ic_launcher*" | head -5`
Run: `find ios/App/App/Assets.xcassets -iname "*.png" | head -5`
Expected: both commands print generated files (non-empty output).

- [ ] **Step 6: Commit**

```bash
git add resources package.json package-lock.json android/app/src/main/res ios/App/App/Assets.xcassets
git commit -m "feat: generate app icons and splash screens from brand mark"
```

---

### Task 5: Extract a testable native-vs-web OAuth redirect helper

**Files:**
- Create: `src/utils/nativeAuth.ts`
- Test: `src/utils/nativeAuth.test.ts`

**Interfaces:**
- Produces: `buildOAuthRedirectUrl(isNative: boolean, origin: string, redirectPath: string): string` and `parseNativeAuthCallback(callbackUrl: string): string | null` (extracts the raw `code`/token query string portion Supabase needs from a deep-link callback URL, or `null` if the URL doesn't match the expected callback scheme) — both consumed by `authStore.ts` in Task 6.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/utils/nativeAuth.test.ts
import { describe, it, expect } from 'vitest';
import { buildOAuthRedirectUrl, parseNativeAuthCallback } from './nativeAuth';

describe('buildOAuthRedirectUrl', () => {
  it('returns the custom URL scheme callback for native platforms, ignoring origin/path', () => {
    expect(buildOAuthRedirectUrl(true, 'https://ignored.example', '/trips/abc')).toBe(
      'com.triptracker.app://auth/callback'
    );
  });

  it('returns origin + redirectPath for web', () => {
    expect(buildOAuthRedirectUrl(false, 'https://triptracker.example', '/trips/abc')).toBe(
      'https://triptracker.example/trips/abc'
    );
  });

  it('defaults redirectPath to / on web when omitted', () => {
    expect(buildOAuthRedirectUrl(false, 'https://triptracker.example', undefined)).toBe(
      'https://triptracker.example/'
    );
  });
});

describe('parseNativeAuthCallback', () => {
  it('returns the query string portion of a matching callback URL', () => {
    const url = 'com.triptracker.app://auth/callback?code=abc123&state=xyz';
    expect(parseNativeAuthCallback(url)).toBe('code=abc123&state=xyz');
  });

  it('returns null for a URL that does not match the callback scheme', () => {
    expect(parseNativeAuthCallback('com.triptracker.app://something/else?code=abc123')).toBeNull();
  });

  it('returns null for an unrelated URL', () => {
    expect(parseNativeAuthCallback('https://example.com/?code=abc123')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/nativeAuth.test.ts`
Expected: FAIL — `nativeAuth.ts` does not exist yet ("Failed to resolve import").

- [ ] **Step 3: Implement the helpers**

```typescript
// src/utils/nativeAuth.ts
const NATIVE_AUTH_CALLBACK_PREFIX = 'com.triptracker.app://auth/callback';

/**
 * Native has no stable https origin to redirect back to, so it always
 * targets the app's registered custom URL scheme instead of origin+path.
 */
export function buildOAuthRedirectUrl(
  isNative: boolean,
  origin: string,
  redirectPath: string = '/'
): string {
  if (isNative) {
    return NATIVE_AUTH_CALLBACK_PREFIX;
  }
  return `${origin}${redirectPath}`;
}

/**
 * Extracts the query string Supabase needs from a deep-link callback URL.
 * Returns null if the URL isn't our registered auth callback.
 */
export function parseNativeAuthCallback(callbackUrl: string): string | null {
  if (!callbackUrl.startsWith(`${NATIVE_AUTH_CALLBACK_PREFIX}?`)) {
    return null;
  }
  return callbackUrl.slice(`${NATIVE_AUTH_CALLBACK_PREFIX}?`.length);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/nativeAuth.test.ts`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/nativeAuth.ts src/utils/nativeAuth.test.ts
git commit -m "feat: add testable native/web OAuth redirect helpers"
```

---

### Task 6: Wire native Google sign-in through authStore

**Files:**
- Modify: `src/store/authStore.ts`
- Modify: `src/services/supabaseClient.ts`
- Test: `src/store/authStore.test.ts` (create if it doesn't already exist)

**Interfaces:**
- Consumes: `buildOAuthRedirectUrl`/`parseNativeAuthCallback` from Task 5; `Capacitor.isNativePlatform()` from `@capacitor/core`; `Browser.open`/`Browser.close` from `@capacitor/browser`; `App.addListener('appUrlOpen', ...)` from `@capacitor/app`.
- Produces: `signInWithGoogle` behavior unchanged on web; on native, opens the OAuth URL in an in-app browser and completes the session via the deep-link callback.

- [ ] **Step 1: Install the two native plugins this task needs**

Run: `npm install @capacitor/browser @capacitor/app`

- [ ] **Step 2: Switch the Supabase client to PKCE flow with URL detection disabled on native**

Read `src/services/supabaseClient.ts` first, then modify the `createClient` call to pass an `auth` option:

```typescript
import { Capacitor } from '@capacitor/core';
// ...existing imports...

export const supabase = createClient<Database>(activeUrl, activeKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: !Capacitor.isNativePlatform(),
  },
});
```

`detectSessionInUrl` stays `true` on web (unchanged existing behavior — Supabase parses the callback out of the browser's own URL after redirect). On native there is no browser URL to parse, so it's disabled and the deep-link listener in Step 4 completes the session manually instead.

- [ ] **Step 3: Write the failing test for the native sign-in path**

First check whether `src/store/authStore.test.ts` already exists; if so, add to it, otherwise create it:

```typescript
// src/store/authStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));

const openMock = vi.fn();
const closeMock = vi.fn();
vi.mock('@capacitor/browser', () => ({
  Browser: { open: (...args: unknown[]) => openMock(...args), close: (...args: unknown[]) => closeMock(...args) },
}));

const signInWithOAuthMock = vi.fn().mockResolvedValue({ data: { url: 'https://accounts.google.com/o/oauth2/mock' }, error: null });
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
      signInWithOAuth: signInWithOAuthMock,
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

import { useAuthStore } from './authStore';

beforeEach(() => {
  openMock.mockClear();
  signInWithOAuthMock.mockClear();
});

describe('signInWithGoogle on native', () => {
  it('requests an OAuth URL with skipBrowserRedirect and opens it via the in-app browser', async () => {
    await useAuthStore.getState().signInWithGoogle('/trips/abc');

    expect(signInWithOAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: 'com.triptracker.app://auth/callback',
          skipBrowserRedirect: true,
        }),
      })
    );
    expect(openMock).toHaveBeenCalledWith({ url: 'https://accounts.google.com/o/oauth2/mock' });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/store/authStore.test.ts`
Expected: FAIL — current `signInWithGoogle` always uses `window.location.origin`, never calls `Browser.open`, and doesn't pass `skipBrowserRedirect`.

- [ ] **Step 5: Implement the native branch in `authStore.ts`**

Read the full current file first (`src/store/authStore.ts`), then replace `signInWithGoogle` with:

```typescript
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';
import { buildOAuthRedirectUrl, parseNativeAuthCallback } from '../utils/nativeAuth';
// ...existing imports...

signInWithGoogle: async (redirectPath = '/') => {
  set({ authError: null });
  const isNative = Capacitor.isNativePlatform();
  const redirectTo = buildOAuthRedirectUrl(isNative, window.location.origin, redirectPath);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      ...(isNative ? { skipBrowserRedirect: true } : {}),
    },
  });

  if (error) {
    set({ authError: error.message });
    return;
  }

  if (isNative && data?.url) {
    await Browser.open({ url: data.url });
  }
},
```

Then add a one-time native deep-link listener, registered inside the existing `initialize()` action right after the current `onAuthStateChange` subscription:

```typescript
if (Capacitor.isNativePlatform()) {
  CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
    const query = parseNativeAuthCallback(url);
    if (!query) return;
    await Browser.close();
    const { error } = await supabase.auth.exchangeCodeForSession(`?${query}`);
    if (error) {
      set({ authError: error.message });
    }
  });
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/store/authStore.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the full test suite to confirm no regressions**

Run: `npx vitest run`
Expected: PASS — in particular, any existing web-path `authStore` behavior (if previously tested) is unaffected, since `Capacitor.isNativePlatform()` is mocked per-test and defaults to `false` (real `@capacitor/core` behavior in a non-native jsdom test environment) everywhere else.

- [ ] **Step 8: Commit**

```bash
git add src/store/authStore.ts src/store/authStore.test.ts src/services/supabaseClient.ts package.json package-lock.json
git commit -m "feat: native Google sign-in via in-app browser + deep-link callback"
```

---

### Task 7: Register the custom URL scheme natively

**Files:**
- Modify: `ios/App/App/Info.plist`
- Modify: `android/app/src/main/AndroidManifest.xml`

**Interfaces:**
- Consumes: the `com.triptracker.app://auth/callback` scheme hardcoded in `src/utils/nativeAuth.ts` (Task 5) — must match exactly.
- Produces: OS-level deep-link registration so the OAuth provider's redirect actually reaches the app.

- [ ] **Step 1: Read the current `Info.plist`**

Read `ios/App/App/Info.plist` to see its current structure before editing.

- [ ] **Step 2: Add the URL scheme to `Info.plist`**

Add a `CFBundleURLTypes` entry (inside the top-level `<dict>`, alongside existing keys like `CFBundleIdentifier`):

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.triptracker.app</string>
    </array>
  </dict>
</array>
```

- [ ] **Step 3: Read the current `AndroidManifest.xml`**

Read `android/app/src/main/AndroidManifest.xml` to see the existing `<activity>` block for `MainActivity` before editing.

- [ ] **Step 4: Add an intent filter to the main activity**

Inside the existing `<activity android:name=".MainActivity" ...>` block in `AndroidManifest.xml`, add a new `<intent-filter>` (alongside the existing launcher intent filter, not replacing it):

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.triptracker.app" android:host="auth" android:pathPrefix="/callback" />
</intent-filter>
```

- [ ] **Step 5: Document the required Supabase Auth dashboard change**

This step has no repo file to change — record it as a manual, one-time action in a code comment for future readers. In `src/utils/nativeAuth.ts`, above `NATIVE_AUTH_CALLBACK_PREFIX`, add:

```typescript
// NOTE: com.triptracker.app://auth/callback must be added to
// Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs
// or native sign-in will fail with a redirect_uri_mismatch error.
```

- [ ] **Step 6: Commit**

```bash
git add ios/App/App/Info.plist android/app/src/main/AndroidManifest.xml src/utils/nativeAuth.ts
git commit -m "feat: register custom URL scheme for native OAuth callback"
```

---

### Task 8: Sync package.json version to native version fields

**Files:**
- Create: `scripts/sync-native-version.mjs`
- Modify: `android/app/build.gradle`
- Modify: `ios/App/App.xcodeproj/project.pbxproj`

**Interfaces:**
- Consumes: `package.json`'s `version` field (semver, e.g. `"0.0.0"`); `process.env.CM_BUILD_NUMBER` (Codemagic's built-in incrementing build number env var, available in every Codemagic build) as the integer build-number source.
- Produces: a Node script runnable as `node scripts/sync-native-version.mjs`, invoked by Codemagic in Task 9 before the platform-specific build steps.

- [ ] **Step 1: Read the generated native version files first**

Read `android/app/build.gradle` and locate the `defaultConfig { versionCode ... versionName ... }` block.
Read `ios/App/App.xcodeproj/project.pbxproj` and locate the `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` build settings (there are usually two near-identical `PBXBuildConfiguration` blocks — Debug and Release — both need updating).

- [ ] **Step 2: Write the sync script**

```javascript
// scripts/sync-native-version.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url)) + '/..';
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const version = pkg.version;
const buildNumber = process.env.CM_BUILD_NUMBER || '1';

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`package.json version "${version}" is not a plain semver x.y.z string.`);
}

// Android: android/app/build.gradle
const gradlePath = join(rootDir, 'android/app/build.gradle');
let gradle = readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode \d+/, `versionCode ${buildNumber}`);
gradle = gradle.replace(/versionName "[^"]*"/, `versionName "${version}"`);
writeFileSync(gradlePath, gradle);

// iOS: ios/App/App.xcodeproj/project.pbxproj
const pbxprojPath = join(rootDir, 'ios/App/App.xcodeproj/project.pbxproj');
let pbxproj = readFileSync(pbxprojPath, 'utf8');
pbxproj = pbxproj.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`);
pbxproj = pbxproj.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`);
writeFileSync(pbxprojPath, pbxproj);

console.log(`Synced native versions: version=${version} buildNumber=${buildNumber}`);
```

- [ ] **Step 3: Run it locally to verify**

Run: `CM_BUILD_NUMBER=42 node scripts/sync-native-version.mjs`
Expected: prints `Synced native versions: version=0.0.0 buildNumber=42`. Then check:
Run: `grep -A1 "versionCode" android/app/build.gradle`
Run: `grep "MARKETING_VERSION\|CURRENT_PROJECT_VERSION" ios/App/App.xcodeproj/project.pbxproj`
Expected: values reflect `0.0.0` / `42` (or whatever `package.json`'s current version is).

- [ ] **Step 4: Revert the local test edit so the committed native files stay at their generated defaults**

Run: `git checkout -- android/app/build.gradle ios/App/App.xcodeproj/project.pbxproj`
(The script is meant to run at CI build time, not leave a permanently-edited version baked into the repo.)

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-native-version.mjs
git commit -m "feat: add native version sync script for CI builds"
```

---

### Task 9: Add signing config placeholders for Codemagic-injected credentials

**Files:**
- Modify: `android/app/build.gradle`

**Interfaces:**
- Consumes: `CM_KEYSTORE_PATH`, `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS`, `CM_KEY_PASSWORD` — environment variables Codemagic injects automatically once an Android code-signing identity is configured in its UI for this app (standard Codemagic convention, not something this repo defines).
- Produces: a `release` signing config Task 10's Codemagic Android job's `./gradlew bundleRelease` picks up automatically.

- [ ] **Step 1: Read the current `android/app/build.gradle`**

Read the file and locate the `android { ... }` block, specifically `signingConfigs` (likely absent) and `buildTypes { release { ... } }`.

- [ ] **Step 2: Add a release signing config that only activates when the CI env vars are present**

Inside the `android { ... }` block, add (as a sibling of `defaultConfig` and `buildTypes`):

```gradle
signingConfigs {
    release {
        if (System.getenv("CM_KEYSTORE_PATH")) {
            storeFile file(System.getenv("CM_KEYSTORE_PATH"))
            storePassword System.getenv("CM_KEYSTORE_PASSWORD")
            keyAlias System.getenv("CM_KEY_ALIAS")
            keyPassword System.getenv("CM_KEY_PASSWORD")
        }
    }
}
```

Then inside `buildTypes { release { ... } }`, add:

```gradle
signingConfig signingConfigs.release
```

Guarding on `System.getenv("CM_KEYSTORE_PATH")` means a local `./gradlew bundleRelease` run without those env vars set produces an unsigned build (fails cleanly at the OS-install step, not at Gradle config time) rather than erroring on missing config — this only fully activates inside Codemagic, where the user configures the signing identity once in the Codemagic UI.

- [ ] **Step 3: Verify the Gradle file is still syntactically valid**

Run: `cd android && ./gradlew tasks --console=plain 2>&1 | head -20 ; cd ..`
Expected: Gradle successfully evaluates the project and lists tasks (no groovy syntax error). It's fine if `bundleRelease` itself isn't attempted here — no local keystore exists yet, and this step only confirms the file parses.

- [ ] **Step 4: Commit**

```bash
git add android/app/build.gradle
git commit -m "feat: add CI-driven Android release signing config"
```

---

### Task 10: Codemagic pipeline for signed Android and iOS builds

**Files:**
- Create: `codemagic.yaml`

**Interfaces:**
- Consumes: `scripts/sync-native-version.mjs` (Task 8), the `signingConfigs.release` block (Task 9), `VITE_BASE_PATH` build-time env var (Task 3), the app's existing `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` env vars (already required by `src/services/supabaseClient.ts`, currently supplied as GitHub Actions secrets for the EC2 deploy — same values need to exist as Codemagic environment variables, entered manually in the Codemagic UI since they're account secrets, not committed to the repo).
- Produces: two independently-triggerable Codemagic workflows (`android-release`, `ios-release`) that each output a downloadable, signed artifact.

- [ ] **Step 1: Write `codemagic.yaml`**

```yaml
workflows:
  android-release:
    name: Android Release Build
    max_build_duration: 30
    instance_type: linux_x2
    environment:
      groups:
        - trip_tracker_secrets
        - android_signing
      vars:
        VITE_BASE_PATH: "/"
      node: 20
    triggering:
      events: []
    scripts:
      - name: Install dependencies
        script: npm ci
      - name: Build web assets
        script: npm run build
      - name: Sync native version
        script: node scripts/sync-native-version.mjs
      - name: Sync Capacitor Android
        script: npx cap sync android
      - name: Build signed Android App Bundle
        script: |
          cd android
          ./gradlew bundleRelease
    artifacts:
      - android/app/build/outputs/**/*.aab

  ios-release:
    name: iOS Release Build
    max_build_duration: 60
    instance_type: mac_mini_m2
    integrations:
      app_store_connect: codemagic_asc_api_key
    environment:
      groups:
        - trip_tracker_secrets
      ios_signing:
        distribution_type: app_store
        bundle_identifier: com.triptracker.app
      vars:
        VITE_BASE_PATH: "/"
      node: 20
      xcode: latest
    triggering:
      events: []
    scripts:
      - name: Install dependencies
        script: npm ci
      - name: Build web assets
        script: npm run build
      - name: Sync native version
        script: node scripts/sync-native-version.mjs
      - name: Sync Capacitor iOS
        script: npx cap sync ios
      - name: Build and sign ipa
        script: |
          xcode-project build-ipa --project ios/App/App.xcodeproj --scheme App
    artifacts:
      - ios/App/build/ios/ipa/*.ipa
```

`triggering.events: []` on both workflows means neither auto-fires on push — matches the spec's decision to trigger manually ("Start new build" in the Codemagic UI, or a `v*` tag push configured later if the user wants that instead) rather than on every `main` push.

**Plan correction (discovered during Task 2 implementation):** Capacitor 8.5.0's `cap add ios` scaffolds an SPM-based project (`ios/App/CapApp-SPM/Package.swift`), not CocoaPods — there is no `Podfile` and no top-level `ios/App/App.xcworkspace`. The build entry point is `ios/App/App.xcodeproj` directly. The `cocoapods: default` environment key, the "Install CocoaPods dependencies" script step, and the `--workspace ios/App/App.xcworkspace` flag from this task's original text have all been removed/corrected above — see the ledger for the ruling.

- [ ] **Step 2: Document the one-time manual Codemagic setup this file assumes**

This is app-owner account configuration, not something committable to the repo (it involves real secrets). Add a short section to the end of `README.md`:

```markdown
## Native app builds (Codemagic)

`codemagic.yaml` defines two manually-triggered workflows: `android-release` and `ios-release`.
Before running either for the first time, in the Codemagic dashboard:

1. Create an environment variable group named `trip_tracker_secrets` containing
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values as the GitHub Actions
   `deploy-ec2` workflow secrets).
2. For Android: create an environment variable group named `android_signing` and configure
   an Android code signing identity in Codemagic's UI — this auto-populates the
   `CM_KEYSTORE_*` variables `android/app/build.gradle`'s signing config reads.
3. For iOS: add an App Store Connect API key integration named `codemagic_asc_api_key`
   (Codemagic dashboard -> Teams -> Integrations -> App Store Connect), using the Apple
   Developer account's API key.
```

- [ ] **Step 3: Validate YAML syntax**

Run: `node -e "require('js-yaml').load(require('fs').readFileSync('codemagic.yaml', 'utf8')); console.log('valid')"`
(If `js-yaml` isn't already a dependency, run `npx -y js-yaml codemagic.yaml > /dev/null && echo valid` instead — either just confirms the file parses as YAML.)
Expected: prints `valid`, no parse error.

- [ ] **Step 4: Commit**

```bash
git add codemagic.yaml README.md
git commit -m "feat: add Codemagic CI pipeline for signed Android/iOS builds"
```

---

### Task 11: On-device verification and final sign-off

**Files:**
- None (verification-only task; no code changes expected unless a check below fails, in which case return to the relevant earlier task).

**Interfaces:**
- Consumes: everything from Tasks 1–10.
- Produces: a written verification record appended to `decisions.md`, matching this repo's existing pattern of logging architectural decisions/trade-offs (see entries #1–#22).

- [ ] **Step 1: Trigger both Codemagic workflows**

In the Codemagic dashboard, manually start `android-release` and `ios-release` (per the one-time setup documented in Task 10, Step 2, which the user completes since it requires their account credentials).
Expected: both complete successfully and produce a downloadable `.aab` and `.ipa`.

- [ ] **Step 2: Install and verify the Android build**

Install the built `.aab`/a locally-built debug `.apk` on a physical Android device or emulator.
Checklist:
- [ ] App launches to the trips list screen without a blank/broken page.
- [ ] Create a trip, add a member, add an expense, view balances — matches existing web behavior.
- [ ] Reload the app (force-stop and reopen) — data persists (confirms `localStorage`/IndexedDB persistence works inside the native WebView).
- [ ] Tap "Sign in with Google" — completes and returns to the signed-in app state (confirms the Task 6/7 OAuth deep-link flow).

- [ ] **Step 3: Install and verify the iOS build via TestFlight**

Upload the `.ipa` to TestFlight (via Codemagic's App Store Connect integration, or manually through Transporter) and install on a physical iPhone.
Run through the same checklist as Step 2.

- [ ] **Step 4: Confirm the web deploy is unaffected**

Run: `npm run build`
Check `dist/index.html` references `/trip_tracker_2026/assets/...` (not `/assets/...`).
Visit the live GitHub Pages URL and confirm the site still loads and Google sign-in still works there (unchanged web-path behavior from Task 6).

- [ ] **Step 5: Record the outcome in `decisions.md`**

Read the end of `decisions.md` first to match its existing format (see entry #22 for the most recent example), then append a new numbered entry summarizing this sub-project: what was built (Capacitor shell, OAuth fix, base path fix, Codemagic pipeline), and any trade-offs accepted (e.g. placeholder icon art pending real design, manual-trigger-only CI).

- [ ] **Step 6: Commit**

```bash
git add decisions.md
git commit -m "docs: record Capacitor base shell sub-project completion"
```
