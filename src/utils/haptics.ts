/**
 * Utility for providing micro-haptic tactile feedback on web & mobile browsers.
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

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(8);
        break;
      case 'medium':
        navigator.vibrate(16);
        break;
      case 'heavy':
        navigator.vibrate(28);
        break;
      case 'success':
        navigator.vibrate([10, 35, 15]);
        break;
      case 'warning':
        navigator.vibrate([20, 50, 20]);
        break;
    }
  } catch (_err) {
    // Ignore permissions or focus restriction errors silently
  }
}
