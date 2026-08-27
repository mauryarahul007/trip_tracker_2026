import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

export type ConfirmRequest = {
  message: string;
  title?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  // Optional third way out, distinct from Cancel (stay) and Confirm
  // (proceed) -- e.g. "Discard & Go Back" alongside "Submit & Go Back"
  // and a plain Cancel that means "keep editing". Renders as a plain
  // text link under the two main buttons; omit for the normal 2-choice
  // dialogs everywhere else.
  tertiaryLabel?: string;
  onTertiary?: () => void;
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
  const sheetRef = useRef<HTMLDivElement>(null);

  useFocusTrap(sheetRef, true, false, onCancel);

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
        ref={sheetRef}
        tabIndex={-1}
        role={request.danger ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="glass-card fade-in modal-sheet"
        style={{
          maxWidth: '380px',
          background: 'var(--bg-surface)',
          boxShadow: 'var(--glass-shadow)',
          border: '1px solid var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" style={{ fontSize: '17px', marginBottom: '10px' }}>{request.title || 'Please confirm'}</h3>
        <p id="confirm-dialog-desc" style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>{request.message}</p>
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
              aria-label={armed ? 'Tap again to confirm permanent action' : (request.confirmLabel || 'Confirm')}
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
        {request.tertiaryLabel && request.onTertiary && (
          <button
            type="button"
            onClick={() => {
              request.onTertiary!();
              onCancel();
            }}
            style={{
              display: 'block',
              width: '100%',
              marginTop: '12px',
              padding: '4px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '12.5px',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            {request.tertiaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

