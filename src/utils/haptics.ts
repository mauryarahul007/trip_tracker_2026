import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// 'important' (enableCalmHaptics): only commitments buzz -- medium/heavy/
// success/warning. The 235 'light' taps (tab switches, opening menus) stay
// silent, so a buzz means something happened.
export type HapticPreference = 'standard' | 'important' | 'subtle' | 'off';

const HAPTIC_STORAGE_KEY = 'tt_haptic_preference';

// What an unset preference means. App.tsx switches it (and native haptics)
// on while enableCalmHaptics is ON; OFF keeps the old 'standard' behavior.
let defaultPreference: HapticPreference = 'standard';
let useNativeHaptics = false;
export function configureHaptics(opts: { calm: boolean }): void {
  defaultPreference = opts.calm ? 'important' : 'standard';
  useNativeHaptics = opts.calm && Capacitor.isNativePlatform();
}

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
    if (val === 'subtle' || val === 'off' || val === 'standard' || val === 'important') {
      return val;
    }
  } catch {
    // LocalStorage access restricted
  }
  return defaultPreference;
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
  if (typeof window === 'undefined') return;

  const pref = getHapticPreference();
  if (pref === 'off' || (pref === 'important' && type === 'light')) {
    return;
  }

  // iOS WebViews have no navigator.vibrate, so native builds go through the
  // Capacitor plugin (the Taptic engine on iPhone).
  if (useNativeHaptics) {
    try {
      if (type === 'success' || type === 'warning') {
        void Haptics.notification({ type: type === 'success' ? NotificationType.Success : NotificationType.Warning });
      } else {
        void Haptics.impact({ style: type === 'heavy' ? ImpactStyle.Heavy : type === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light });
      }
    } catch {
      // Plugin unavailable -- no feedback, never an error.
    }
    return;
  }

  if (!('navigator' in window) || typeof navigator.vibrate !== 'function') {
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
  } catch {
    // Ignore permissions or focus restriction errors silently
  }
}

