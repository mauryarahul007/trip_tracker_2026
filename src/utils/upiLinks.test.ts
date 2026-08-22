import { describe, it, expect } from 'vitest';
import { generateUpiUri, isValidUpiId } from './upiLinks';

describe('upiLinks utility', () => {
  it('validates UPI IDs accurately', () => {
    expect(isValidUpiId('rahul@okhdfcbank')).toBe(true);
    expect(isValidUpiId('9876543210@paytm')).toBe(true);
    expect(isValidUpiId('john.doe@ybl')).toBe(true);
    expect(isValidUpiId('invalid-upi')).toBe(false);
    expect(isValidUpiId('@invalid')).toBe(false);
    expect(isValidUpiId('')).toBe(false);
  });

  it('generates generic UPI intent URL with correct parameters', () => {
    const uri = generateUpiUri({
      payeeUpiId: 'rahul@okhdfcbank',
      payeeName: 'Rahul Maurya',
      amount: 450.5,
      note: 'Goa Trip Settlement',
    });

    expect(uri).toContain('upi://pay?');
    expect(uri).toContain('pa=rahul%40okhdfcbank');
    expect(uri).toContain('pn=Rahul%20Maurya');
    expect(uri).toContain('am=450.50');
    expect(uri).toContain('cu=INR');
    expect(uri).toContain('tn=Goa%20Trip%20Settlement');
  });

  it('generates app-specific Google Pay tez:// intent URL', () => {
    const uri = generateUpiUri(
      {
        payeeUpiId: 'rahul@okhdfcbank',
        payeeName: 'Rahul Maurya',
        amount: 100,
      },
      'gpay'
    );

    expect(uri.startsWith('tez://upi/pay?')).toBe(true);
    expect(uri).toContain('pa=rahul%40okhdfcbank');
  });

  it('generates app-specific PhonePe and Paytm intent URLs', () => {
    const phonepeUri = generateUpiUri(
      {
        payeeUpiId: 'rahul@ybl',
        payeeName: 'Rahul',
        amount: 250,
      },
      'phonepe'
    );
    expect(phonepeUri.startsWith('phonepe://pay?')).toBe(true);

    const paytmUri = generateUpiUri(
      {
        payeeUpiId: 'rahul@paytm',
        payeeName: 'Rahul',
        amount: 250,
      },
      'paytm'
    );
    expect(paytmUri.startsWith('paytmmp://pay?')).toBe(true);
  });
});
