import { describe, it, expect } from 'vitest';
import { buildOAuthRedirectUrl, parseNativeAuthCallback } from './nativeAuth';

describe('buildOAuthRedirectUrl', () => {
  it('returns the custom URL scheme callback for native platforms, ignoring origin/path', () => {
    expect(buildOAuthRedirectUrl(true, 'https://ignored.example', '/trips/abc')).toBe(
      'com.triptracker.app://auth/callback'
    );
  });

  it('returns origin + redirectPath for web', () => {
    expect(buildOAuthRedirectUrl(false, 'https://triptracker.example', '/trips/abc')).toBe(
      'https://triptracker.example/trips/abc'
    );
  });

  it('defaults redirectPath to / on web when omitted', () => {
    expect(buildOAuthRedirectUrl(false, 'https://triptracker.example', undefined)).toBe(
      'https://triptracker.example/'
    );
  });
});

describe('parseNativeAuthCallback', () => {
  it('returns code object when given authorization code in callback URL', () => {
    const url = 'com.triptracker.app://auth/callback?code=abc123&state=xyz';
    expect(parseNativeAuthCallback(url)).toEqual({
      type: 'code',
      codeQuery: '?code=abc123&state=xyz',
    });
  });

  it('returns token object when given hash fragment with access_token and refresh_token', () => {
    const url = 'com.triptracker.app://auth/callback#access_token=token123&refresh_token=refresh456';
    expect(parseNativeAuthCallback(url)).toEqual({
      type: 'token',
      accessToken: 'token123',
      refreshToken: 'refresh456',
    });
  });

  it('returns null for an unrelated URL or missing credentials', () => {
    expect(parseNativeAuthCallback('https://example.com/?code=abc123')).toBeNull();
    expect(parseNativeAuthCallback('com.triptracker.app://something/else')).toBeNull();
  });
});
