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

/**
 * Extracts the query string Supabase needs from a deep-link callback URL.
 * Returns null if the URL isn't our registered auth callback.
 */
export function parseNativeAuthCallback(callbackUrl: string): string | null {
  if (!callbackUrl.startsWith(`${NATIVE_AUTH_CALLBACK_PREFIX}?`)) {
    return null;
  }
  return callbackUrl.slice(`${NATIVE_AUTH_CALLBACK_PREFIX}?`.length);
}
