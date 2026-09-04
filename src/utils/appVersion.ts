import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

// Apple-style Version/Build split: WEB_APP_VERSION is a stable marketing
// version, bumped manually via `npm run release:major|minor|patch` (see
// scripts/bump-version.mjs) -- not on every commit. The build number next
// to it is the commit count (__BUILD_NUMBER__, injected by vite.config.ts),
// so individual builds stay traceable without the marketing version moving
// every time. Native (Android/iOS) mirrors this via CapacitorApp.getInfo()
// (version/build), kept in sync with package.json + the CI build number by
// scripts/sync-native-version.mjs.
export const WEB_APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

export async function getAppVersion(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await CapacitorApp.getInfo();
      return `${info.version} (${info.build})`;
    } catch {
      // fall through to the web build identifiers below
    }
  }
  return `${__APP_VERSION__} (${__BUILD_NUMBER__})`;
}
