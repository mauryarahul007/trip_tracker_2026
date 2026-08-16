import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));

const { openMock, closeMock, signInWithOAuthMock } = vi.hoisted(() => ({
  openMock: vi.fn(),
  closeMock: vi.fn(),
  signInWithOAuthMock: vi.fn().mockResolvedValue({
    data: { url: 'https://accounts.google.com/o/oauth2/mock' },
    error: null,
  }),
}));

vi.mock('@capacitor/browser', () => ({
  Browser: { open: (...args: unknown[]) => openMock(...args), close: (...args: unknown[]) => closeMock(...args) },
}));

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
      signInWithOAuth: signInWithOAuthMock,
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

import { useAuthStore } from './authStore';

beforeEach(() => {
  vi.stubGlobal('window', { location: { origin: 'https://example.com' } });
  openMock.mockClear();
  signInWithOAuthMock.mockClear();
});

describe('signInWithGoogle on native', () => {
  it('requests an OAuth URL with skipBrowserRedirect and opens it via the in-app browser', async () => {
    await useAuthStore.getState().signInWithGoogle('/trips/abc');

    expect(signInWithOAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: 'com.triptracker.app://auth/callback',
          skipBrowserRedirect: true,
        }),
      })
    );
    expect(openMock).toHaveBeenCalledWith({ url: 'https://accounts.google.com/o/oauth2/mock' });
  });
});
