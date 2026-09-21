export const SIGNUP_ATTRIBUTION_KEY = 'tt-signup-attribution-v1';

export interface SignupAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  capturedAt: number;
}

let memoryStore: string | null = null;

function readParam(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key)?.trim();
  return value ? value.slice(0, 80) : undefined;
}

export function parseSignupAttribution(search: string): SignupAttribution | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const utm_source = readParam(params, 'utm_source') || readParam(params, 'ref');
  const utm_medium = readParam(params, 'utm_medium');
  const utm_campaign = readParam(params, 'utm_campaign');
  if (!utm_source && !utm_medium && !utm_campaign) return null;
  return { utm_source, utm_medium, utm_campaign, capturedAt: Date.now() };
}

function writeStore(value: string | null): void {
  memoryStore = value;
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (value === null) sessionStorage.removeItem(SIGNUP_ATTRIBUTION_KEY);
    else sessionStorage.setItem(SIGNUP_ATTRIBUTION_KEY, value);
  } catch {
    /* private browsing / node */
  }
}

function readStore(): string | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(SIGNUP_ATTRIBUTION_KEY);
      if (raw) return raw;
    }
  } catch {
    /* ignore */
  }
  return memoryStore;
}

export function captureSignupAttribution(search: string): SignupAttribution | null {
  const parsed = parseSignupAttribution(search);
  if (!parsed) return loadSignupAttribution();
  writeStore(JSON.stringify(parsed));
  return parsed;
}

export function loadSignupAttribution(): SignupAttribution | null {
  const raw = readStore();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SignupAttribution;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSignupAttribution(): void {
  writeStore(null);
}
