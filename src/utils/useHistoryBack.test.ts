import { describe, it, expect, beforeEach, vi } from 'vitest';

const listeners: Record<string, ((e: any) => void)[]> = {};
let historyStack: { state: any; url: string }[] = [];

// Mock minimal window and history environment for Node.js test runner
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    location: {
      pathname: '/',
      search: '',
    },
    addEventListener: (event: string, handler: (e: any) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },
    removeEventListener: (event: string, handler: (e: any) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    },
    history: {
      pushState: vi.fn((state: any, _unused: string, url: string) => {
        historyStack.push({ state, url });
      }),
      back: vi.fn(() => {
        historyStack.pop();
        const top = historyStack[historyStack.length - 1];
        const state = top ? top.state : null;
        const event = { state } as PopStateEvent;
        (listeners['popstate'] || []).forEach((h) => h(event));
      }),
      go: vi.fn((delta: number) => {
        for (let i = 0; i < Math.abs(delta); i++) {
          historyStack.pop();
        }
        const top = historyStack[historyStack.length - 1];
        const state = top ? top.state : null;
        const event = { state } as PopStateEvent;
        (listeners['popstate'] || []).forEach((h) => h(event));
      }),
    },
  } as unknown as Window & typeof globalThis;
}

import { useHistoryBack, useHistoryStack } from './useHistoryBack';

describe('useHistoryBack & useHistoryStack', () => {
  beforeEach(() => {
    historyStack = [];
    vi.clearAllMocks();
  });

  it('exports useHistoryBack and useHistoryStack as functions', () => {
    expect(typeof useHistoryBack).toBe('function');
    expect(typeof useHistoryStack).toBe('function');
  });

  it('correctly manages history states when listeners are attached', () => {
    // Verify window.history mock is in place
    window.history.pushState({ navDepth: 1 }, '', '/#nav-1');
    expect(historyStack.length).toBe(1);
    expect(historyStack[0].state).toEqual({ navDepth: 1 });

    window.history.pushState({ navDepth: 2 }, '', '/#nav-2');
    expect(historyStack.length).toBe(2);

    window.history.back();
    expect(historyStack.length).toBe(1);
    expect(historyStack[0].state).toEqual({ navDepth: 1 });
  });
});

