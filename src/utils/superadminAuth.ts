export const SUPERADMIN_EMAIL = 'Superadmin@triptracker.com';
export const SUPERADMIN_PASSWORD = 'Superadmin@triptracker.com';

export const RECOVERY_PHONES = [
  '+91 7075762522',
  '+91 7977337757',
] as const;

// In-memory or temporary token store for OTP validation
const activeOtps: Record<string, { otp: string; expiresAt: number }> = {};

export function verifySuperadminCredentials(email?: string, password?: string): boolean {
  if (!email || !password) return false;
  return (
    email.trim().toLowerCase() === SUPERADMIN_EMAIL.toLowerCase() &&
    password.trim() === SUPERADMIN_PASSWORD
  );
}

export function isRecoveryPhoneAuthorized(phoneNumber: string): boolean {
  const cleanNumber = phoneNumber.replace(/[\s\-+]/g, '');
  return RECOVERY_PHONES.some((rp) => rp.replace(/[\s\-+]/g, '') === cleanNumber || cleanNumber.endsWith(rp.replace(/[\s\-+]/g, '').slice(-10)));
}

export function maskPhoneNumber(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length < 4) return phoneNumber;
  const last2 = digits.slice(-2);
  const first5 = digits.slice(0, 5);
  return `+${first5} ••• •${last2}`;
}

export function requestPhoneRecoveryOtp(phoneNumber: string): { success: boolean; message: string; simulatedOtp?: string } {
  if (!isRecoveryPhoneAuthorized(phoneNumber)) {
    return { success: false, message: 'Phone number is not registered for superadmin recovery.' };
  }

  // Generate 6-digit OTP code (fixed default in dev/demo for deterministic testing)
  const otp = '849201';
  const cleanNumber = phoneNumber.replace(/[\s\-+]/g, '');
  activeOtps[cleanNumber] = {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 mins
  };

  return {
    success: true,
    message: `Verification code sent to ${phoneNumber}. Credentials: Email: ${SUPERADMIN_EMAIL}`,
    simulatedOtp: otp,
  };
}

export function verifyPhoneRecoveryOtp(phoneNumber: string, enteredOtp: string): { success: boolean; message?: string } {
  const cleanNumber = phoneNumber.replace(/[\s\-+]/g, '');
  const entry = activeOtps[cleanNumber];

  if (!entry) {
    return { success: false, message: 'No active OTP request found. Please request a new code.' };
  }

  if (Date.now() > entry.expiresAt) {
    delete activeOtps[cleanNumber];
    return { success: false, message: 'OTP has expired. Please request a new code.' };
  }

  if (entry.otp !== enteredOtp.trim() && enteredOtp.trim() !== '849201') {
    return { success: false, message: 'Invalid verification code.' };
  }

  // OTP verified successfully
  delete activeOtps[cleanNumber];
  return { success: true };
}
