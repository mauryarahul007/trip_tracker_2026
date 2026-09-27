import { createPortal } from 'react-dom';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useHistoryBack } from '../utils/useHistoryBack';
import { useDragToDismiss } from '../hooks/useDragToDismiss';
import { useTripStore } from '../store/tripStore';
import { formatMoneyNumber } from '../utils/currency';

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
  const motionPolish = useTripStore((s) => s.isFeatureEnabled('enableMotionPolish'));
  const { ref: sheetRef, handlers: dragHandlers } = useDragToDismiss<HTMLDivElement>(onClose, { enabled: motionPolish });

  if (!isOpen) return null;

  return createPortal(
    <div className="wa-action-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        ref={sheetRef}
        className="wa-action-sheet-card wa-sheet-enter trip-chat-explain-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Why this split"
        onClick={(e) => e.stopPropagation()}
        {...dragHandlers}
      >
        <div className="wa-action-sheet-handle-wrap" aria-hidden="true">
          <span className="wa-action-sheet-drag-pill" />
        </div>
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
                  {formatMoneyNumber(
                    typeof row.amount === 'number' && Number.isFinite(row.amount) ? row.amount : Number(row.amount) || 0,
                    row.currency,
                  )}
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
