import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPlaceCoverImage, coverImageUrlAtWidth, getFallbackTravelPhoto } from './placeImageService';

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

  it('searches each place in "Goa or Coorg" before the full phrase', async () => {
    const goaPhoto = 'https://upload.wikimedia.org/wikipedia/commons/goa-beach.jpg';
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ originalimage: { source: goaPhoto } }),
    } as Response);

    const result = await fetchPlaceCoverImage('Goa or Coorg');
    expect(result).toBe(goaPhoto);
    const firstUrl = String(vi.mocked(globalThis.fetch).mock.calls[0][0]).toLowerCase();
    expect(firstUrl).toContain('goa');
    expect(firstUrl).not.toContain('coorg');
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

describe('coverImageUrlAtWidth', () => {
  it('rewrites a Wikimedia original to a sized thumb', () => {
    const original = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Goa_beach.jpg';
    expect(coverImageUrlAtWidth(original, 500)).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Goa_beach.jpg/500px-Goa_beach.jpg'
    );
  });

  it('rewrites an already-sized Wikimedia thumb to a smaller width', () => {
    const thumb = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Goa_beach.jpg/960px-Goa_beach.jpg';
    expect(coverImageUrlAtWidth(thumb, 500)).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Goa_beach.jpg/500px-Goa_beach.jpg'
    );
  });

  it('leaves non-Wikimedia URLs unchanged', () => {
    const url = 'https://cdn.example.com/cover.jpg';
    expect(coverImageUrlAtWidth(url, 480)).toBe(url);
  });

  it('returns null for a missing url', () => {
    expect(coverImageUrlAtWidth(null, 480)).toBeNull();
  });

  it('adjusts width parameter on Unsplash URLs', () => {
    const unsplashUrl = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop';
    expect(coverImageUrlAtWidth(unsplashUrl, 480)).toContain('w=480');
  });
});

describe('getFallbackTravelPhoto', () => {
  it('returns a valid fallback photo URL even without a seed', () => {
    const url = getFallbackTravelPhoto();
    expect(url).toBeTruthy();
    expect(url).toContain('images.unsplash.com');
  });

  it('deterministically returns the same photo for the same seed', () => {
    const url1 = getFallbackTravelPhoto('Test 60');
    const url2 = getFallbackTravelPhoto('Test 60');
    expect(url1).toBe(url2);
  });

  it('matches keywords for mountains or beach', () => {
    const beachUrl = getFallbackTravelPhoto('Goa Coast Party');
    expect(beachUrl).toContain('photo-1507525428034'); // Tropical beach

    const mountainUrl = getFallbackTravelPhoto('Himalaya Trek');
    expect(mountainUrl).toContain('photo-1464822759023'); // Swiss alps
  });
});
