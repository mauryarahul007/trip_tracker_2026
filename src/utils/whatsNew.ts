import type { FeatureFlagKey } from '../types/admin';

// Device-local (like theme-pref / data-saver) -- a snapshot of which flags
// were resolved-enabled the last time this device looked. Not trip data.
const STORAGE_KEY = 'tt-whats-new-seen-flags';

function readSnapshot(): FeatureFlagKey[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FeatureFlagKey[]) : null;
  } catch {
    return null;
  }
}

// Marks everything currently enabled as "seen" -- call when the user opens
// the What's New hub, so already-announced flags don't show again until
// something new flips on.
export function markAllFlagsSeen(currentlyEnabled: FeatureFlagKey[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentlyEnabled));
  } catch {
    // storage blocked or full -- snapshot just won't persist
  }
}

// Flags enabled for this user now but absent from the last-saved snapshot,
// i.e. flipped on since this device last looked. On a device's first-ever
// check (no snapshot yet) this seeds the snapshot silently and returns
// nothing -- the point is to announce future changes, not retroactively
// flood a new device with every flag that already happens to be on.
export function getNewlyUnlockedFlags(currentlyEnabled: FeatureFlagKey[]): FeatureFlagKey[] {
  const snapshot = readSnapshot();
  if (snapshot === null) {
    markAllFlagsSeen(currentlyEnabled);
    return [];
  }
  const seen = new Set(snapshot);
  return currentlyEnabled.filter((k) => !seen.has(k));
}
