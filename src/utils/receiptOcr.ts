export interface ExtractedReceiptData {
  amount?: number;
  date?: string;
  merchant?: string;
  confidence: number;
}

const COMMON_MERCHANTS: Record<string, string> = {
  starbucks: 'Starbucks',
  mcdonald: "McDonald's",
  kfc: 'KFC',
  subway: 'Subway',
  uber: 'Uber',
  ola: 'Ola',
  grab: 'Grab',
  airbnb: 'Airbnb',
  booking: 'Booking.com',
  hotel: 'Hotel Stay',
  cafe: 'Cafe',
  coffee: 'Coffee',
  restaurant: 'Restaurant',
  supermarket: 'Groceries',
  mart: 'Groceries',
  petrol: 'Fuel / Fueling',
  shell: 'Shell Petrol',
  pharmacy: 'Pharmacy',
  dmart: 'DMart',
  blinkit: 'Blinkit',
  zepto: 'Zepto',
  swiggy: 'Swiggy Food',
  zomato: 'Zomato Food',
};

/**
 * Parses raw text (from clipboard, user paste, or OCR canvas) into structured expense suggestions.
 */
export function parseReceiptText(text: string): ExtractedReceiptData {
  if (!text || typeof text !== 'string') {
    return { confidence: 0 };
  }

  const cleanText = text.replace(/\r\n/g, '\n');
  const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);

  let amount: number | undefined;
  let merchant: string | undefined;
  let date: string | undefined;
  let confidence = 0;

  // 1. Detect Merchant Name
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const [key, name] of Object.entries(COMMON_MERCHANTS)) {
      if (lower.includes(key)) {
        merchant = name;
        confidence += 0.3;
        break;
      }
    }
    if (merchant) break;
  }

  if (!merchant && lines.length > 0) {
    // If top line is short and looks like a store name, use it
    const top = lines[0];
    if (top.length > 2 && top.length < 30 && !/\d{4}/.test(top)) {
      merchant = top;
      confidence += 0.15;
    }
  }

  // 2. Detect Total / Amount
  // Look for total keywords: Total, Grand Total, Subtotal, Net Amount, Amount Due, INR, Rs., $, €, etc.
  const amountRegexes = [
    /(?:total|grand\s*total|net\s*amount|amount\s*due|bal(?:ance)?\s*due|paid|final)[\s:]*([₹$€£]?\s*[\d,]+(?:\.\d{1,2})?)/i,
    /(?:inr|rs\.?|usd|\$|eur|€|gbp|£)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:inr|rs\.?|usd|\$|eur|€|gbp|£)/i,
  ];

  for (const regex of amountRegexes) {
    for (const line of lines) {
      const match = line.match(regex);
      if (match && match[1]) {
        const rawNum = match[1].replace(/[^\d.]/g, '');
        const parsed = parseFloat(rawNum);
        if (!isNaN(parsed) && parsed > 0 && parsed < 10000000) {
          amount = parsed;
          confidence += 0.4;
          break;
        }
      }
    }
    if (amount) break;
  }

  // Fallback: search all standalone decimal numbers and pick highest reasonable total
  if (!amount) {
    const standaloneRegex = /\b(\d{1,6}(?:\.\d{2}))\b/g;
    const candidates: number[] = [];
    for (const line of lines) {
      let match;
      while ((match = standaloneRegex.exec(line)) !== null) {
        const num = parseFloat(match[1]);
        if (!isNaN(num) && num > 0) candidates.push(num);
      }
    }
    if (candidates.length > 0) {
      amount = Math.max(...candidates);
      confidence += 0.2;
    }
  }

  // 3. Detect Date (DD/MM/YYYY, YYYY-MM-DD, DD-Mon-YYYY)
  const dateRegex = /\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match && match[1]) {
      const dateStr = match[1];
      const parsedDate = new Date(dateStr.replace(/[-/.]/g, '/'));
      if (!isNaN(parsedDate.getTime())) {
        const y = parsedDate.getFullYear();
        const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const d = String(parsedDate.getDate()).padStart(2, '0');
        date = `${y}-${m}-${d}`;
        confidence += 0.3;
        break;
      }
    }
  }

  return {
    amount,
    date,
    merchant,
    confidence: Math.min(1.0, confidence),
  };
}
