// Wraps a state update in the native View Transitions API when the browser
// supports it, giving screen-to-screen navigation (trip select, tab switch)
// a smooth native crossfade/morph instead of a hard cut. No-ops straight to
// the update on unsupported browsers and when the user prefers less motion
// -- same guard pattern the rest of the app's CSS animations already use.
export function withViewTransition(update: () => void | Promise<void>): void {
  const doc = document as Document & {
    startViewTransition?: (callback: () => void | Promise<void>) => unknown;
  };
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (typeof doc.startViewTransition === 'function' && !prefersReducedMotion) {
    doc.startViewTransition(update);
  } else {
    update();
  }
}
