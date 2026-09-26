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
export const COVER_WIDTH = 960;
export const PEEK_COVER_WIDTH = 500;
const THUMB_WIDTH = COVER_WIDTH;

export function normalizeWikimediaWidth(width: number): number {
  if (width <= 250) return 250;
  if (width <= 500) return 500;
  return 960;
}

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
  const targetWidth = normalizeWikimediaWidth(width);
  const [, prefix, h1, h2, filename] = match;
  return `${parsed.origin}${prefix}thumb/${h1}/${h2}/${filename}/${targetWidth}px-${filename}`;
}

const WIKIMEDIA_THUMB_PX_PATTERN = /\/(\d+)px-([^/]+)$/;

// Peek cards are ~half the front card. Rewriting an already-cached 960px
// Wikimedia thumb to 500px keeps decode cost down without a second fetch.
export function coverImageUrlAtWidth(url: string | null, width: number): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'images.unsplash.com') {
      parsed.searchParams.set('w', String(width));
      return parsed.toString();
    }
    if (parsed.hostname !== 'upload.wikimedia.org') return url;
    const targetWidth = normalizeWikimediaWidth(width);
    if (WIKIMEDIA_THUMB_PX_PATTERN.test(parsed.pathname)) {
      parsed.pathname = parsed.pathname.replace(WIKIMEDIA_THUMB_PX_PATTERN, `/${targetWidth}px-$2`);
      return parsed.toString();
    }
    return toSizedThumbnail(url, targetWidth);
  } catch {
    return url;
  }
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

const TRAVEL_NOISE_WORDS = /\b(bagpacking|backpacking|trip|trips|tour|tours|touring|vacation|vacations|holiday|holidays|expedition|expeditions|getaway|getaways|travel|travels|travelling|traveling|trek|trekking|roadtrip|road\s+trip|adventure|adventures|journey|journeys|diaries|diary|visit|visiting|retreat|offsite|bachelors|honeymoon|explore|exploring|\d{4})\b/gi;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const FALLBACK_TRAVEL_PHOTOS = [
  // 1. Tropical Paradise Beach
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop',
  // 2. Swiss Alps Summit
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1000&auto=format&fit=crop',
  // 3. Kyoto Bamboo Forest
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000&auto=format&fit=crop',
  // 4. Amalfi Coastline
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1000&auto=format&fit=crop',
  // 5. Nordic Aurora Fjords
  'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?q=80&w=1000&auto=format&fit=crop',
  // 6. Tokyo Metropolis
  'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1000&auto=format&fit=crop',
  // 7. Yosemite Glacial Lake
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000&auto=format&fit=crop',
  // 8. Golden Desert Dunes
  'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1000&auto=format&fit=crop',
  // 9. Scenic Road Trip Highway
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1000&auto=format&fit=crop',
  // 10. Tropical Sunset Palms
  'https://images.unsplash.com/photo-1512100356356-de1b84283e18?q=80&w=1000&auto=format&fit=crop',
  // 11. Paris Bridge & Sunset
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1000&auto=format&fit=crop',
  // 12. Misty Pine Ridge
  'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1000&auto=format&fit=crop',
  // 13. Italian Dolomites Peaks
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1000&auto=format&fit=crop',
  // 14. Bali Tropical Terraces
  'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?q=80&w=1000&auto=format&fit=crop',
  // 15. Santorini Sunset Caldera
  'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1000&auto=format&fit=crop',
  // 16. Iceland Emerald Waterfall
  'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?q=80&w=1000&auto=format&fit=crop',
];

export function getFallbackTravelPhoto(seed?: string, width: number = COVER_WIDTH): string {
  if (!seed) {
    const defaultUrl = FALLBACK_TRAVEL_PHOTOS[0];
    return coverImageUrlAtWidth(defaultUrl, width) || defaultUrl;
  }

  const s = seed.toLowerCase().trim();

  let matchedIndex = -1;
  if (/(beach|sea|ocean|coast|island|surf|tropical|goa|bali|maldives|phuket)/i.test(s)) {
    matchedIndex = 0;
  } else if (/(mountain|alps|himalaya|peak|summit|snow|ski|trek|hike|sikkim|manali|ladakh)/i.test(s)) {
    matchedIndex = 1;
  } else if (/(forest|bamboo|nature|jungle|green|camp|trail)/i.test(s)) {
    matchedIndex = 2;
  } else if (/(amalfi|italy|mediterranean|cliff|coastal)/i.test(s)) {
    matchedIndex = 3;
  } else if (/(aurora|fjord|norway|iceland|arctic)/i.test(s)) {
    matchedIndex = 4;
  } else if (/(tokyo|japan|city|metro|neon|night|urban)/i.test(s)) {
    matchedIndex = 5;
  } else if (/(lake|reflection|valley|yosemite|national park)/i.test(s)) {
    matchedIndex = 6;
  } else if (/(desert|dune|safari|dubai|egypt|sand)/i.test(s)) {
    matchedIndex = 7;
  } else if (/(road|drive|highway|car|route)/i.test(s)) {
    matchedIndex = 8;
  } else if (/(sunset|palm|evening)/i.test(s)) {
    matchedIndex = 9;
  } else if (/(paris|europe|france|historic|bridge)/i.test(s)) {
    matchedIndex = 10;
  } else if (/(waterfall|falls)/i.test(s)) {
    matchedIndex = 15;
  }

  const selectedIndex = matchedIndex >= 0 ? matchedIndex : hashString(s) % FALLBACK_TRAVEL_PHOTOS.length;
  const rawUrl = FALLBACK_TRAVEL_PHOTOS[selectedIndex];
  return coverImageUrlAtWidth(rawUrl, width) || rawUrl;
}

/**
 * Clean a user-provided destination string for search.
 */
function extractPlaceCandidates(placeInput: string | string[]): string[] {
  const rawList = Array.isArray(placeInput) ? placeInput : [placeInput];
  const candidates: string[] = [];
  const compounds: string[] = [];

  for (const raw of rawList) {
    if (!raw) continue;
    // Split routes and "Goa or Coorg" into real place names first. The full
    // phrase is searched last so a combined query cannot win over a place.
    const parts = raw
      .split(/\s+\bor\b\s+|\s+\band\b\s+|->|[→>,/|-]/i)
      .map((p) => p.trim())
      .filter(Boolean);
    for (const part of parts) {
      candidates.push(part);
      const stripped = part.replace(TRAVEL_NOISE_WORDS, ' ').replace(/\s+/g, ' ').trim();
      const prepStripped = stripped.replace(/^(to|in|at|around|near|of|from)\s+/i, '').trim();
      if (prepStripped && prepStripped.length >= 2 && prepStripped !== part) {
        candidates.push(prepStripped);
      }
    }
    const whole = raw.trim();
    if (whole && !parts.includes(whole)) {
      compounds.push(whole);
    }
  }

  candidates.push(...compounds);

  // Deduplicate and filter out numbers or very short strings
  return Array.from(new Set(candidates)).filter((c) => c.length >= 2 && !/^\d+$/.test(c));
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
