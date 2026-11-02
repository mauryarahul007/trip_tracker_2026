// Wraps a state update in the native View Transitions API when the browser
// supports it, giving screen-to-screen navigation (trip select, tab switch)
// a smooth native crossfade/morph instead of a hard cut. No-ops straight to
// the update on unsupported browsers and when the user prefers less motion
// -- same guard pattern the rest of the app's CSS animations already use.
type ViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
};

export function withViewTransition(
  update: () => void | Promise<void>,
  // View-transition types (Chrome 125+): CSS can target `:root:active-view-transition-type(name)` instead of a
  // data attribute that has to be set and cleared around the call. Ignored where unsupported.
  types?: string[],
): ViewTransition | undefined {
  const doc = document as Document & {
    startViewTransition?: (callback: (() => void | Promise<void>) | { update: () => void | Promise<void>; types: string[] }) => ViewTransition;
  };
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (typeof doc.startViewTransition === 'function' && !prefersReducedMotion) {
    let transition: ViewTransition;
    try {
      transition = types?.length ? doc.startViewTransition({ update, types }) : doc.startViewTransition(update);
    } catch {
      // Browsers that only know the callback form throw on the options object.
      transition = doc.startViewTransition(update);
    }
    // The browser rejects `ready`/`finished` whenever a transition is
    // interrupted by a newer one before it completes -- expected behavior
    // on rapid tab taps or trip switches, not a bug. Left uncaught it's an
    // unhandled promise rejection the app's crash reporter was filing as
    // a real crash ("Transition was skipped" / "...aborted...").
    transition.ready.catch(() => {});
    transition.finished.catch(() => {});
    return transition;
  }
  update();
  return undefined;
}
