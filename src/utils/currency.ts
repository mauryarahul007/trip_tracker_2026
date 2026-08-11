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
