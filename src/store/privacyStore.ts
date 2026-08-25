import { create } from 'zustand';

interface PrivacyState {
  isBlindMode: boolean;
  toggleBlindMode: () => void;
  setBlindMode: (enabled: boolean) => void;
}

const STORAGE_KEY = 'trip-tracker-blind-mode';

export const usePrivacyStore = create<PrivacyState>((set) => ({
  isBlindMode: localStorage.getItem(STORAGE_KEY) === 'true',
  toggleBlindMode: () =>
    set((state) => {
      const next = !state.isBlindMode;
      localStorage.setItem(STORAGE_KEY, String(next));
      return { isBlindMode: next };
    }),
  setBlindMode: (enabled: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
    set({ isBlindMode: enabled });
  },
}));

/**
 * Format currency with optional blind mode masking.
 * When blind mode is enabled, returns e.g. "₹ •••••" or "$ •••••".
 */
export function formatMaskedAmount(
  amount: number | string,
  currencySymbol: string,
  isBlindMode: boolean
): string {
  if (isBlindMode) {
    return currencySymbol ? `${currencySymbol} •••••` : '•••••';
  }
  // Callers pass a number here so toLocaleString can add thousands
  // separators (₹6,850.00, not ₹6850.00) -- a pre-stringified amount
  // (e.g. amount.toFixed(2)) falls through to the plain-concat branch
  // below with no locale formatting at all.
  if (typeof amount === 'number') {
    return `${currencySymbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${currencySymbol}${amount}`;
}
