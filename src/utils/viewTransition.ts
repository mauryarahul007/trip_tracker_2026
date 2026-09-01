// Wraps a state update in the native View Transitions API when the browser
// supports it, giving screen-to-screen navigation (trip select, tab switch)
// a smooth native crossfade/morph instead of a hard cut. No-ops straight to
// the update on unsupported browsers and when the user prefers less motion
// -- same guard pattern the rest of the app's CSS animations already use.
type ViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
};

export function withViewTransition(update: () => void | Promise<void>): void {
  const doc = document as Document & {
    startViewTransition?: (callback: () => void | Promise<void>) => ViewTransition;
  };
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (typeof doc.startViewTransition === 'function' && !prefersReducedMotion) {
    const transition = doc.startViewTransition(update);
    // The browser rejects `ready`/`finished` whenever a transition is
    // interrupted by a newer one before it completes -- expected behavior
    // on rapid tab taps or trip switches, not a bug. Left uncaught it's an
    // unhandled promise rejection the app's crash reporter was filing as
    // a real crash ("Transition was skipped" / "...aborted...").
    transition.ready.catch(() => {});
    transition.finished.catch(() => {});
  } else {
    update();
  }
}
