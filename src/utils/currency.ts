// ISO 4217 currencies whose minor unit is 0 (no sub-unit / decimal places).
const ZERO_DECIMAL_CODES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

/**
 * Returns how many decimal places a currency's minor unit uses (2 for most,
 * 0 for currencies like JPY/KRW that have no sub-unit). Split math and
 * display formatting should round to this instead of hardcoding 2.
 */
export function getCurrencyDecimals(code: string): number {
  return ZERO_DECIMAL_CODES.has((code || '').toUpperCase()) ? 0 : 2;
}

/**
 * Maps standard ISO currency codes to their corresponding visual symbols.
 * Defaults back to the code itself if no matching symbol is registered.
 */
export function getCurrencySymbol(code: string): string {
  if (!code) return '';
  switch (code.toUpperCase()) {
    case 'INR':
      return '₹';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'JPY':
      return '¥';
    default:
      return code;
  }
}

// Callers pass a number here so toLocaleString can add thousands
// separators (₹6,850.00, not ₹6850.00) -- a pre-stringified amount
// (e.g. amount.toFixed(2)) falls through to the plain-concat branch
// below with no locale formatting at all.
export function formatAmount(amount: number | string, currencySymbol: string): string {
  if (typeof amount === 'number') {
    return `${currencySymbol}${formatMoneyNumber(amount, currencySymbol)}`;
  }
  return `${currencySymbol}${amount}`;
}

/**
 * The number part of a displayed amount: device-locale grouping (1,234.50,
 * or 1,23,450.00 on an Indian locale) and the currency's own decimals (JPY,
 * KRW... show none). Takes either an ISO code or the symbol that
 * getCurrencySymbol returned -- unmapped codes come back as the code itself,
 * and '¥' is only ever produced for JPY. For display only: never feed the
 * result back into maths or an <input value>.
 */
export function formatMoneyNumber(amount: number, currencyOrSymbol = ''): string {
  const decimals = currencyOrSymbol === '¥' ? 0 : getCurrencyDecimals(currencyOrSymbol.trim());
  return (Number.isFinite(amount) ? amount : 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
