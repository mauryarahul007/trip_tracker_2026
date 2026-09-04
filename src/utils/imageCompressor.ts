/**
 * Image Compressor Utility
 * Fast client-side HTML5 Canvas downsampling for photo receipts and travel polaroids.
 * Converts large smartphone camera uploads (up to 25 MB) down to lightweight WebP/JPEG (~80-140 KB).
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
}

export const MAX_COMPRESS_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB ceiling for modern 48MP/108MP phone cameras

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.75,
  mimeType: 'image/jpeg',
};

export async function compressImageFile(file: File, options?: CompressionOptions): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (file.size > MAX_COMPRESS_FILE_SIZE_BYTES) {
    throw new Error('Image file is too large. Maximum size is 25MB.');
  }

  return new Promise((resolve, reject) => {
    // Prefer URL.createObjectURL for 10x faster memory performance without large base64 allocations
    let objectUrl: string | null = null;
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      try {
        objectUrl = URL.createObjectURL(file);
      } catch {
        objectUrl = null;
      }
    }

    const cleanUp = () => {
      if (objectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(objectUrl);
      }
    };

    const processImage = (imgSrc: string) => {
      const img = new Image();
      img.onload = () => {
        cleanUp();
        try {
          let width = img.width;
          let height = img.height;

          // Scale down proportionally if larger than maximum dimension
          if (width > opts.maxWidth || height > opts.maxHeight) {
            if (width > height) {
              height = Math.round((height * opts.maxWidth) / width);
              width = opts.maxWidth;
            } else {
              width = Math.round((width * opts.maxHeight) / height);
              height = opts.maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(imgSrc);
            return;
          }

          // Smooth resampling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Try preferred mime type, fallback to jpeg if unsupported
          let compressedDataUrl: string;
          try {
            compressedDataUrl = canvas.toDataURL(opts.mimeType, opts.quality);
          } catch {
            compressedDataUrl = canvas.toDataURL('image/jpeg', opts.quality);
          }
          resolve(compressedDataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        cleanUp();
        reject(new Error('Failed to load image for compression'));
      };

      img.src = imgSrc;
    };

    if (objectUrl) {
      processImage(objectUrl);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        processImage(e.target?.result as string);
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    }
  });
}
