/** Canonical production origin for shareable join / App Link URLs. */
export const CANONICAL_APP_ORIGIN = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_APP_URL) ||
  'https://trip-tracker.blackmaroon.in'
).replace(/\/$/, '');

function joinBasePath(): string {
  const base =
    typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : '/';
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * Share/QR join links always use the public https host in production so
 * WhatsApp/SMS open verified App Links / Universal Links — never the
 * Capacitor WebView origin.
 */
export function buildCanonicalJoinLink(joinCode: string): string {
  const code = joinCode.trim();
  const base = joinBasePath();
  const isDev =
    typeof import.meta !== 'undefined' &&
    (import.meta.env?.DEV || import.meta.env?.MODE === 'test');
  const origin =
    isDev && typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : CANONICAL_APP_ORIGIN;
  return `${origin}${base}join/${encodeURIComponent(code)}`;
}

/**
 * Extract a join code from an https App Link or optional custom-scheme URL.
 * Returns null when the URL is not a join invite.
 */
export function parseJoinDeepLink(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Optional secondary: com.triptracker.app://join/CODE
  const custom = trimmed.match(/^com\.triptracker\.app:\/\/join\/([^/?#]+)/i);
  if (custom?.[1]) {
    try {
      return decodeURIComponent(custom[1]);
    } catch {
      return custom[1];
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    const match = parsed.pathname.match(/\/join\/([^/]+)\/?$/);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export const JOIN_DEEP_LINK_EVENT = 'tt:join-deep-link';

export function emitJoinDeepLink(code: string): void {
  if (typeof window === 'undefined' || !code) return;
  window.dispatchEvent(new CustomEvent(JOIN_DEEP_LINK_EVENT, { detail: { code } }));
}
