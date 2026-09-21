import { useRef, useState } from 'react';
import type { Transfer } from '../utils/settlement';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useEscapeKey } from '../utils/useEscapeKey';
import { triggerHaptic } from '../utils/haptics';

type Props = {
  tripName: string;
  currencySymbol: string;
  transfers: Transfer[];
  isFullySettled: boolean;
  onGoToBalances: () => void;
  onLockTrip: () => void;
  onOpenWrapped?: () => void;
  onClose: () => void;
};

export function TripCloseoutModal({
  tripName,
  currencySymbol,
  transfers,
  isFullySettled,
  onGoToBalances,
  onLockTrip,
  onOpenWrapped,
  onClose,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [locked, setLocked] = useState(false);
  useFocusTrap(sheetRef, true, false, onClose);
  useEscapeKey(true, onClose);

  const outstanding = transfers.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="closeout-title"
        className="glass-card fade-in modal-sheet"
        style={{ maxWidth: '400px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="closeout-title" style={{ fontSize: '17px', marginBottom: '8px' }}>
          {locked ? 'Trip locked' : `Close out ${tripName}`}
        </h3>

        {!locked ? (
          <>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {isFullySettled
                ? 'Everyone is settled. Lock the trip so nobody adds more expenses.'
                : `${currencySymbol}${outstanding.toLocaleString(undefined, { maximumFractionDigits: 2 })} still outstanding across ${transfers.length} transfer${transfers.length === 1 ? '' : 's'}.`}
            </p>

            {!isFullySettled && (
              <ul style={{ margin: '0 0 16px', paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {transfers.slice(0, 6).map((t) => (
                  <li key={`${t.fromMemberId}-${t.toMemberId}`}>
                    {t.fromLabel} → {t.toLabel} {currencySymbol}{t.amount.toFixed(2)}
                  </li>
                ))}
              </ul>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!isFullySettled && (
                <button
                  type="button"
                  className="gradient-btn"
                  onClick={() => {
                    triggerHaptic('light');
                    onGoToBalances();
                    onClose();
                  }}
                >
                  Review & settle
                </button>
              )}
              <button
                type="button"
                className={isFullySettled ? 'gradient-btn' : 'secondary-btn'}
                onClick={() => {
                  triggerHaptic('medium');
                  onLockTrip();
                  if (onOpenWrapped) {
                    onClose();
                    onOpenWrapped();
                    return;
                  }
                  setLocked(true);
                }}
              >
                {isFullySettled ? 'Lock trip' : 'Lock anyway'}
              </button>
              <button type="button" className="secondary-btn" onClick={onClose}>
                Not now
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              This trip is closed. Reopen it from Settings if you need to add something later.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {onOpenWrapped && (
                <button
                  type="button"
                  className="gradient-btn"
                  onClick={() => {
                    onClose();
                    onOpenWrapped();
                  }}
                >
                  See your trip recap
                </button>
              )}
              <button type="button" className="secondary-btn" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
