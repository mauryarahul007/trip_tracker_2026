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

if (typeof globalThis.sessionStorage === 'undefined') {
  const sStore = new Map<string, string>();
  globalThis.sessionStorage = {
    getItem: (k: string) => sStore.get(k) ?? null,
    setItem: (k: string, v: string) => sStore.set(k, v),
    removeItem: (k: string) => sStore.delete(k),
    clear: () => sStore.clear(),
    key: (i: number) => Array.from(sStore.keys())[i] ?? null,
    length: 0,
  } as Storage;
}

import {
  bufferToBase64,
  base64ToBuffer,
  isBiometricEnrolled,
  setBiometricEnrolled,
  isSessionUnlocked,
  markSessionUnlocked,
  lockSession,
  removeBiometricCredential,
  isBiometricAvailable,
} from './webAuthn';

describe('webAuthn utility', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('converts buffer to base64 and back accurately', () => {
    const originalBytes = new Uint8Array([1, 2, 3, 4, 100, 200, 255]);
    const base64 = bufferToBase64(originalBytes.buffer);
    expect(typeof base64).toBe('string');
    expect(base64.length).toBeGreaterThan(0);

    const decodedBuffer = base64ToBuffer(base64);
    const decodedBytes = new Uint8Array(decodedBuffer);
    expect(Array.from(decodedBytes)).toEqual(Array.from(originalBytes));
  });

  it('tracks enrollment state per user in localStorage', () => {
    expect(isBiometricEnrolled('user-123')).toBe(false);

    localStorage.setItem(
      'tt_bio_auth_user-123',
      JSON.stringify({
        credentialId: 'test-cred-id',
        enrolledAt: Date.now(),
        enabled: true,
      })
    );
    expect(isBiometricEnrolled('user-123')).toBe(true);

    setBiometricEnrolled('user-123', false);
    expect(isBiometricEnrolled('user-123')).toBe(false);

    setBiometricEnrolled('user-123', true);
    expect(isBiometricEnrolled('user-123')).toBe(true);

    removeBiometricCredential('user-123');
    expect(isBiometricEnrolled('user-123')).toBe(false);
  });

  it('manages tab session unlock state in sessionStorage', () => {
    expect(isSessionUnlocked()).toBe(false);

    markSessionUnlocked();
    expect(isSessionUnlocked()).toBe(true);

    lockSession();
    expect(isSessionUnlocked()).toBe(false);
  });

  it('safely handles missing PublicKeyCredential API', async () => {
    const isAvail = await isBiometricAvailable();
    expect(typeof isAvail).toBe('boolean');
  });
});
