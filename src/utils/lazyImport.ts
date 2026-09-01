// Wraps a lazy()-style dynamic import so a stale/interrupted chunk load
// (the classic case: a browser tab held open across a deploy, still
// pointing at a JS chunk filename that's since been replaced) recovers
// with a single reload instead of crashing the whole app with "Failed to
// fetch dynamically imported module" -- and the partial/duplicate module
// state that failure can leave behind (null hook dispatcher, a thenable
// where a component should be) instead of surfacing as a second, harder
// to diagnose crash a moment later. Reloads at most once per tab session;
// if that doesn't fix it, the error surfaces normally rather than looping.
const RELOAD_FLAG = 'tt-chunk-reload';
const CHUNK_LOAD_FAILURE = /failed to fetch dynamically imported module|error loading dynamically imported module/i;

export function lazyImport<T>(importer: () => Promise<T>): () => Promise<T> {
  return () =>
    importer().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      const alreadyReloaded = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(RELOAD_FLAG);
      if (CHUNK_LOAD_FAILURE.test(message) && typeof window !== 'undefined' && !alreadyReloaded) {
        sessionStorage.setItem(RELOAD_FLAG, '1');
        window.location.reload();
        // The reload is already in flight -- never resolve so React
        // doesn't also try to render an error state before it lands.
        return new Promise<T>(() => {});
      }
      throw error;
    });
}
