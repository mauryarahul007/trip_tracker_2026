import { useEffect, useState } from 'react';

// Shared factory for a device/display boolean preference (theme-pref in
// App.tsx predates this and stays as-is; this covers newer local-only
// toggles like Data Saver and Compact Ledger View). Not trip data, so it
// stays in localStorage rather than the zustand store. Dispatches a custom
// event (the `storage` event never fires in the tab that made the change)
// so every mounted hook instance updates the moment the toggle flips.
export function createLocalBoolPref(storageKey: string) {
  const changeEvent = `${storageKey}-change`;

  const get = (): boolean => {
    try {
      return localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  };

  const set = (value: boolean): void => {
    try {
      localStorage.setItem(storageKey, value ? '1' : '0');
      window.dispatchEvent(new Event(changeEvent));
    } catch {
      // storage blocked or full -- preference just won't persist
    }
  };

  const useValue = (): boolean => {
    const [enabled, setEnabled] = useState(get);
    useEffect(() => {
      const handler = () => setEnabled(get());
      window.addEventListener(changeEvent, handler);
      window.addEventListener('storage', handler);
      return () => {
        window.removeEventListener(changeEvent, handler);
        window.removeEventListener('storage', handler);
      };
    }, []);
    return enabled;
  };

  return { get, set, useValue };
}
