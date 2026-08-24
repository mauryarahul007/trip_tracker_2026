/**
 * Image Compressor Utility
 * Fast client-side HTML5 Canvas downsampling for photo receipts and travel polaroids.
 * Converts large camera uploads (4-12 MB) down to lightweight WebP/JPEG (~80-140 KB).
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1000,
  maxHeight: 1000,
  quality: 0.75,
  mimeType: 'image/jpeg',
};

export async function compressImageFile(file: File, options?: CompressionOptions): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          // Scale down proportionally
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
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          // Smooth resampling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL(opts.mimeType, opts.quality);
          resolve(compressedDataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
