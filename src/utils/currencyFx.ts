import type { TripFxConfig } from '../types';

export interface ExchangeRatesData {
  base: string;
  date: string;
  timestamp: number;
  rates: Record<string, number>;
}

// Fallback rates against USD (1 USD = X Currency)
const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 86.8,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  THB: 34.5,
  JPY: 154.2,
  SGD: 1.34,
  MYR: 4.45,
  IDR: 16200,
  AUD: 1.55,
  CAD: 1.41,
  CHF: 0.89,
  VND: 25400,
  KRW: 1390,
  NZD: 1.72,
  LKR: 295,
  NPR: 139,
  PHP: 58.5,
  TRY: 35.2,
};

const FX_STORAGE_KEY_PREFIX = 'trip_tracker_fx_rates_';

/**
 * Fetches live exchange rates with a 24-hour offline cache
 */
export async function fetchExchangeRates(baseCurrency: string = 'INR'): Promise<ExchangeRatesData> {
  const base = baseCurrency.toUpperCase();
  const cacheKey = `${FX_STORAGE_KEY_PREFIX}${base}`;

  // 1. Check local cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const data: ExchangeRatesData = JSON.parse(cached);
      // If cached within the last 24 hours, use it
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        return data;
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  // 2. Fetch live rates if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const res = await fetch(`https://api.frankfurter.app/latest?from=${base}`);
      if (res.ok) {
        const json = await res.json();
        const data: ExchangeRatesData = {
          base: json.base,
          date: json.date,
          timestamp: Date.now(),
          rates: { ...json.rates, [base]: 1.0 },
        };
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {
          // LocalStorage may fail in private mode
        }
        return data;
      }
    } catch {
      // Fall through to fallback
    }
  }

  // 3. Fallback: Synthesize rates from static USD baseline
  const baseToUsdRate = FALLBACK_USD_RATES[base] || (base === 'INR' ? 86.8 : 1.0);
  const synthesizedRates: Record<string, number> = {};

  for (const [curr, rateAgainstUsd] of Object.entries(FALLBACK_USD_RATES)) {
    synthesizedRates[curr] = Number((rateAgainstUsd / baseToUsdRate).toFixed(4));
  }
  synthesizedRates[base] = 1.0;

  return {
    base,
    date: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
    rates: synthesizedRates,
  };
}

export interface ConversionResult {
  convertedAmount: number;
  rate: number;
  isCustomRate: boolean;
  formula: string;
}

/**
 * Converts an amount from one currency to another with support for trip rate freezes and markup
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
  fxConfig?: TripFxConfig
): ConversionResult {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to || amount === 0) {
    return {
      convertedAmount: amount,
      rate: 1.0,
      isCustomRate: false,
      formula: `1 ${from} = 1 ${to}`,
    };
  }

  // 1. Check custom trip fixed rate override
  const customKey = `${from}_${to}`;
  const reverseKey = `${to}_${from}`;

  if (fxConfig?.customRates?.[from]) {
    const rate = fxConfig.customRates[from];
    let converted = amount * rate;
    if (fxConfig.markupPercent) {
      converted *= 1 + fxConfig.markupPercent / 100;
    }
    return {
      convertedAmount: Number(converted.toFixed(2)),
      rate,
      isCustomRate: true,
      formula: `1 ${from} = ${rate.toFixed(4)} ${to} (Custom Lock)`,
    };
  }

  if (fxConfig?.customRates?.[customKey]) {
    const rate = fxConfig.customRates[customKey];
    let converted = amount * rate;
    if (fxConfig.markupPercent) {
      converted *= 1 + fxConfig.markupPercent / 100;
    }
    return {
      convertedAmount: Number(converted.toFixed(2)),
      rate,
      isCustomRate: true,
      formula: `1 ${from} = ${rate.toFixed(4)} ${to} (Custom Lock)`,
    };
  }

  if (fxConfig?.customRates?.[reverseKey]) {
    const rate = 1 / fxConfig.customRates[reverseKey];
    let converted = amount * rate;
    if (fxConfig.markupPercent) {
      converted *= 1 + fxConfig.markupPercent / 100;
    }
    return {
      convertedAmount: Number(converted.toFixed(2)),
      rate,
      isCustomRate: true,
      formula: `1 ${from} = ${rate.toFixed(4)} ${to} (Custom Lock)`,
    };
  }

  // 2. Use live/cached rates
  // Rate gives how much 1 BASE is worth in CURRENCY.
  // If base is 'to', then 1 'to' = rates[from] 'from', so 1 'from' = 1 / rates[from] 'to'
  let rate = 1.0;
  if (rates[from] && rates[from] > 0) {
    rate = 1 / rates[from];
  } else if (rates[to] && rates[to] > 0) {
    rate = rates[to];
  } else {
    // Cross-rate fallback via USD
    const fromUsd = FALLBACK_USD_RATES[from] || 1.0;
    const toUsd = FALLBACK_USD_RATES[to] || 1.0;
    rate = toUsd / fromUsd;
  }

  let converted = amount * rate;
  if (fxConfig?.markupPercent) {
    converted *= 1 + fxConfig.markupPercent / 100;
  }

  return {
    convertedAmount: Number(converted.toFixed(2)),
    rate,
    isCustomRate: false,
    formula: `1 ${from} ≈ ${rate.toFixed(4)} ${to}`,
  };
}
