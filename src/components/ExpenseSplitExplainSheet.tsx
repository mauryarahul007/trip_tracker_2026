import { createPortal } from 'react-dom';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useHistoryBack } from '../utils/useHistoryBack';

export interface SplitShareRow {
  memberId: string;
  name: string;
  amount: number;
  currency: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  shares: SplitShareRow[];
}

export function ExpenseSplitExplainSheet({ isOpen, onClose, title, shares }: Props) {
  useHistoryBack(isOpen, onClose);
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  return createPortal(
    <div className="wa-action-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="wa-action-sheet trip-chat-explain-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Why this split"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wa-action-sheet-handle" aria-hidden="true" />
        <h3 className="trip-chat-sheet-title">Why this split?</h3>
        <p className="trip-chat-sheet-subtitle">{title}</p>
        {shares.length === 0 ? (
          <p className="trip-chat-sheet-empty">No share breakdown available for this expense.</p>
        ) : (
          <ul className="trip-chat-explain-list">
            {shares.map((row) => (
              <li key={row.memberId} className="trip-chat-explain-row">
                <span className="trip-chat-explain-name">{row.name}</span>
                <span className="trip-chat-explain-amount">
                  {row.currency}{' '}
                  {(typeof row.amount === 'number' && Number.isFinite(row.amount)
                    ? row.amount
                    : Number(row.amount) || 0
                  ).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="wa-action-sheet-cancel-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>,
    document.body
  );
}
