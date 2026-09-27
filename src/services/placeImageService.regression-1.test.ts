// Regression: ISSUE-005 — concurrent cover-photo requests for the same place
// each ran the full lookup chain (40+ 404s per session for one misspelled
// destination) because the cache was only written after a lookup finished.
// Found by /qa on 2026-09-27
// Report: .gstack/qa-reports/qa-report-localhost-2026-09-27.md
import { describe, it, expect, vi } from 'vitest';
import { fetchPlaceCoverImage } from './placeImageService';

describe('placeImageService in-flight dedupe', () => {
  it('shares one lookup between simultaneous callers for the same place', async () => {
    const notFound = { ok: false, json: async () => ({}) } as Response;
    globalThis.fetch = vi.fn().mockResolvedValue(notFound);

    const [a, b, c] = await Promise.all([
      fetchPlaceCoverImage('Qazwsxplace'),
      fetchPlaceCoverImage('Qazwsxplace'),
      fetchPlaceCoverImage('Qazwsxplace'),
    ]);
    const callsForFirstLookup = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    expect([a, b, c]).toEqual([null, null, null]);
    // One chain: Wikivoyage, Wikipedia summary, generator search, search API.
    expect(callsForFirstLookup).toBe(4);

    // The miss is cached afterwards: no further requests.
    await fetchPlaceCoverImage('Qazwsxplace');
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
  });
});
