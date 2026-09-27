// enableDestinationAutocomplete: destination suggestions and "did you mean".
// Offline first (the curated gazetteer + the traveler's own past
// destinations, fuzzy-matched), then Photon (komoot) restricted to real
// places -- cities, states, countries -- so restaurants and streets never show.
import { COUNTRY_CURRENCY, GAZETTEER } from '../utils/placeGazetteer';

export type PlaceSuggestion = {
  name: string;
  /** "Kerala, India" -- shown under the name, never saved. */
  detail: string;
  countryCode: string;
  source: 'local' | 'online';
};

const PHOTON_URL =
  'https://photon.komoot.io/api/?limit=6&lang=en&layer=city&layer=state&layer=country&layer=district&layer=county&q=';

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Edit distance counting a swapped pair of letters as one edit ("Swtizerland"). */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

// How many typos a word of this length may contain and still count as a match.
const tolerance = (len: number) => (len <= 4 ? 1 : len <= 8 ? 2 : 3);

/** Offline suggestions: prefix matches (while typing) and close misspellings. */
export function localSuggestions(query: string, pastDestinations: string[] = [], limit = 5): PlaceSuggestion[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const pool: PlaceSuggestion[] = [
    ...GAZETTEER.map(([name, detail, countryCode]) => ({ name, detail, countryCode, source: 'local' as const })),
    ...pastDestinations.map((name) => ({ name, detail: 'Used before', countryCode: '', source: 'local' as const })),
  ];
  const scored: { s: PlaceSuggestion; score: number }[] = [];
  const seen = new Set<string>();
  for (const s of pool) {
    const n = normalize(s.name);
    if (!n || seen.has(n)) continue;
    let score: number | null = null;
    if (n === q) score = 0;
    else if (n.startsWith(q)) score = 0.5;
    else {
      const dist = editDistance(q, n);
      if (dist <= tolerance(q.length)) score = dist;
      // Still typing: compare against the same-length start of the name.
      else if (q.length >= 3 && n.length > q.length && editDistance(q, n.slice(0, q.length)) <= 1) score = 1.5;
    }
    if (score !== null) {
      seen.add(n);
      scored.push({ s, score });
    }
  }
  return scored.sort((a, b) => a.score - b.score || a.s.name.length - b.s.name.length).slice(0, limit).map((x) => x.s);
}

const onlineCache = new Map<string, PlaceSuggestion[]>();

/** Online suggestions from Photon. Empty (never throws) when offline or on error. */
export async function onlineSuggestions(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const q = normalize(query);
  if (q.length < 3) return [];
  const cached = onlineCache.get(q);
  if (cached) return cached;
  try {
    const res = await fetch(PHOTON_URL + encodeURIComponent(q), { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: { properties?: { name?: string; state?: string; country?: string; countrycode?: string } }[];
    };
    const seen = new Set<string>();
    const out: PlaceSuggestion[] = [];
    for (const f of data.features ?? []) {
      const p = f.properties ?? {};
      if (!p.name) continue;
      const detail = [p.state, p.country].filter((x) => x && x !== p.name).join(', ');
      const key = `${normalize(p.name)}|${detail}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: p.name, detail, countryCode: (p.countrycode ?? '').toUpperCase(), source: 'online' });
    }
    onlineCache.set(q, out);
    return out;
  } catch {
    return [];
  }
}

/** Local first, then online, one entry per place name + country. */
export function mergeSuggestions(local: PlaceSuggestion[], online: PlaceSuggestion[], limit = 6): PlaceSuggestion[] {
  const seen = new Set<string>();
  return [...local, ...online]
    .filter((s) => {
      const key = `${normalize(s.name)}|${s.countryCode}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/** Splits "Goa, Gokarna & Hampi" into its places (same separators the map uses). */
export function splitDestination(text: string): string[] {
  return text.split(/,|&|\/|→|->|\band\b/i).map((p) => p.trim()).filter(Boolean);
}

/**
 * A likely fix for the first misspelled place in the destination, or null.
 * Only offered when the typed word is a few typos away from a known place
 * and doesn't already match one -- never for "Goa Beach" vs "Goa".
 */
export type PlaceFix = { typed: string; suggestion: PlaceSuggestion };

/** Every misspelled place in the destination, in the order typed. */
export function findPlaceFixes(destination: string, candidates: PlaceSuggestion[]): PlaceFix[] {
  const fixes: PlaceFix[] = [];
  for (const part of splitDestination(destination)) {
    const p = normalize(part);
    if (p.length < 3) continue;
    const pool = [...localSuggestions(part), ...candidates];
    if (pool.some((c) => normalize(c.name) === p)) continue;
    const best = pool
      .map((c) => ({ c, dist: editDistance(p, normalize(c.name)) }))
      .filter((x) => x.dist > 0 && x.dist <= tolerance(p.length))
      .sort((a, b) => a.dist - b.dist)[0];
    if (best) fixes.push({ typed: part, suggestion: best.c });
  }
  return fixes;
}

/** The first misspelled place, or null (see findPlaceFixes for all of them). */
export function didYouMean(destination: string, candidates: PlaceSuggestion[]): PlaceFix | null {
  return findPlaceFixes(destination, candidates)[0] ?? null;
}

/** Applies several fixes at once, each replacing only its own place. */
export function applyPlaceFixes(destination: string, fixes: PlaceFix[]): string {
  return fixes.reduce((text, f) => replacePlace(text, f.typed, f.suggestion.name), destination);
}

/** Replaces one place inside the destination text, keeping the rest. */
export function replacePlace(destination: string, typed: string, replacement: string): string {
  const i = destination.toLowerCase().indexOf(typed.toLowerCase());
  return i < 0 ? replacement : destination.slice(0, i) + replacement + destination.slice(i + typed.length);
}

export function currencyForCountry(countryCode: string): string | null {
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? null;
}
