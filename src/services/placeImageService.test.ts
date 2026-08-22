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

  it('resolves direct Wikipedia cover image on successful summary fetch', async () => {
    const mockPhotoUrl = 'https://upload.wikimedia.org/wikipedia/commons/manali.jpg';
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        originalimage: { source: mockPhotoUrl },
        thumbnail: { source: mockPhotoUrl },
      }),
    } as Response);

    const result = await fetchPlaceCoverImage('Manali');
    expect(result).toBe(mockPhotoUrl);
  });

  it('falls back to Wikipedia generator/search API when direct summary fails', async () => {
    const mockPhotoUrl = 'https://upload.wikimedia.org/wikipedia/commons/goa.jpg';
    globalThis.fetch = vi
      .fn()
      // Direct summary returns 404
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
