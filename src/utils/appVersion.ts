import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

// Native (Android/iOS): read the real installed app version/build, already
// kept in sync with package.json + the CI build number by
// scripts/sync-native-version.mjs. Web: __APP_VERSION__/__BUILD_SHA__ are
// injected at build time (see vite.config.ts) — the commit SHA means this
// changes on every real deploy with no manual version bump required.
export const WEB_APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.87.0';

export async function getAppVersion(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await CapacitorApp.getInfo();
      return `${info.version} (${info.build})`;
    } catch {
      // fall through to the web build identifiers below
    }
  }
  return `${__APP_VERSION__} (${__BUILD_SHA__})`;
}
