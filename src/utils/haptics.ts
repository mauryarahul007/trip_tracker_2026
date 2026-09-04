export type HapticPreference = 'standard' | 'subtle' | 'off';

const HAPTIC_STORAGE_KEY = 'tt_haptic_preference';

/**
 * Get active haptic feedback preference from localStorage.
 * Defaults to 'standard'.
 */
export function getHapticPreference(): HapticPreference {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return 'standard';
  }
  try {
    const val = localStorage.getItem(HAPTIC_STORAGE_KEY);
    if (val === 'subtle' || val === 'off' || val === 'standard') {
      return val;
    }
  } catch {
    // LocalStorage access restricted
  }
  return 'standard';
}

/**
 * Save user haptic feedback preference and trigger a preview vibration.
 */
export function setHapticPreference(pref: HapticPreference): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(HAPTIC_STORAGE_KEY, pref);
  } catch {
    // LocalStorage access restricted
  }
}

/**
 * Utility for providing micro-haptic tactile feedback on web & mobile browsers.
 * Respects user's in-app haptic intensity preference ('standard' | 'subtle' | 'off').
 * Gracefully handles unsupported environments and user permission restrictions.
 */
export function triggerHaptic(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light'
) {
  if (
    typeof window === 'undefined' ||
    !('navigator' in window) ||
    typeof navigator.vibrate !== 'function'
  ) {
    return;
  }

  const pref = getHapticPreference();
  if (pref === 'off') {
    return;
  }

  const scale = pref === 'subtle' ? 0.5 : 1.0;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(Math.max(1, Math.round(8 * scale)));
        break;
      case 'medium':
        navigator.vibrate(Math.max(1, Math.round(16 * scale)));
        break;
      case 'heavy':
        navigator.vibrate(Math.max(1, Math.round(28 * scale)));
        break;
      case 'success':
        navigator.vibrate(pref === 'subtle' ? [5, 20, 8] : [10, 35, 15]);
        break;
      case 'warning':
        navigator.vibrate(pref === 'subtle' ? [12, 30, 12] : [20, 50, 20]);
        break;
    }
  } catch (_err) {
    // Ignore permissions or focus restriction errors silently
  }
}

