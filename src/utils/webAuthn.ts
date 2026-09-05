/**
 * WebAuthn Biometric Authentication Utility
 *
 * Provides Touch ID, Face ID, Windows Hello, and Android Biometric platform
 * authentication for seamless zero-friction local screen locking and superadmin quick-unlock.
 * Zero external bundle overhead using standard W3C Web Authentication API.
 */

const STORAGE_PREFIX = 'tt_bio_auth_';
const SESSION_UNLOCKED_KEY = 'tt_bio_session_unlocked';

export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Checks if the user device has a platform authenticator (Touch ID, Face ID, Windows Hello, etc.)
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return !!available;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Checks if biometric authentication is configured and active for the user
 */
export function isBiometricEnrolled(userId?: string | null): boolean {
  if (typeof localStorage === 'undefined' || !userId) return false;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.enabled && parsed?.credentialId);
  } catch {
    return false;
  }
}

/**
 * Enables or disables biometric lock for a given user
 */
export function setBiometricEnrolled(userId: string, enabled: boolean): void {
  if (typeof localStorage === 'undefined' || !userId) return;
  try {
    const key = `${STORAGE_PREFIX}${userId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.enabled = enabled;
      localStorage.setItem(key, JSON.stringify(parsed));
    }
  } catch {}
}

/**
 * Registers a new WebAuthn credential on the user's platform authenticator
 */
export async function registerBiometricCredential(
  userId: string,
  userDisplayName?: string | null
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { success: false, error: 'WebAuthn is not supported in this browser.' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Trip Tracker',
          // Omit id or use hostname to bind to current domain
          id: window.location.hostname || undefined,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userDisplayName || 'traveler',
          displayName: userDisplayName || 'Trip Tracker Traveler',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false,
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Registration cancelled or no credential created.' };
    }

    const credentialId = bufferToBase64(credential.rawId);
    const data = {
      credentialId,
      enrolledAt: Date.now(),
      enabled: true,
      userDisplayName: userDisplayName || null,
    };
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(data));
    markSessionUnlocked();

    return { success: true, credentialId };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric registration was cancelled or timed out.' };
    }
    return { success: false, error: err?.message || 'Failed to register biometric credentials.' };
  }
}

/**
 * Verifies biometric credentials using platform authenticator (Face ID / Touch ID / PIN)
 */
export async function verifyBiometricCredential(
  userId?: string | null
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { success: false, error: 'WebAuthn is not supported in this browser.' };
  }

  try {
    let credentialIdBuffer: ArrayBuffer | undefined;
    if (userId) {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.credentialId) {
          credentialIdBuffer = base64ToBuffer(parsed.credentialId);
        }
      }
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credential = (await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname || undefined,
        allowCredentials: credentialIdBuffer
          ? [
              {
                type: 'public-key',
                id: credentialIdBuffer,
              },
            ]
          : undefined,
        userVerification: 'required',
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Biometric verification was cancelled.' };
    }

    markSessionUnlocked();
    return { success: true };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric verification was cancelled or timed out.' };
    }
    return { success: false, error: err?.message || 'Biometric verification failed.' };
  }
}

/**
 * Checks if current browser tab session has been verified and unlocked
 */
export function isSessionUnlocked(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(SESSION_UNLOCKED_KEY) === '1';
}

/**
 * Sets session to unlocked for current browser session
 */
export function markSessionUnlocked(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(SESSION_UNLOCKED_KEY, '1');
}

/**
 * Locks current browser session, prompting biometric unlock again
 */
export function lockSession(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
}

/**
 * Completely removes biometric enrollment data for a user
 */
export function removeBiometricCredential(userId: string): void {
  if (typeof localStorage === 'undefined' || !userId) return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
    lockSession();
  } catch {}
}
