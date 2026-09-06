import { useState } from 'react';

export type TableDensity = 'comfortable' | 'compact';

// Shared by the Trips and Users tables (both .ops-manifest) so the toggle
// looks and persists the same way in either place.
export function useTableDensity(storageKey: string) {
  const [density, setDensity] = useState<TableDensity>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === 'compact' ? 'compact' : 'comfortable';
    } catch {
      return 'comfortable';
    }
  });

  const toggle = () => {
    setDensity((prev) => {
      const next: TableDensity = prev === 'comfortable' ? 'compact' : 'comfortable';
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // localStorage unavailable (private mode, etc.) — density just won't persist.
      }
      return next;
    });
  };

  return { density, toggle };
}
