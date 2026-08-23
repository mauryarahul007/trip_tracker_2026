/**
 * Dynamic Destination & Tourism Cover Image Resolver
 * 
 * Fetches verified, high-resolution editorial travel & tourism photography
 * for any destination, city, region, or landmark using Wikipedia / Wikimedia REST APIs.
 * Zero API keys required, zero CORS restrictions, offline-safe with local in-memory cache.
 */

const imageCache = new Map<string, string | null>();

// Cards display these around 300-450 CSS px wide; 960px covers 2x retina
// with headroom, while staying well under an uncapped original (commons
// originals commonly run 3000-8000px and several MB). Must be one of
// Wikimedia's fixed standard widths -- direct/hotlinked thumb requests for
// any other width are rejected with 400 (API-routed requests get silently
// rounded to the nearest one, but our /thumb/ URLs are direct hotlinks).
// https://www.mediawiki.org/wiki/Common_thumbnail_sizes
const THUMB_WIDTH = 960;

// Wikimedia originals live at .../wikipedia/<project>/<h1>/<h2>/<file>.
// Rewriting to the /thumb/ path asks Wikimedia's own resizer for a
// pre-scaled, re-encoded copy at THUMB_WIDTH -- not a client-side crop of
// the full original, so it stays sharp at that size while shrinking the
// download. Falls through unchanged for URLs that don't match (already a
// thumb, or an unexpected host).
//
// The REST API always appends tracking query params (?utm_source=...), so
// this matches against the parsed pathname only -- matching the raw URL
// string let `[^/]+` swallow the query string into "filename", producing a
// URL with two "?"s that failed to load at all.
const WIKIMEDIA_ORIGINAL_PATH_PATTERN = /^(\/wikipedia\/[^/]+\/)([0-9a-f])\/([0-9a-f]{2})\/([^/]+)$/i;

function toSizedThumbnail(url: string, width: number = THUMB_WIDTH): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== 'upload.wikimedia.org') return url;

  const match = parsed.pathname.match(WIKIMEDIA_ORIGINAL_PATH_PATTERN);
  if (!match) return url;
  const [, prefix, h1, h2, filename] = match;
  return `${parsed.origin}${prefix}thumb/${h1}/${h2}/${filename}/${width}px-${filename}`;
}

// Prefer a sized-down copy of the original (consistent, controlled width)
// over the API's own thumbnail, whose default size varies and is often
// too small for a retina card background.
function pickImage(original?: string, thumbnail?: string): string | null {
  if (original) return toSizedThumbnail(original);
  return thumbnail ?? null;
}

// Filenames Wikipedia/Wikivoyage commonly use for non-photo lead images --
// locator maps, flags, coats of arms, seals, logos, and chart/diagram
// exports all get uploaded as ordinary PNG/JPG, not just SVG, so extension
// filtering alone lets plenty of maps through (e.g. a place's Wikivoyage
// lead image is frequently a "Map-<Country>-<Region>.png").
const NON_PHOTO_FILENAME_PATTERN = /(^|[_\-/])(map|locator|location|flag[_-]of|coat[_-]of[_-]arms|seal[_-]of|emblem|logo|chart|diagram|graph)([_\-.]|$)/i;

function isPhotoUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  const lower = url.toLowerCase();
  // Exclude SVG (icons/flags/diagrams are almost always vector) and any
  // raster image whose filename identifies it as a map/flag/logo/etc.
  if (lower.endsWith('.svg') || lower.includes('.svg/')) return false;
  if (NON_PHOTO_FILENAME_PATTERN.test(decodeURIComponent(url))) return false;
  return true;
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
    const cleaned = query.replace(/[^\w\s,-]/g, '').trim();
    if (!cleaned) continue;

    try {
      // 0. Wikivoyage summary -- a travel-guide wiki, so its lead image is
      // almost always genuine destination photography rather than the
      // infobox map/flag/coat-of-arms Wikipedia articles often lead with.
      // Still runs through isPhotoUrl(), since some Wikivoyage articles
      // (e.g. region overview pages) lead with a locator map too.
      const voyageUrl = `https://en.wikivoyage.org/api/rest_v1/page/summary/${encodeURIComponent(cleaned.replace(/\s+/g, '_'))}`;
      const voyageRes = await fetch(voyageUrl, { headers: { 'Accept': 'application/json' } });

      if (voyageRes.ok) {
        const voyageData = await voyageRes.json();
        const voyageImg = pickImage(voyageData.originalimage?.source, voyageData.thumbnail?.source);
        if (isPhotoUrl(voyageImg)) {
          imageCache.set(mainKey, voyageImg);
          return voyageImg;
        }
      }

      // 1. Direct Wikipedia REST API summary
      const directUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleaned.replace(/\s+/g, '_'))}`;
      const directRes = await fetch(directUrl, { headers: { 'Accept': 'application/json' } });

      if (directRes.ok) {
        const data = await directRes.json();
        const img = pickImage(data.originalimage?.source, data.thumbnail?.source);
        if (isPhotoUrl(img)) {
          imageCache.set(mainKey, img);
          return img;
        }
      }

      // 2. Wikipedia generator search across top 5 articles with pageimages
      const genUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original|thumbnail&pithumbsize=${THUMB_WIDTH}&generator=search&gsrsearch=${encodeURIComponent(cleaned)}&gsrlimit=5&origin=*`;
      const genRes = await fetch(genUrl);

      if (genRes.ok) {
        const genData = await genRes.json();
        const pages: any[] = Object.values(genData.query?.pages || {});
        for (const page of pages) {
          const img = pickImage(page.original?.source, page.thumbnail?.source);
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
            const img = pickImage(sumData.originalimage?.source, sumData.thumbnail?.source);
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
