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
  it('returns the query string portion of a matching callback URL', () => {
    const url = 'com.triptracker.app://auth/callback?code=abc123&state=xyz';
    expect(parseNativeAuthCallback(url)).toBe('code=abc123&state=xyz');
  });

  it('returns null for a URL that does not match the callback scheme', () => {
    expect(parseNativeAuthCallback('com.triptracker.app://something/else?code=abc123')).toBeNull();
  });

  it('returns null for an unrelated URL', () => {
    expect(parseNativeAuthCallback('https://example.com/?code=abc123')).toBeNull();
  });
});
