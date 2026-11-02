import { describe, it, expect, vi, afterEach } from 'vitest';
import { withViewTransition } from './viewTransition';

function fakeTransition() {
  return { ready: Promise.resolve(), finished: Promise.resolve() };
}

// Tests run in node: stub just the globals the helper reads.
function stubBrowser(startViewTransition?: unknown) {
  vi.stubGlobal('document', { startViewTransition });
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
}

describe('withViewTransition', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('runs the update directly when the browser has no View Transitions API', () => {
    stubBrowser(undefined);
    const update = vi.fn();
    expect(withViewTransition(update, ['tab-next'])).toBeUndefined();
    expect(update).toHaveBeenCalledOnce();
  });

  it('passes transition types through when supported', () => {
    const start = vi.fn(() => fakeTransition());
    stubBrowser(start);
    const update = vi.fn();
    withViewTransition(update, ['tab-next', 'tab-far']);
    expect(start).toHaveBeenCalledWith({ update, types: ['tab-next', 'tab-far'] });
  });

  it('falls back to the callback form when the options object is rejected', () => {
    const start = vi.fn((arg: unknown) => {
      if (typeof arg !== 'function') throw new TypeError('callback expected');
      return fakeTransition();
    });
    stubBrowser(start);
    const update = vi.fn();
    expect(withViewTransition(update, ['tab-prev'])).toBeDefined();
    expect(start).toHaveBeenLastCalledWith(update);
  });

  it('uses the plain callback form when no types are given', () => {
    const start = vi.fn(() => fakeTransition());
    stubBrowser(start);
    const update = vi.fn();
    withViewTransition(update);
    expect(start).toHaveBeenCalledWith(update);
  });
});
