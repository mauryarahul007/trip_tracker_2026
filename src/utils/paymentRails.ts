import type { Member, MemberPaymentHandles } from '../types';
import { generateUpiUri, isValidUpiId } from './upiLinks';

export type PaymentRailType = 'upi' | 'revolut' | 'venmo' | 'cashapp' | 'paypal' | 'iban';

export interface PaymentRailDef {
  id: PaymentRailType;
  name: string;
  tagline: string;
  emoji: string;
  brandColor: string;
  supportedCurrencies: string[];
}

export interface PaymentRailInfo {
  rail: PaymentRailDef;
  handle: string;
  url: string;
  isDeepLink: boolean;
  copyText?: string;
}

export const PAYMENT_RAILS: Record<PaymentRailType, PaymentRailDef> = {
  upi: {
    id: 'upi',
    name: 'UPI Pay',
    tagline: 'Google Pay, PhonePe, Paytm, CRED',
    emoji: '⚡',
    brandColor: '#2563eb',
    supportedCurrencies: ['INR'],
  },
  revolut: {
    id: 'revolut',
    name: 'Revolut',
    tagline: 'revolut.me instant transfer',
    emoji: '🔵',
    brandColor: '#0075eb',
    supportedCurrencies: ['EUR', 'GBP', 'USD', 'CHF', 'PLN', 'RON', 'HUF'],
  },
  venmo: {
    id: 'venmo',
    name: 'Venmo',
    tagline: 'Instant settlement on Venmo',
    emoji: '✌️',
    brandColor: '#008cff',
    supportedCurrencies: ['USD'],
  },
  cashapp: {
    id: 'cashapp',
    name: 'Cash App',
    tagline: 'Direct $cashtag payment',
    emoji: '💵',
    brandColor: '#00d632',
    supportedCurrencies: ['USD', 'GBP'],
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    tagline: 'paypal.me global link',
    emoji: '🅿️',
    brandColor: '#003087',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'JPY'],
  },
  iban: {
    id: 'iban',
    name: 'Bank / IBAN',
    tagline: 'Copy wire details for bank transfer',
    emoji: '🏦',
    brandColor: '#475569',
    supportedCurrencies: ['EUR', 'GBP', 'USD', 'CHF', 'AUD', 'CAD'],
  },
};

/**
 * Sanitizes input handle (strips @, $, spaces, leading urls)
 */
export function cleanPaymentHandle(rail: PaymentRailType, raw: string): string {
  let val = raw.trim();
  if (rail === 'cashapp' && val.startsWith('$')) {
    val = val.slice(1);
  }
  if ((rail === 'venmo' || rail === 'revolut') && val.startsWith('@')) {
    val = val.slice(1);
  }
  // Strip full URLs if user pasted revolut.me/xyz or paypal.me/xyz
  val = val.replace(/^https?:\/\/(?:www\.)?(?:revolut\.me\/?|paypal\.me\/?|cash\.app\/(?:\$)?|venmo\.com\/?)/i, '');
  val = val.replace(/^\/+/, '');
  return val.trim();
}

/**
 * Builds the launchable URI / web URL for the payment rail
 */
export function buildPaymentLink(options: {
  rail: PaymentRailType;
  handle: string;
  payeeName: string;
  amount: number;
  currency: string;
  note?: string;
}): { url: string; isDeepLink: boolean; copyText?: string } {
  const { rail, handle, payeeName, amount, currency, note = 'Trip Settlement' } = options;
  const clean = cleanPaymentHandle(rail, handle);
  const formattedAmount = amount.toFixed(2);

  switch (rail) {
    case 'upi': {
      return {
        url: generateUpiUri({
          payeeUpiId: clean,
          payeeName,
          amount,
          currency: 'INR',
          note,
        }),
        isDeepLink: true,
      };
    }
    case 'revolut': {
      // revolut.me/{username}?amount={amount}&currency={curr}
      const revolutUrl = `https://revolut.me/${encodeURIComponent(clean)}?amount=${formattedAmount}&currency=${encodeURIComponent(currency.toUpperCase())}`;
      return {
        url: revolutUrl,
        isDeepLink: false,
      };
    }
    case 'venmo': {
      // Venmo mobile deep link with web fallback
      const encodedNote = encodeURIComponent(note);
      const venmoUri = `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(clean)}&amount=${formattedAmount}&note=${encodedNote}`;
      return {
        url: venmoUri,
        isDeepLink: true,
      };
    }
    case 'cashapp': {
      // https://cash.app/$cashtag/10.00
      const cashAppUrl = `https://cash.app/$${encodeURIComponent(clean)}/${formattedAmount}`;
      return {
        url: cashAppUrl,
        isDeepLink: false,
      };
    }
    case 'paypal': {
      // https://paypal.me/username/10.00USD
      const paypalUrl = `https://paypal.me/${encodeURIComponent(clean)}/${formattedAmount}${currency.toUpperCase()}`;
      return {
        url: paypalUrl,
        isDeepLink: false,
      };
    }
    case 'iban': {
      const copyText = formatIbanCopyText({
        payeeName,
        iban: clean,
        amount,
        currency,
        note,
      });
      return {
        url: `copy:${clean}`,
        isDeepLink: false,
        copyText,
      };
    }
  }
}

/**
 * Formats a clean bank wire text payload for copying
 */
export function formatIbanCopyText(details: {
  payeeName: string;
  iban: string;
  amount: number;
  currency: string;
  note?: string;
}): string {
  const { payeeName, iban, amount, currency, note } = details;
  return `Bank Transfer Settlement:
Payee: ${payeeName}
IBAN/Account: ${iban}
Amount: ${amount.toFixed(2)} ${currency}
Reference: ${note || 'Trip Tracker Settlement'}`;
}

export function saveMemberPaymentHandles(memberId: string, handles: MemberPaymentHandles): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const existing = getSavedMemberPaymentHandles(memberId);
      const merged = { ...existing, ...handles };
      localStorage.setItem(`pay_handles_${memberId}`, JSON.stringify(merged));
    } catch {}
  }
}

export function getSavedMemberPaymentHandles(memberId: string): MemberPaymentHandles {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached = localStorage.getItem(`pay_handles_${memberId}`);
      if (cached) return JSON.parse(cached);
    } catch {}
  }
  return {};
}

/**
 * Extracts and returns all configured payment rails for a member
 */
export function getAvailablePaymentRails(options: {
  member: Member;
  amount: number;
  currency?: string;
  note?: string;
}): PaymentRailInfo[] {
  const { member, amount, currency = 'INR', note } = options;
  const upperCurr = currency.toUpperCase();
  const savedHandles = getSavedMemberPaymentHandles(member.id);
  const handles: MemberPaymentHandles = { ...savedHandles, ...(member.paymentHandles || {}) };
  const results: PaymentRailInfo[] = [];

  // UPI support (from member.paymentHandles?.upiId or direct member.upiId)
  const upiId = handles.upiId || member.upiId;
  if (upiId && isValidUpiId(upiId)) {
    const link = buildPaymentLink({
      rail: 'upi',
      handle: upiId,
      payeeName: member.name,
      amount,
      currency: upperCurr,
      note,
    });
    results.push({
      rail: PAYMENT_RAILS.upi,
      handle: upiId,
      url: link.url,
      isDeepLink: link.isDeepLink,
      copyText: link.copyText,
    });
  }

  // Revolut
  if (handles.revolutHandle) {
    const link = buildPaymentLink({
      rail: 'revolut',
      handle: handles.revolutHandle,
      payeeName: member.name,
      amount,
      currency: upperCurr,
      note,
    });
    results.push({
      rail: PAYMENT_RAILS.revolut,
      handle: handles.revolutHandle,
      url: link.url,
      isDeepLink: link.isDeepLink,
      copyText: link.copyText,
    });
  }

  // Venmo
  if (handles.venmoHandle) {
    const link = buildPaymentLink({
      rail: 'venmo',
      handle: handles.venmoHandle,
      payeeName: member.name,
      amount,
      currency: upperCurr,
      note,
    });
    results.push({
      rail: PAYMENT_RAILS.venmo,
      handle: handles.venmoHandle,
      url: link.url,
      isDeepLink: link.isDeepLink,
      copyText: link.copyText,
    });
  }

  // Cash App
  if (handles.cashAppHandle) {
    const link = buildPaymentLink({
      rail: 'cashapp',
      handle: handles.cashAppHandle,
      payeeName: member.name,
      amount,
      currency: upperCurr,
      note,
    });
    results.push({
      rail: PAYMENT_RAILS.cashapp,
      handle: handles.cashAppHandle,
      url: link.url,
      isDeepLink: link.isDeepLink,
      copyText: link.copyText,
    });
  }

  // PayPal
  if (handles.paypalHandle) {
    const link = buildPaymentLink({
      rail: 'paypal',
      handle: handles.paypalHandle,
      payeeName: member.name,
      amount,
      currency: upperCurr,
      note,
    });
    results.push({
      rail: PAYMENT_RAILS.paypal,
      handle: handles.paypalHandle,
      url: link.url,
      isDeepLink: link.isDeepLink,
      copyText: link.copyText,
    });
  }

  // IBAN
  if (handles.iban) {
    const link = buildPaymentLink({
      rail: 'iban',
      handle: handles.iban,
      payeeName: member.name,
      amount,
      currency: upperCurr,
      note,
    });
    results.push({
      rail: PAYMENT_RAILS.iban,
      handle: handles.iban,
      url: link.url,
      isDeepLink: link.isDeepLink,
      copyText: link.copyText,
    });
  }

  // Sort rails: preferred rail matching currency comes first
  return results.sort((a, b) => {
    const aMatch = a.rail.supportedCurrencies.includes(upperCurr) ? 1 : 0;
    const bMatch = b.rail.supportedCurrencies.includes(upperCurr) ? 1 : 0;
    return bMatch - aMatch;
  });
}
