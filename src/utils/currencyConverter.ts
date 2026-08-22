// Exchange rates relative to 1 USD as baseline (updated regularly, offline fallback)
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 87.25,
  EUR: 0.92,
  GBP: 0.78,
  AED: 3.67,
  THB: 35.8,
  JPY: 154.5,
  SGD: 1.34,
  AUD: 1.52,
  CAD: 1.38,
  CHF: 0.88,
  MYR: 4.65,
  VND: 25400,
  IDR: 15900,
};

export interface ConvertedRate {
  originalAmount: number;
  originalCurrency: string;
  targetCurrency: string;
  convertedAmount: number;
  rate: number;
}

/**
 * Converts an amount from source currency to target currency.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  customRates?: Record<string, number>
): ConvertedRate {
  const rates = { ...DEFAULT_EXCHANGE_RATES, ...(customRates || {}) };
  const fromUpper = (fromCurrency || 'INR').trim().toUpperCase();
  const toUpper = (toCurrency || 'INR').trim().toUpperCase();

  if (fromUpper === toUpper || !amount || isNaN(amount)) {
    return {
      originalAmount: amount || 0,
      originalCurrency: fromUpper,
      targetCurrency: toUpper,
      convertedAmount: amount || 0,
      rate: 1.0,
    };
  }

  const fromRate = rates[fromUpper] ?? 1.0;
  const toRate = rates[toUpper] ?? 1.0;

  // Convert from source -> USD -> target
  const amountInUsd = amount / fromRate;
  const convertedAmount = Math.round(amountInUsd * toRate * 100) / 100;
  const rate = Math.round((toRate / fromRate) * 10000) / 10000;

  return {
    originalAmount: amount,
    originalCurrency: fromUpper,
    targetCurrency: toUpper,
    convertedAmount,
    rate,
  };
}

export const POPULAR_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];
