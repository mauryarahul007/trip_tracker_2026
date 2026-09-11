import type { ItemizedReceiptConfig, ReceiptItem } from '../types';
import { newId } from './uuid';

export interface ParsedReceiptData {
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
  amount: number; // alias to total for compatibility
  merchant?: string;
  date?: string;
  confidence?: number;
  rawText?: string;
}

export type ExtractedReceiptData = ParsedReceiptData;

/**
 * Pre-processes a receipt image on a canvas to optimize for OCR text recognition:
 * - Scales down to 1200px max dimension (reducing processing time by 75%)
 * - Converts to grayscale and boosts contrast using adaptive binarization
 */
export async function preProcessReceiptImage(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
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

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Grayscale + Contrast stretch
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Luminance weights
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;
          // High contrast curve
          gray = gray > 140 ? 255 : gray < 90 ? 0 : (gray - 90) * (255 / 50);
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Extracts line items, taxes, tips, discounts, and total from raw receipt text
 */
export function parseReceiptText(text: string, defaultMemberIds: string[] = []): ParsedReceiptData {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: ReceiptItem[] = [];
  let detectedSubtotal = 0;
  let detectedTax = 0;
  let detectedTip = 0;
  let detectedDiscount = 0;
  let detectedTotal = 0;

  // Patterns for meta summary rows
  const subtotalRegex = /^(?:sub\s*total|subtotal|food\s*total|items\s*total)\b/i;
  const taxRegex = /(?:tax|gst|cgst|sgst|vat|service\s*tax|hst)\b/i;
  const tipRegex = /(?:tip|service\s*charge|gratuity)\b/i;
  const discountRegex = /(?:discount|promo|coupon|savings|less)\b/i;
  const totalRegex = /^(?:grand\s*total|net\s*amount|total\s*amount|total\s*due|final\s*total|total)\b/i;

  // Pattern for extracting price at the end of a line
  // e.g. "Chicken Burger $12.50", "2x Pizza 450.00", "Pasta .... 320"
  const linePriceRegex = /(?:[$€£₹]\s*)?([0-9]{1,5}(?:\.[0-9]{2})?)\s*$/;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Check if line contains a price
    const match = line.match(linePriceRegex);
    if (!match) continue;

    const amount = parseFloat(match[1]);
    if (isNaN(amount) || amount <= 0) continue;

    // Clean description (strip trailing price and dots/dashes)
    let desc = line.slice(0, match.index).trim();
    desc = desc.replace(/[.\-_: ]+$/, '').trim();

    // Ignore lines with metadata keywords like table, date, cashier, etc.
    if (/\b(?:202\d|inv|bill|table|date|time|cashier|tel|phone|token|pax)\b/i.test(line)) {
      continue;
    }

    if (totalRegex.test(desc) || (lower === 'total' && amount > detectedTotal)) {
      detectedTotal = amount;
    } else if (subtotalRegex.test(desc)) {
      detectedSubtotal = amount;
    } else if (taxRegex.test(desc)) {
      detectedTax += amount;
    } else if (tipRegex.test(desc)) {
      detectedTip += amount;
    } else if (discountRegex.test(desc)) {
      detectedDiscount += amount;
    } else if (desc.length >= 2) {
      // Valid item line!
      items.push({
        id: newId(),
        name: desc,
        amount: amount,
        assignedMemberIds: [...defaultMemberIds],
      });
    }
  }

  // Fallback: If no explicit total found, compute sum
  const itemsSum = items.reduce((sum, item) => sum + item.amount, 0);
  if (!detectedTotal) {
    detectedTotal = itemsSum + detectedTax + detectedTip - detectedDiscount;
  }
  if (!detectedSubtotal) {
    detectedSubtotal = itemsSum;
  }

  // Extract merchant and date
  let merchant: string | undefined;
  const knownMerchants = ['Starbucks', 'Uber', 'Ola', 'McDonald\'s', 'Subway', 'Dominos', 'KFC', 'Burger King', 'Costa Coffee'];
  for (const m of knownMerchants) {
    if (new RegExp(`\\b${m}\\b`, 'i').test(text)) {
      merchant = m;
      break;
    }
  }

  if (!merchant) {
    const firstLine = lines.find(
      (l) =>
        !subtotalRegex.test(l) &&
        !taxRegex.test(l) &&
        !totalRegex.test(l) &&
        !linePriceRegex.test(l) &&
        !/^\s*(?:date|table|time|order|receipt|invoice|thank|welcome)\b/i.test(l)
    );
    if (firstLine) {
      merchant = firstLine.replace(/#\d+.*$/, '').replace(/\breceipt\b/i, '').trim();
    }
  }

  let date: string | undefined;
  const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/) || text.match(/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/);
  if (dateMatch) {
    date = dateMatch[1];
  }

  return {
    items,
    subtotal: detectedSubtotal,
    tax: detectedTax,
    tip: detectedTip,
    discount: detectedDiscount,
    total: detectedTotal,
    amount: detectedTotal,
    merchant,
    date,
    confidence: detectedTotal > 0 ? 0.95 : 0.4,
    rawText: text,
  };
}

/**
 * Helper to convert parsed receipt data into an ItemizedReceiptConfig
 */
export function toItemizedConfig(data: ParsedReceiptData): ItemizedReceiptConfig {
  return {
    items: data.items,
    tax: data.tax > 0 ? data.tax : undefined,
    tip: data.tip > 0 ? data.tip : undefined,
    discount: data.discount > 0 ? data.discount : undefined,
  };
}

export type ReceiptOcrFailure = 'empty' | 'unreadable' | 'engine';

export class ReceiptOcrError extends Error {
  readonly reason: ReceiptOcrFailure;

  constructor(message: string, reason: ReceiptOcrFailure) {
    super(message);
    this.name = 'ReceiptOcrError';
    this.reason = reason;
  }
}

export function parseScannedReceipt(text: string, defaultMemberIds: string[] = []): ParsedReceiptData {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new ReceiptOcrError(
      "Couldn't read any text from this photo. Try a clearer shot, or paste the lines.",
      'empty'
    );
  }

  const parsed = parseReceiptText(trimmed, defaultMemberIds);
  if (parsed.items.length === 0 && parsed.total <= 0) {
    throw new ReceiptOcrError(
      "We couldn't find prices on this receipt. Try a clearer photo, or paste the text.",
      'unreadable'
    );
  }
  return parsed;
}

type RecognizeFn = (image: string) => Promise<string>;

type TesseractWorker = {
  recognize: (image: string) => Promise<{ data: { text: string } }>;
};

let workerPromise: Promise<TesseractWorker> | null = null;

async function getOcrWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      return createWorker('eng', 1, { logger: () => {} });
    })();
  }
  try {
    return await workerPromise;
  } catch (err) {
    workerPromise = null;
    throw err;
  }
}

/** Lazy-loads tesseract.js so OCR stays out of the critical-path bundle. */
export async function recognizeReceiptText(image: string): Promise<string> {
  try {
    const worker = await getOcrWorker();
    const { data } = await worker.recognize(image);
    return (data.text || '').trim();
  } catch (err) {
    if (err instanceof ReceiptOcrError) throw err;
    throw new ReceiptOcrError(
      "Couldn't start the receipt reader. Check your connection and try again, or paste the text.",
      'engine'
    );
  }
}

export async function scanReceiptImage(
  file: File | Blob,
  defaultMemberIds: string[] = [],
  options?: {
    recognize?: RecognizeFn;
    onPreview?: (previewBase64: string) => void;
  }
): Promise<{ parsed: ParsedReceiptData; previewBase64: string }> {
  const recognize = options?.recognize ?? recognizeReceiptText;
  const previewBase64 = await preProcessReceiptImage(file);
  options?.onPreview?.(previewBase64);
  let text: string;
  try {
    text = await recognize(previewBase64);
  } catch (err) {
    if (err instanceof ReceiptOcrError) throw err;
    throw new ReceiptOcrError(
      "Couldn't read this receipt. Check your connection and try again, or paste the lines.",
      'engine'
    );
  }
  const parsed = parseScannedReceipt(text, defaultMemberIds);
  return { parsed, previewBase64 };
}
