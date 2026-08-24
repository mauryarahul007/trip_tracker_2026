import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPlaceCoverImage } from './placeImageService';

describe('placeImageService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null for empty or invalid query', async () => {
    const result = await fetchPlaceCoverImage('');
    expect(result).toBeNull();
  });

  it('resolves a genuine photo from Wikivoyage before trying Wikipedia', async () => {
    const mockPhotoUrl = 'https://upload.wikimedia.org/wikipedia/commons/manali-mountains.jpg';
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        originalimage: { source: mockPhotoUrl },
        thumbnail: { source: mockPhotoUrl },
      }),
    } as Response);

    const result = await fetchPlaceCoverImage('Manali');
    expect(result).toBe(mockPhotoUrl);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('en.wikivoyage.org'),
      expect.anything()
    );
  });

  // Regression test: Wikivoyage's own lead image for a destination is
  // sometimes a locator map (e.g. real-world "Goa" -> Map-India-Goa01.png)
  // rather than a photo. The map must be rejected and the search must fall
  // through to Wikipedia's direct summary, not return the map.
  it('rejects a map image and falls through to Wikipedia when Wikivoyage leads with a map', async () => {
    const mapUrl = 'https://upload.wikimedia.org/wikipedia/commons/d/db/Map-India-Goa01.png';
    const beachPhotoUrl = 'https://upload.wikimedia.org/wikipedia/commons/f/fc/BeachFun.jpg';
    globalThis.fetch = vi
      .fn()
      // Wikivoyage leads with a map
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ originalimage: { source: mapUrl } }),
      } as Response)
      // Wikipedia direct summary has a real photo
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ originalimage: { source: beachPhotoUrl } }),
      } as Response);

    const result = await fetchPlaceCoverImage('Goa');
    expect(result).toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/BeachFun.jpg/960px-BeachFun.jpg');
  });

  it('rejects flag, coat-of-arms, and seal images from any source', async () => {
    const flagUrl = 'https://upload.wikimedia.org/wikipedia/commons/flag_of_india.png';
    const realPhotoUrl = 'https://upload.wikimedia.org/wikipedia/commons/taj-mahal.jpg';
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ originalimage: { source: flagUrl } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ originalimage: { source: realPhotoUrl } }),
      } as Response);

    const result = await fetchPlaceCoverImage('India');
    expect(result).toBe(realPhotoUrl);
  });

  it('falls back to Wikipedia generator/search API when Wikivoyage and direct summary both fail', async () => {
    const mockPhotoUrl = 'https://upload.wikimedia.org/wikipedia/commons/goa.jpg';
    globalThis.fetch = vi
      .fn()
      // Wikivoyage summary returns 404
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)
      // Direct Wikipedia summary returns 404
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)
      // Generator API returns page with image
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: {
            pages: {
              '123': {
                title: 'Goa',
                original: { source: mockPhotoUrl },
              },
            },
          },
        }),
      } as Response);

    const result = await fetchPlaceCoverImage('Goa Beaches');
    expect(result).toBe(mockPhotoUrl);
  });
});
