import { useEffect, useRef, useState } from 'react';

export type ConfirmRequest = {
  message: string;
  title?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
};

type Props = {
  request: ConfirmRequest;
  onCancel: () => void;
};

// Destructive confirms (delete trip, delete member, clear database...) need
// deliberate friction — a tap can't undo them. First tap arms the seal,
// a second tap within the window presses it closed. A timed press-and-hold
// was tried here first, but a normal click is a single instantaneous
// down+up — it can never satisfy a hold, so the button read as broken.
// Two discrete taps work with any input method (mouse, touch, keyboard).
const ARM_MS = 3000;

export function ConfirmDialog({ request, onCancel }: Props) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  const handleConfirm = () => {
    request.onConfirm();
    onCancel();
  };

  const handleDangerClick = () => {
    if (armed) {
      clearTimer();
      setArmed(false);
      handleConfirm();
      return;
    }
    setArmed(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setArmed(false);
    }, ARM_MS);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
    >
      <div
        className="glass-card fade-in modal-sheet"
        style={{
          maxWidth: '380px',
          background: 'var(--bg-surface)',
          boxShadow: 'var(--glass-shadow)',
          border: '1px solid var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>{request.title || 'Please confirm'}</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>{request.message}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ flex: 1 }}
            onClick={onCancel}
          >
            Cancel
          </button>
          {request.danger ? (
            <button
              type="button"
              className={`gradient-btn wax-seal-btn${armed ? ' sealing' : ''}`}
              style={{ flex: 1, background: 'var(--color-danger)' }}
              onClick={handleDangerClick}
            >
              <span className="seal-fill" aria-hidden="true" />
              <span className="seal-label">{armed ? 'Tap again to confirm' : (request.confirmLabel || 'Confirm')}</span>
            </button>
          ) : (
            <button
              type="button"
              className="gradient-btn"
              style={{ flex: 1 }}
              onClick={handleConfirm}
            >
              {request.confirmLabel || 'Confirm'}
            </button>
          )}
        </div>
        {request.danger && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
            {armed ? 'Tap once more to seal it — this can\'t be undone.' : 'Tap once to arm, tap again to confirm.'}
          </p>
        )}
      </div>
    </div>
  );
}
