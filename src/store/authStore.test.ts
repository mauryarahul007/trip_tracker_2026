import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));

const { openMock, closeMock, signInWithOAuthMock, exchangeCodeForSessionMock, addListenerMock, onAuthStateChangeMock } = vi.hoisted(() => ({
  openMock: vi.fn(),
  closeMock: vi.fn(),
  signInWithOAuthMock: vi.fn().mockResolvedValue({
    data: { url: 'https://accounts.google.com/o/oauth2/mock' },
    error: null,
  }),
  exchangeCodeForSessionMock: vi.fn().mockResolvedValue({ data: {}, error: null }),
  addListenerMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
}));

vi.mock('@capacitor/browser', () => ({
  Browser: { open: (...args: unknown[]) => openMock(...args), close: (...args: unknown[]) => closeMock(...args) },
}));

vi.mock('@capacitor/app', () => ({
  App: { addListener: (...args: unknown[]) => addListenerMock(...args) },
}));

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: onAuthStateChangeMock,
      signInWithOAuth: signInWithOAuthMock,
      exchangeCodeForSession: exchangeCodeForSessionMock,
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

describe('appUrlOpen listener on native', () => {
  it('registers an appUrlOpen listener when initialized on a native platform', () => {
    useAuthStore.getState().initialize();

    expect(addListenerMock).toHaveBeenCalledWith('appUrlOpen', expect.any(Function));
  });

  it('exchanges the code for a session when the URL matches the callback scheme', async () => {
    const handler = addListenerMock.mock.calls.find(([event]) => event === 'appUrlOpen')?.[1];
    expect(handler).toBeDefined();
    closeMock.mockClear();
    exchangeCodeForSessionMock.mockClear();

    await handler({ url: 'com.triptracker.app://auth/callback?code=abc123' });

    expect(closeMock).toHaveBeenCalled();
    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith('abc123');
  });

  it('ignores a URL that does not match the callback scheme', async () => {
    const handler = addListenerMock.mock.calls.find(([event]) => event === 'appUrlOpen')?.[1];
    expect(handler).toBeDefined();
    closeMock.mockClear();
    exchangeCodeForSessionMock.mockClear();

    await handler({ url: 'https://example.com/some/other/path' });

    expect(closeMock).not.toHaveBeenCalled();
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
  });

  it('sets authError when exchangeCodeForSession fails', async () => {
    const handler = addListenerMock.mock.calls.find(([event]) => event === 'appUrlOpen')?.[1];
    expect(handler).toBeDefined();
    exchangeCodeForSessionMock.mockResolvedValueOnce({
      data: {},
      error: { message: 'exchange failed' },
    });

    await handler({ url: 'com.triptracker.app://auth/callback?code=abc123' });

    expect(useAuthStore.getState().authError).toBe('exchange failed');
  });
});

describe('onAuthStateChange session handling', () => {
  const mockSession = { user: { id: 'user-1', email: 'a@b.com' } } as any;

  it('ignores a null session on a non-SIGNED_OUT event, keeping the existing session', () => {
    useAuthStore.getState().initialize();
    const handler = onAuthStateChangeMock.mock.calls[0]?.[0];
    expect(handler).toBeDefined();

    useAuthStore.setState({ session: mockSession });
    handler('TOKEN_REFRESHED', null);

    expect(useAuthStore.getState().session).toBe(mockSession);
  });

  it('clears the session on an explicit SIGNED_OUT event', () => {
    useAuthStore.getState().initialize();
    const handler = onAuthStateChangeMock.mock.calls[0]?.[0];
    expect(handler).toBeDefined();

    useAuthStore.setState({ session: mockSession });
    handler('SIGNED_OUT', null);

    expect(useAuthStore.getState().session).toBeNull();
  });
});
