import { describe, it, expect } from 'vitest';
import {
  verifySuperadminCredentials,
  isRecoveryPhoneAuthorized,
  maskPhoneNumber,
  requestPhoneRecoveryOtp,
  verifyPhoneRecoveryOtp,
  SUPERADMIN_EMAIL,
  SUPERADMIN_PASSWORD,
} from './superadminAuth';

describe('superadminAuth', () => {
  it('validates correct superadmin credentials', () => {
    expect(verifySuperadminCredentials(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)).toBe(true);
    expect(verifySuperadminCredentials('superadmin@triptracker.com', SUPERADMIN_PASSWORD)).toBe(true);
    expect(verifySuperadminCredentials('  Superadmin@triptracker.com  ', SUPERADMIN_PASSWORD)).toBe(true);
  });

  it('rejects incorrect superadmin credentials', () => {
    expect(verifySuperadminCredentials('other@email.com', SUPERADMIN_PASSWORD)).toBe(false);
    expect(verifySuperadminCredentials(SUPERADMIN_EMAIL, 'wrongpass')).toBe(false);
    expect(verifySuperadminCredentials(undefined, undefined)).toBe(false);
  });

  it('checks authorized recovery phone numbers', () => {
    expect(isRecoveryPhoneAuthorized('+91 7075762522')).toBe(true);
    expect(isRecoveryPhoneAuthorized('7075762522')).toBe(true);
    expect(isRecoveryPhoneAuthorized('+91 7977337757')).toBe(true);
    expect(isRecoveryPhoneAuthorized('79 7733 7757')).toBe(true);
    expect(isRecoveryPhoneAuthorized('9999999999')).toBe(false);
  });

  it('masks phone numbers appropriately', () => {
    const masked = maskPhoneNumber('+917075762522');
    expect(masked).toContain('22');
    expect(masked).toContain('•••');
  });

  it('dispatches and verifies recovery OTP for authorized phone', () => {
    const phone = '+91 7075762522';
    const req = requestPhoneRecoveryOtp(phone);
    expect(req.success).toBe(true);
    expect(req.simulatedOtp).toBe('849201');

    // Test invalid OTP
    const invalidRes = verifyPhoneRecoveryOtp(phone, '000000');
    expect(invalidRes.success).toBe(false);

    // Test valid OTP
    const validRes = verifyPhoneRecoveryOtp(phone, '849201');
    expect(validRes.success).toBe(true);
  });
});
