const luminanceCache = new Map<string, number | null>();

// 0 (black) to 1 (white). Samples only the top third of the image, since
// that's the region the trip name/meta actually sit over on a stack card
// -- not the bottom, where only the small avatar row lives.
export function getImageLuminance(url: string): Promise<number | null> {
  if (luminanceCache.has(url)) {
    return Promise.resolve(luminanceCache.get(url) ?? null);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no 2d context');

        const cropHeight = img.naturalHeight / 3;
        ctx.drawImage(img, 0, 0, img.naturalWidth, cropHeight, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
          total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        const avg = total / (data.length / 4) / 255;
        luminanceCache.set(url, avg);
        resolve(avg);
      } catch {
        // Canvas read blocked (unexpected CORS response, decode failure) --
        // caller falls back to its existing safe default.
        luminanceCache.set(url, null);
        resolve(null);
      }
    };
    img.onerror = () => {
      luminanceCache.set(url, null);
      resolve(null);
    };
    img.src = url;
  });
}
