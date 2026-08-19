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
  if (typeof amount === 'number') {
    return `${currencySymbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${currencySymbol}${amount}`;
}
