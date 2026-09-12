import { useEffect, useState } from 'react';

// One-time "new feature" indicator dot. Shows until the user dismisses it
// (typically by opening the feature it points at), then never again on this
// device -- same pattern as FlightAddExpenseTooltip's STORAGE_KEY dismissal.
function storageKey(featureKey: string): string {
  return `tt-nudge-${featureKey}-v1`;
}

export function useFeatureNudge(featureKey: string): [boolean, () => void] {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(!localStorage.getItem(storageKey(featureKey)));
    } catch {
      setShow(false);
    }
  }, [featureKey]);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(storageKey(featureKey), '1');
    } catch {
      // ignore
    }
  };

  return [show, dismiss];
}
