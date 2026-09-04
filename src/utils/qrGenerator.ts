import QRCode from 'qrcode';

export interface QrCodeOptions {
  size?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

const qrDataUrlCache = new Map<string, string>();
const qrSvgCache = new Map<string, string>();

/**
 * Generate a PNG Data URL for a given string client-side.
 * Uses in-memory caching for instant synchronous-like retrieval on repeat renders.
 */
export async function generateQrCodeDataUrl(
  text: string,
  options: QrCodeOptions = {}
): Promise<string> {
  if (!text) return '';

  const {
    size = 240,
    margin = 2,
    darkColor = '#000000',
    lightColor = '#ffffff',
    errorCorrectionLevel = 'M'
  } = options;

  const cacheKey = `${text}_${size}_${margin}_${darkColor}_${lightColor}_${errorCorrectionLevel}`;
  if (qrDataUrlCache.has(cacheKey)) {
    return qrDataUrlCache.get(cacheKey)!;
  }

  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin,
      color: {
        dark: darkColor,
        light: lightColor
      },
      errorCorrectionLevel
    });
    qrDataUrlCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate client-side QR data URL:', error);
    // Fallback to qrserver if local canvas/rendering fails
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  }
}

/**
 * Generate an SVG string for a given text.
 */
export async function generateQrCodeSvg(
  text: string,
  options: QrCodeOptions = {}
): Promise<string> {
  if (!text) return '';

  const {
    size = 240,
    margin = 2,
    darkColor = '#000000',
    lightColor = '#ffffff',
    errorCorrectionLevel = 'M'
  } = options;

  const cacheKey = `${text}_${size}_${margin}_${darkColor}_${lightColor}_${errorCorrectionLevel}`;
  if (qrSvgCache.has(cacheKey)) {
    return qrSvgCache.get(cacheKey)!;
  }

  try {
    const svg = await QRCode.toString(text, {
      type: 'svg',
      width: size,
      margin,
      color: {
        dark: darkColor,
        light: lightColor
      },
      errorCorrectionLevel
    });
    qrSvgCache.set(cacheKey, svg);
    return svg;
  } catch (error) {
    console.error('Failed to generate client-side QR SVG:', error);
    return '';
  }
}
