/**
 * ISO 3166-1 alpha-2 country code -> ISO 4217 currency code, for the set of
 * countries travelers from this app are realistically likely to visit.
 * Not exhaustive by design -- an unmapped country simply means no currency
 * suggestion is shown (see enableAutoCurrencyDetection), never a wrong one.
 */
export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  IN: 'INR', US: 'USD', GB: 'GBP', AE: 'AED', SG: 'SGD', TH: 'THB',
  MY: 'MYR', ID: 'IDR', VN: 'VND', PH: 'PHP', LK: 'LKR', NP: 'NPR',
  BT: 'BTN', BD: 'BDT', MV: 'MVR', JP: 'JPY', KR: 'KRW', CN: 'CNY',
  HK: 'HKD', MO: 'MOP', TW: 'TWD', AU: 'AUD', NZ: 'NZD', CA: 'CAD',
  MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', IE: 'EUR', GR: 'EUR', FI: 'EUR', CH: 'CHF',
  SE: 'SEK', NO: 'NOK', DK: 'DKK', IS: 'ISK', PL: 'PLN', CZ: 'CZK',
  HU: 'HUF', RO: 'RON', TR: 'TRY', RU: 'RUB', UA: 'UAH', EG: 'EGP',
  ZA: 'ZAR', KE: 'KES', TZ: 'TZS', MA: 'MAD', NG: 'NGN', GH: 'GHS',
  IL: 'ILS', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
  JO: 'JOD', LB: 'LBP', PK: 'PKR', KZ: 'KZT', GE: 'GEL', AM: 'AMD',
  AZ: 'AZN', UZ: 'UZS', FJ: 'FJD', MU: 'MUR', SC: 'SCR', KH: 'KHR',
  LA: 'LAK', MM: 'MMK', MN: 'MNT',
};

export function currencyForCountryCode(countryCode: string | undefined | null): string | null {
  if (!countryCode) return null;
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] ?? null;
}
