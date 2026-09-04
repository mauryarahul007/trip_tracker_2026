import { describe, it, expect, beforeEach, vi } from 'vitest';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: 0,
  } as Storage;
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis as unknown as Window & typeof globalThis;
}

if (typeof globalThis.navigator === 'undefined') {
  (globalThis as unknown as { navigator: unknown }).navigator = {};
}

import {
  getHapticPreference,
  setHapticPreference,
  triggerHaptic,
} from './haptics';

describe('haptics utility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defaults to standard haptic preference', () => {
    expect(getHapticPreference()).toBe('standard');
  });

  it('persists and retrieves user haptic preference', () => {
    setHapticPreference('subtle');
    expect(getHapticPreference()).toBe('subtle');

    setHapticPreference('off');
    expect(getHapticPreference()).toBe('off');

    setHapticPreference('standard');
    expect(getHapticPreference()).toBe('standard');
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('tt_haptic_preference', 'invalid-value');
    expect(getHapticPreference()).toBe('standard');
  });

  it('triggers vibration with appropriate patterns for standard preference', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    setHapticPreference('standard');
    triggerHaptic('light');
    expect(vibrateMock).toHaveBeenCalledWith(8);

    triggerHaptic('medium');
    expect(vibrateMock).toHaveBeenCalledWith(16);

    triggerHaptic('heavy');
    expect(vibrateMock).toHaveBeenCalledWith(28);

    triggerHaptic('success');
    expect(vibrateMock).toHaveBeenCalledWith([10, 35, 15]);
  });

  it('scales down vibration for subtle preference', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    setHapticPreference('subtle');
    triggerHaptic('light');
    expect(vibrateMock).toHaveBeenCalledWith(4);

    triggerHaptic('medium');
    expect(vibrateMock).toHaveBeenCalledWith(8);

    triggerHaptic('success');
    expect(vibrateMock).toHaveBeenCalledWith([5, 20, 8]);
  });

  it('does not vibrate when haptic preference is off', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });

    setHapticPreference('off');
    triggerHaptic('light');
    triggerHaptic('heavy');
    triggerHaptic('success');

    expect(vibrateMock).not.toHaveBeenCalled();
  });
});
