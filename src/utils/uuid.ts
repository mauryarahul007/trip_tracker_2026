/**
 * crypto.randomUUID() only exists in secure contexts (HTTPS or localhost)
 * and on browsers from ~2022+. Production runs on HTTPS, but LAN-IP dev
 * access (http://192.168.x.x) and older Android WebViews are insecure or
 * too old, and calling the missing method throws a raw TypeError with no
 * fallback (see BUG-059/BUG-063). Falls back to crypto.getRandomValues
 * (broadly supported, doesn't need a secure context), then Math.random as
 * a last resort so id generation never crashes the app.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}
