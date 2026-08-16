// NOTE: com.triptracker.app://auth/callback must be added to
// Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs
// or native sign-in will fail with a redirect_uri_mismatch error.
const NATIVE_AUTH_CALLBACK_PREFIX = 'com.triptracker.app://auth/callback';

/**
 * Native has no stable https origin to redirect back to, so it always
 * targets the app's registered custom URL scheme instead of origin+path.
 */
export function buildOAuthRedirectUrl(
  isNative: boolean,
  origin: string,
  redirectPath: string = '/'
): string {
  if (isNative) {
    return NATIVE_AUTH_CALLBACK_PREFIX;
  }
  return `${origin}${redirectPath}`;
}

export function parseNativeAuthCallback(callbackUrl: string): { type: 'code'; codeQuery: string } | { type: 'token'; accessToken: string; refreshToken: string } | null {
  if (!callbackUrl.startsWith('com.triptracker.app')) {
    return null;
  }

  // 1. Check for query code (?code=xxx or &code=xxx)
  if (callbackUrl.includes('?')) {
    const queryString = callbackUrl.split('?')[1]?.split('#')[0] || '';
    if (queryString.includes('code=')) {
      return { type: 'code', codeQuery: `?${queryString}` };
    }
  }

  // 2. Check for hash fragment (#access_token=xxx&refresh_token=yyy)
  if (callbackUrl.includes('#')) {
    const hashString = callbackUrl.split('#')[1] || '';
    const params = new URLSearchParams(hashString);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      return { type: 'token', accessToken, refreshToken };
    }
  }

  return null;
}

