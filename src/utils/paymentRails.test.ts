import { describe, it, expect } from 'vitest';
import {
  cleanPaymentHandle,
  buildPaymentLink,
  getAvailablePaymentRails,
  formatIbanCopyText,
} from './paymentRails';
import type { Member } from '../types';

describe('paymentRails', () => {
  describe('cleanPaymentHandle', () => {
    it('strips leading symbols and urls', () => {
      expect(cleanPaymentHandle('cashapp', '$alice')).toBe('alice');
      expect(cleanPaymentHandle('venmo', '@bob')).toBe('bob');
      expect(cleanPaymentHandle('revolut', 'https://revolut.me/charlie')).toBe('charlie');
      expect(cleanPaymentHandle('paypal', 'https://paypal.me/dan')).toBe('dan');
      expect(cleanPaymentHandle('cashapp', 'https://cash.app/$eve')).toBe('eve');
    });
  });

  describe('buildPaymentLink', () => {
    it('generates valid Revolut URL with amount and currency', () => {
      const link = buildPaymentLink({
        rail: 'revolut',
        handle: 'alex_travel',
        payeeName: 'Alex',
        amount: 45.5,
        currency: 'EUR',
      });
      expect(link.url).toBe('https://revolut.me/alex_travel?amount=45.50&currency=EUR');
      expect(link.isDeepLink).toBe(false);
    });

    it('generates valid Venmo deep link with encoded note', () => {
      const link = buildPaymentLink({
        rail: 'venmo',
        handle: 'alex-doe',
        payeeName: 'Alex',
        amount: 25.0,
        currency: 'USD',
        note: 'Dinner split',
      });
      expect(link.url).toContain('venmo://paycharge?txn=pay&recipients=alex-doe&amount=25.00&note=Dinner%20split');
      expect(link.isDeepLink).toBe(true);
    });

    it('generates Cash App link', () => {
      const link = buildPaymentLink({
        rail: 'cashapp',
        handle: '$alexdoe',
        payeeName: 'Alex',
        amount: 15.0,
        currency: 'USD',
      });
      expect(link.url).toBe('https://cash.app/$alexdoe/15.00');
    });

    it('generates PayPal me link with currency suffix', () => {
      const link = buildPaymentLink({
        rail: 'paypal',
        handle: 'alexdoe',
        payeeName: 'Alex',
        amount: 60.0,
        currency: 'GBP',
      });
      expect(link.url).toBe('https://paypal.me/alexdoe/60.00GBP');
    });

    it('formats IBAN copy text', () => {
      const text = formatIbanCopyText({
        payeeName: 'Alex Smith',
        iban: 'GB29NWBK60161331926819',
        amount: 100,
        currency: 'EUR',
        note: 'Hotel split',
      });
      expect(text).toContain('Payee: Alex Smith');
      expect(text).toContain('IBAN/Account: GB29NWBK60161331926819');
      expect(text).toContain('Amount: 100.00 EUR');
      expect(text).toContain('Reference: Hotel split');
    });
  });

  describe('getAvailablePaymentRails', () => {
    const member: Member = {
      id: 'm1',
      name: 'Alex',
      upiId: 'alex@okaxis',
      paymentHandles: {
        revolutHandle: 'alex_revo',
        venmoHandle: 'alex_venmo',
        cashAppHandle: '$alex_cash',
        iban: 'FR7630006000011234567890189',
      },
    };

    it('extracts all rails and prioritizes matching currency', () => {
      const railsEur = getAvailablePaymentRails({
        member,
        amount: 50,
        currency: 'EUR',
      });

      expect(railsEur.length).toBe(5); // upi, revolut, venmo, cashapp, iban
      // Revolut supports EUR so it should be prioritized ahead of USD-only rails
      expect(railsEur[0].rail.id).toBe('revolut');
    });

    it('prioritizes Venmo/CashApp when currency is USD', () => {
      const railsUsd = getAvailablePaymentRails({
        member,
        amount: 50,
        currency: 'USD',
      });

      const firstIds = [railsUsd[0].rail.id, railsUsd[1].rail.id];
      expect(firstIds).toContain('venmo');
    });

    it('prioritizes UPI when currency is INR', () => {
      const railsInr = getAvailablePaymentRails({
        member,
        amount: 50,
        currency: 'INR',
      });
      expect(railsInr[0].rail.id).toBe('upi');
    });
  });
});
