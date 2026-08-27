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
    return `${currencySymbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${currencySymbol}${amount}`;
}
