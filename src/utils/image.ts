import { compressImageFile, MAX_COMPRESS_FILE_SIZE_BYTES } from './imageCompressor';

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.75;

function compressDataUrlSource(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Failed to decode image file.'));
    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported.'));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.src = dataUrl;
  });
}

export const MAX_RECEIPT_FILE_SIZE_BYTES = MAX_COMPRESS_FILE_SIZE_BYTES; // 25MB limit for high-res camera captures
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// Downscales and re-encodes an image file to a compact base64 JPEG/WebP, so receipt
// photos don't bloat IndexedDB storage with full camera-resolution originals.
export function compressImageToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
    return Promise.reject(new Error('Image file is too large. Maximum size is 25MB.'));
  }
  if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
    return Promise.reject(new Error('Only image files (JPEG, PNG, WebP) are allowed.'));
  }

  return compressImageFile(file, {
    maxWidth: MAX_DIMENSION,
    maxHeight: MAX_DIMENSION,
    quality: JPEG_QUALITY,
    mimeType: 'image/jpeg',
  });
}

// Same compression pipeline for sources that already produce a data URL
// directly (Capacitor Camera's DataUrl result type on native), skipping the
// redundant File round-trip the browser file-input path needs.
export function compressDataUrlToDataUrl(dataUrl: string): Promise<string> {
  return compressDataUrlSource(dataUrl);
}
