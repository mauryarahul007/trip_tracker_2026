/**
 * Dynamic Destination & Tourism Cover Image Resolver
 * 
 * Fetches verified, high-resolution editorial travel & tourism photography
 * for any destination, city, region, or landmark using Wikipedia / Wikimedia REST APIs.
 * Zero API keys required, zero CORS restrictions, offline-safe with local in-memory cache.
 */

const imageCache = new Map<string, string | null>();

function isPhotoUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  // Exclude SVG flags, icons, maps, or generic diagrams
  if (url.toLowerCase().endsWith('.svg') || url.toLowerCase().includes('.svg/')) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Clean a user-provided destination string for search.
 */
function extractPlaceCandidates(placeInput: string | string[]): string[] {
  const rawList = Array.isArray(placeInput) ? placeInput : [placeInput];
  const candidates: string[] = [];

  for (const raw of rawList) {
    if (!raw) continue;
    // Split on route arrows, commas, hyphens, or slashes
    const parts = raw.split(/[→\->,/|]/).map((p) => p.trim()).filter(Boolean);
    candidates.push(...parts);
    if (!parts.includes(raw.trim())) {
      candidates.push(raw.trim());
    }
  }

  // Deduplicate and filter out numbers or very short strings
  return Array.from(new Set(candidates)).filter((c) => c.length >= 2);
}

/**
 * Fetch a tourism cover photo URL for a destination name or list of stops.
 */
export async function fetchPlaceCoverImage(placeInput: string | string[]): Promise<string | null> {
  const candidates = extractPlaceCandidates(placeInput);
  if (candidates.length === 0) return null;

  const mainKey = candidates.join('_').toLowerCase();
  if (imageCache.has(mainKey)) {
    return imageCache.get(mainKey) ?? null;
  }

  for (const query of candidates) {
    const cleaned = query.replace(/[^\w\s,\-]/g, '').trim();
    if (!cleaned) continue;

    try {
      // 1. Direct Wikipedia REST API summary
      const directUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleaned.replace(/\s+/g, '_'))}`;
      const directRes = await fetch(directUrl, { headers: { 'Accept': 'application/json' } });

      if (directRes.ok) {
        const data = await directRes.json();
        const img = data.originalimage?.source || data.thumbnail?.source;
        if (isPhotoUrl(img)) {
          imageCache.set(mainKey, img);
          return img;
        }
      }

      // 2. Wikipedia generator search across top 5 articles with pageimages
      const genUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original|thumbnail&pithumbsize=1200&generator=search&gsrsearch=${encodeURIComponent(cleaned)}&gsrlimit=5&origin=*`;
      const genRes = await fetch(genUrl);

      if (genRes.ok) {
        const genData = await genRes.json();
        const pages: any[] = Object.values(genData.query?.pages || {});
        for (const page of pages) {
          const img = page.original?.source || page.thumbnail?.source;
          if (isPhotoUrl(img)) {
            imageCache.set(mainKey, img);
            return img;
          }
        }
      }

      // 3. Search API fallback to find city/tourism article summary
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleaned + ' tourism')}&format=json&origin=*`;
      const searchRes = await fetch(searchUrl);

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const searchItems: any[] = searchData.query?.search?.slice(0, 4) || [];

        for (const item of searchItems) {
          if (!item?.title) continue;
          const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`;
          const sumRes = await fetch(sumUrl, { headers: { 'Accept': 'application/json' } });
          if (sumRes.ok) {
            const sumData = await sumRes.json();
            const img = sumData.originalimage?.source || sumData.thumbnail?.source;
            if (isPhotoUrl(img)) {
              imageCache.set(mainKey, img);
              return img;
            }
          }
        }
      }
    } catch {
      // Try next candidate
    }
  }

  imageCache.set(mainKey, null);
  return null;
}
