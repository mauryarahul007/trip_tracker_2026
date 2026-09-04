// Speculatively prefetches lazy-loaded modules during browser idle periods
// or user interaction hints (e.g. hovering or touching a trip card).
// Uses requestIdleCallback where available, with a light setTimeout fallback.
export function preloadModule(importer: () => Promise<unknown>): void {
  if (typeof window === 'undefined') return;

  const run = () => {
    importer().catch(() => {
      // Swallowed silently -- a failed prefetch is non-critical,
      // the real import will retry when the user actually navigates.
    });
  };

  if ('requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback(run, { timeout: 2500 });
  } else {
    setTimeout(run, 200);
  }
}
