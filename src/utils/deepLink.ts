export interface DeepLink {
  tripId: string | null;
  tab: string | null;
}

export function parseDeepLink(search: string): DeepLink {
  const params = new URLSearchParams(search);
  return { tripId: params.get('trip') || null, tab: params.get('tab') || null };
}

/** Returns `search` with trip/tab set (or removed when null), leaving every other param alone. */
export function withDeepLink(search: string, tripId: string | null, tab: string | null): string {
  const params = new URLSearchParams(search);
  if (tripId) params.set('trip', tripId); else params.delete('trip');
  if (tripId && tab) params.set('tab', tab); else params.delete('tab');
  const out = params.toString();
  return out ? `?${out}` : '';
}
