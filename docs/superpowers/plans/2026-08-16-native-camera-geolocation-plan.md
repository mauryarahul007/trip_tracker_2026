# Native Camera + Geolocation Plugin Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the browser file-input receipt photo picker and `navigator.geolocation` expense geotagging with Capacitor's native Camera and Geolocation plugins, on native platforms only — the web build keeps its current behavior unchanged.

**Architecture:** Both swaps follow the same shape: a platform check (`Capacitor.isNativePlatform()`) branches to a native plugin call on native, and falls through to the existing, untouched browser API on web. Scope is explicitly foreground-only, capture-at-expense-add-time — no background/continuous location tracking (that's a separate future feature the user has deferred).

**Tech Stack:** `@capacitor/camera`, `@capacitor/geolocation` (added to the Capacitor project from the base-shell plan).

**Spec:** No standalone spec doc — scoped via clarifying-question dialogue during brainstorming (see prior conversation); design basis is captured in this plan's Global Constraints and task descriptions.

**Depends on:** `docs/superpowers/plans/2026-08-16-capacitor-base-shell-plan.md` must be complete first — this plan assumes `android/`, `ios/`, and `capacitor.config.ts` already exist.

## Global Constraints

- App ID is `com.triptracker.app`, matching the base-shell plan — no change here, referenced only where permission strings live alongside it.
- Geolocation capture stays foreground-only, triggered only at the moment an expense is being added/edited (same UX moment as today's `+ Tag Location` button and auto-capture-on-open behavior in `ExpenseForm.tsx`) — no background location, no continuous tracking. Live location sharing with the group is explicit future scope, not touched here.
- Web behavior for both photo capture and geolocation must be byte-for-byte unchanged — every task's native branch must leave the existing web code path untouched and, where reasonably testable, covered by regression tests proving so.
- This plan is the one that introduces camera/location permission strings into `Info.plist`/`AndroidManifest.xml` — deliberately deferred out of the base-shell plan to avoid shipping unused-permission store-review rejections.

---

### Task 1: Install plugins and declare permissions

**Files:**
- Modify: `package.json` (new dependencies)
- Modify: `ios/App/App/Info.plist`
- Modify: `android/app/src/main/AndroidManifest.xml`

**Interfaces:**
- Produces: `@capacitor/camera`'s `Camera.getPhoto()` and `@capacitor/geolocation`'s `Geolocation.getCurrentPosition()`/`Geolocation.requestPermissions()` become available for Tasks 2–3 to call.

- [ ] **Step 1: Install the plugins**

Run: `npm install @capacitor/camera @capacitor/geolocation`

- [ ] **Step 2: Read the current `Info.plist`**

Read `ios/App/App/Info.plist` (already modified once in the base-shell plan's Task 7 for the URL scheme — read the current state before editing further).

- [ ] **Step 3: Add iOS permission usage strings**

Add these keys to the top-level `<dict>` in `Info.plist`, alongside the existing keys:

```xml
<key>NSCameraUsageDescription</key>
<string>Trip Tracker uses your camera to attach a photo of a receipt to an expense.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Trip Tracker lets you attach an existing photo of a receipt to an expense.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Trip Tracker can tag the location where an expense happened, only while you're adding it.</string>
```

- [ ] **Step 4: Read the current `AndroidManifest.xml`**

Read `android/app/src/main/AndroidManifest.xml` (already modified once in the base-shell plan's Task 7).

- [ ] **Step 5: Add Android permissions**

Add these `<uses-permission>` elements as siblings of the existing `<application>` tag (permissions live at the manifest root, not inside `<application>`):

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json ios/App/App/Info.plist android/app/src/main/AndroidManifest.xml
git commit -m "feat: install Capacitor Camera/Geolocation plugins and declare permissions"
```

---

### Task 2: Native camera capture for receipt photos

**Files:**
- Modify: `src/utils/image.ts`
- Modify: `src/components/ExpenseForm.tsx`

**Interfaces:**
- Consumes: `Capacitor.isNativePlatform()` from `@capacitor/core`; `Camera.getPhoto()` from `@capacitor/camera`.
- Produces: `compressDataUrlToDataUrl(dataUrl: string): Promise<string>` (new export from `image.ts`, sibling to the existing `compressImageToDataUrl(file: File)`), and a new `handleNativeCameraCapture` handler in `ExpenseForm.tsx` alongside the existing `handleReceiptFileChangeLocal`.

- [ ] **Step 1: Read the current `image.ts` in full**

Read `src/utils/image.ts` (31 lines) — the existing `compressImageToDataUrl` reads a `File` via `FileReader`, then draws it to a canvas for downscale/re-encode. There is no existing test for this file (canvas/Image aren't implemented in this repo's jsdom test environment, consistent with why no test exists today) — this task follows that same convention; verification is manual (Step 7), not a unit test.

- [ ] **Step 2: Refactor to share the canvas-resize core between File and data-URL sources**

Replace the full contents of `src/utils/image.ts`:

```typescript
const MAX_DIMENSION = 1000;
const JPEG_QUALITY = 0.7;

function compressDataUrlSource(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Failed to decode image file.'));
    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported.'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.src = dataUrl;
  });
}

// Downscales and re-encodes an image file to a compact base64 JPEG, so receipt
// photos don't bloat IndexedDB storage with full camera-resolution originals.
export function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      compressDataUrlSource(reader.result as string).then(resolve).catch(reject);
    };
    reader.readAsDataURL(file);
  });
}

// Same compression pipeline for sources that already produce a data URL
// directly (Capacitor Camera's DataUrl result type on native), skipping the
// redundant File round-trip the browser file-input path needs.
export function compressDataUrlToDataUrl(dataUrl: string): Promise<string> {
  return compressDataUrlSource(dataUrl);
}
```

This is a pure refactor for the existing `compressImageToDataUrl` — same inputs produce the same outputs, verified in Step 7 alongside the new native path.

- [ ] **Step 3: Read the current receipt UI block in `ExpenseForm.tsx`**

Read `src/components/ExpenseForm.tsx` lines 1–20 (imports) and 140–160 (`handleReceiptFileChangeLocal`) and 440–465 (the receipt form-group JSX) — already captured above; re-read live before editing since line numbers shift as other tasks land.

- [ ] **Step 4: Add the native capture handler**

Add near `handleReceiptFileChangeLocal` (in `src/components/ExpenseForm.tsx`):

```typescript
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { compressImageToDataUrl, compressDataUrlToDataUrl } from '../utils/image';
// ...existing imports...

const handleNativeCameraCapture = async () => {
  setReceiptProcessing(true);
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
    });
    if (photo.dataUrl) {
      const compressed = await compressDataUrlToDataUrl(photo.dataUrl);
      setReceiptImage(compressed);
    }
  } catch {
    // User cancelled the camera/picker — not an error state, leave receiptImage as-is.
  } finally {
    setReceiptProcessing(false);
  }
};
```

`CameraSource.Prompt` shows the OS action sheet letting the user choose "Take Photo" or "Choose from Library" in one control, covering both the `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` cases declared in Task 1.

- [ ] **Step 5: Branch the receipt form-group UI on platform**

Replace the `<input type="file" ...>` block (the `else` branch of `{receiptImage ? (...) : (...)}`) with:

```tsx
) : Capacitor.isNativePlatform() ? (
  <button
    type="button"
    className="secondary-btn"
    style={{ padding: '8px 14px', fontSize: '13px' }}
    onClick={handleNativeCameraCapture}
    disabled={receiptProcessing}
  >
    📷 Take or Choose Photo
  </button>
) : (
  <input
    type="file"
    accept="image/*"
    className="input-field"
    onChange={handleReceiptFileChangeLocal}
    disabled={receiptProcessing}
  />
)}
```

The existing `<input type="file">` branch is preserved unchanged for web — only a new native branch is inserted ahead of it.

- [ ] **Step 6: Install and check types**

Run: `npm run build`
Expected: TypeScript compiles cleanly — no missing-import or type errors from the new `Camera`/`CameraResultType`/`CameraSource` usage.

- [ ] **Step 7: Manual verification (no automated test — matches existing convention for this file)**

On web (`npm run dev`): confirm the file-input receipt picker still works exactly as before (select an image, see the compressed preview, remove it).
On a native build (after `npx cap sync`, run on a device/emulator per the base-shell plan's Task 11 process): confirm tapping "📷 Take or Choose Photo" opens the OS picker, and a captured/chosen photo appears compressed in the preview.

- [ ] **Step 8: Commit**

```bash
git add src/utils/image.ts src/components/ExpenseForm.tsx
git commit -m "feat: native camera capture for receipt photos"
```

---

### Task 3: Native Geolocation plugin for expense geotagging

**Files:**
- Modify: `src/utils/geolocation.ts`
- Modify: `src/utils/geolocation.test.ts`

**Interfaces:**
- Consumes: `Capacitor.isNativePlatform()` from `@capacitor/core`; `Geolocation.requestPermissions()`/`Geolocation.getCurrentPosition()` from `@capacitor/geolocation`.
- Produces: `getCurrentGPSPosition(timeoutMs?: number): Promise<{ lat: number; lng: number } | null>` keeps its exact existing signature and return shape — `captureCurrentExpenseLocation()` and every caller in `ExpenseForm.tsx` need no changes at all.

- [ ] **Step 1: Read the current `geolocation.ts` and its existing test in full**

Read `src/utils/geolocation.ts` (157 lines) and `src/utils/geolocation.test.ts` (31 lines) — already captured above. Note the existing test's pattern: `vi.restoreAllMocks()` in `beforeEach`, direct manipulation of `globalThis.navigator`/`globalThis.fetch`.

- [ ] **Step 2: Write the failing test for the native branch**

Add to `src/utils/geolocation.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reverseGeocode, getCurrentGPSPosition } from './geolocation';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}));

const requestPermissionsMock = vi.fn();
const getCurrentPositionMock = vi.fn();
vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    requestPermissions: (...args: unknown[]) => requestPermissionsMock(...args),
    getCurrentPosition: (...args: unknown[]) => getCurrentPositionMock(...args),
  },
}));

// ...existing describe block for reverseGeocode/getCurrentGPSPosition (web path) stays as-is...

describe('Geolocation Utility - native platform', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    const { Capacitor } = await import('@capacitor/core');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  });

  it('uses the Capacitor Geolocation plugin when running natively', async () => {
    requestPermissionsMock.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    getCurrentPositionMock.mockResolvedValue({
      coords: { latitude: 15.5493879, longitude: 73.7535181 },
    });

    const pos = await getCurrentGPSPosition(4000);

    expect(requestPermissionsMock).toHaveBeenCalled();
    expect(getCurrentPositionMock).toHaveBeenCalledWith(
      expect.objectContaining({ enableHighAccuracy: true, timeout: 4000 })
    );
    expect(pos).toEqual({ lat: 15.549388, lng: 73.753518 });
  });

  it('returns null when native permission is denied', async () => {
    requestPermissionsMock.mockResolvedValue({ location: 'denied', coarseLocation: 'denied' });

    const pos = await getCurrentGPSPosition(4000);

    expect(pos).toBeNull();
    expect(getCurrentPositionMock).not.toHaveBeenCalled();
  });

  it('returns null when the native plugin throws', async () => {
    requestPermissionsMock.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    getCurrentPositionMock.mockRejectedValue(new Error('native GPS error'));

    const pos = await getCurrentGPSPosition(4000);

    expect(pos).toBeNull();
  });
});
```

Note this test file now imports `Capacitor`/`Geolocation` mocks that must resolve even for the *existing* web-path tests above it — since `Capacitor.isNativePlatform` defaults to `false` in the mock, those tests are unaffected.

- [ ] **Step 3: Run tests to verify the new ones fail**

Run: `npx vitest run src/utils/geolocation.test.ts`
Expected: FAIL — `getCurrentGPSPosition` doesn't yet branch on `Capacitor.isNativePlatform()` or call the `Geolocation` plugin.

- [ ] **Step 4: Implement the native branch**

Replace `getCurrentGPSPosition` in `src/utils/geolocation.ts`:

```typescript
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import type { ExpenseLocation } from '../types';

// ...existing geocodeCache...

/**
 * Gets the device's current GPS position. Uses the Capacitor Geolocation
 * plugin on native platforms, browser navigator.geolocation on web.
 * Fails safely with null if unsupported, denied, or timed out.
 */
export async function getCurrentGPSPosition(timeoutMs = 5000): Promise<{ lat: number; lng: number } | null> {
  if (Capacitor.isNativePlatform()) {
    return getCurrentGPSPositionNative(timeoutMs);
  }
  return getCurrentGPSPositionWeb(timeoutMs);
}

async function getCurrentGPSPositionNative(timeoutMs: number): Promise<{ lat: number; lng: number } | null> {
  try {
    const permission = await Geolocation.requestPermissions();
    if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') {
      return null;
    }
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: timeoutMs });
    return {
      lat: Number(position.coords.latitude.toFixed(6)),
      lng: Number(position.coords.longitude.toFixed(6)),
    };
  } catch {
    return null;
  }
}

function getCurrentGPSPositionWeb(timeoutMs: number): Promise<{ lat: number; lng: number } | null> {
  if (typeof window === 'undefined' || !navigator?.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
          });
        }
      },
      () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(null);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 60000, // 1 minute cached position ok
      }
    );
  });
}
```

Everything below `getCurrentGPSPosition` (`reverseGeocode`, `searchPlaces`, `captureCurrentExpenseLocation`) stays exactly as it is today — none of them need to change.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/utils/geolocation.test.ts`
Expected: PASS, including the pre-existing web-path tests (proving the refactor didn't change web behavior).

- [ ] **Step 6: Run the full test suite to confirm no regressions elsewhere**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/utils/geolocation.ts src/utils/geolocation.test.ts
git commit -m "feat: use native Geolocation plugin for expense geotagging"
```

---

### Task 4: On-device verification and sign-off

**Files:**
- None (verification-only task).

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: a `decisions.md` entry recording this sub-project, matching the existing format (see entries #1–#22, and the base-shell plan's own Task 11 entry).

- [ ] **Step 1: Rebuild and sync native projects**

Run: `VITE_BASE_PATH=/ npm run build && npx cap sync`

- [ ] **Step 2: Verify on Android**

Install the app on a device/emulator (rebuild via Codemagic per the base-shell plan, or a local debug build if Android tooling is available).
Checklist:
- [ ] Adding a new expense with geotagging enabled (Settings) prompts for location permission on first use, then attaches a location without the old browser-permission-prompt UI appearing.
- [ ] Tapping "Take or Choose Photo" opens the native camera/picker chooser and a captured photo appears in the preview, compressed.
- [ ] Existing expenses with photos/locations from before this change still render correctly (backward compatible — no data shape changed).

- [ ] **Step 3: Verify on iOS**

Same checklist as Step 2, on a TestFlight/physical-device iOS build.

- [ ] **Step 4: Confirm web is unaffected**

Run: `npm run dev`, open the app in a browser, and confirm the file-input photo picker and browser geolocation prompt behave exactly as before this plan.

- [ ] **Step 5: Record the outcome in `decisions.md`**

Read the end of `decisions.md` first, then append a new numbered entry describing the native Camera/Geolocation swap and the explicit foreground-only, no-background-tracking scope decision (noting the deferred future "live location sharing" feature as the reason it was scoped out).

- [ ] **Step 6: Commit**

```bash
git add decisions.md
git commit -m "docs: record native Camera/Geolocation sub-project completion"
```
