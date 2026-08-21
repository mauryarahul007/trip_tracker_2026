import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// Self-hosted manifest published alongside the regular web deploy — see
// scripts/package-update.mjs and .github/workflows/deploy-ec2.yml.
const MANIFEST_URL = 'https://trip-tracker.blackmaroon.in/updates/latest.json';

type UpdateManifest = {
  version: string;
  url: string;
  checksum?: string;
};

export async function initLiveUpdates(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // REQUIRED on every launch: skipping this makes the plugin assume the
  // bundle failed to load and roll back to the previous one automatically.
  await CapacitorUpdater.notifyAppReady();

  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const manifest = (await res.json()) as UpdateManifest;
    if (!manifest?.version || !manifest?.url) return;

    const { bundle: current } = await CapacitorUpdater.current();
    if (current.version === manifest.version) return;

    const downloaded = await CapacitorUpdater.download({
      url: manifest.url,
      version: manifest.version,
      checksum: manifest.checksum,
    });
    // Applies next time the app backgrounds/relaunches — no disruptive
    // mid-session reload.
    await CapacitorUpdater.next({ id: downloaded.id });
  } catch {
    // Offline, manifest missing, bad zip, etc. should never block the app.
  }
}
