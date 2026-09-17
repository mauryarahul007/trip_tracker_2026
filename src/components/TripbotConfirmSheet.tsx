import { createPortal } from 'react-dom';
import type { ParsedQuickExpense } from '../utils/expenseQuickParser';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useHistoryBack } from '../utils/useHistoryBack';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  parsed: ParsedQuickExpense | null;
  isSubmitting?: boolean;
  baseCurrency?: string;
}

export function TripbotConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  parsed,
  isSubmitting,
  baseCurrency = 'INR',
}: Props) {
  useHistoryBack(isOpen, onClose);
  useEscapeKey(isOpen, onClose);

  if (!isOpen || !parsed) return null;

  const amountLabel =
    parsed.amount != null
      ? `${parsed.currency || baseCurrency} ${parsed.amount.toFixed(2)}`
      : 'Amount missing';

  return createPortal(
    <div className="wa-action-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="wa-action-sheet tripbot-confirm-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm tripbot expense"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wa-action-sheet-handle" aria-hidden="true" />
        <h3 className="trip-chat-sheet-title">Add via @tripbot?</h3>
        <p className="trip-chat-sheet-subtitle">Confirm the parsed expense before posting.</p>
        <dl className="tripbot-confirm-fields">
          <div>
            <dt>Title</dt>
            <dd>{parsed.title || 'Quick Expense'}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{amountLabel}</dd>
          </div>
          {parsed.categoryName || parsed.categoryId ? (
            <div>
              <dt>Category</dt>
              <dd>{parsed.categoryName || parsed.categoryId}</dd>
            </div>
          ) : null}
          {parsed.paidByName ? (
            <div>
              <dt>Paid by</dt>
              <dd>{parsed.paidByName}</dd>
            </div>
          ) : null}
          {parsed.date ? (
            <div>
              <dt>Date</dt>
              <dd>{parsed.date}</dd>
            </div>
          ) : null}
        </dl>
        <div className="tripbot-confirm-actions">
          <button type="button" className="wa-action-sheet-cancel-btn" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="button"
            className="gradient-btn tripbot-confirm-btn"
            onClick={onConfirm}
            disabled={isSubmitting || parsed.amount == null || parsed.amount <= 0}
          >
            {isSubmitting ? 'Adding…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
