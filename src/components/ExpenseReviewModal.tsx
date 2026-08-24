import { useEffect, useRef, useState } from 'react';
import type { Category, Expense, Member, Trip } from '../types';
import { getReceiptSignedUrl } from '../services/tripApi';
import { IconEdit, IconTrash } from './Icons';
import { getCurrencySymbol } from '../utils/currency';

type Props = {
  expense: Expense;
  members: Record<string, Member>;
  categories: Category[];
  trip: Trip | undefined;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function ExpenseReviewModal({ expense, members, categories, trip, canManage, onClose, onEdit, onDelete }: Props) {
  const isSettlement = expense.title.startsWith('Settlement:');
  const currencySymbol = getCurrencySymbol(trip?.baseCurrency || '');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  useEffect(() => {
    setReceiptUrl(null);
    if (!expense.receiptPath) return;
    let cancelled = false;
    getReceiptSignedUrl(expense.receiptPath).then((url) => {
      if (!cancelled) setReceiptUrl(url);
    }).catch(() => {
      // Receipt failed to load (deleted from storage, expired, etc.) — silently skip it.
    });
    return () => { cancelled = true; };
  }, [expense.receiptPath]);

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-review-title"
        className="glass-card fade-in modal-sheet"
        style={{
          maxWidth: '460px',
          background: 'var(--bg-surface)',
          boxShadow: 'var(--glass-shadow)',
          border: '1px solid var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--primary-accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Expense Review
            </span>
            <h3 id="expense-review-title" style={{ fontSize: '22px', marginTop: '4px' }}>{expense.title}</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {canManage && !isSettlement && (
              <button
                className="secondary-btn"
                style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={onEdit}
              >
                <IconEdit size={13} className="icon-sm" /> Edit
              </button>
            )}
            {canManage && (
              <button
                className="secondary-btn"
                style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-danger)', borderColor: 'rgba(184, 69, 46, 0.3)' }}
                onClick={onDelete}
              >
                <IconTrash size={13} className="icon-sm" /> Delete
              </button>
            )}
            <button
              className="secondary-btn"
              style={{ padding: '6px 12px', fontSize: '13px' }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Main amount display */}
          <div style={{
            background: 'rgba(47, 111, 237, 0.05)',
            border: '1.5px dashed rgba(47, 111, 237, 0.25)',
            borderRadius: 'var(--border-radius-md)',
            padding: '16px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Total Expense
            </span>
            <span className="money" style={{ fontSize: '30px', fontWeight: '700', color: 'var(--primary-accent)' }}>
              {currencySymbol} {expense.amount.toFixed(2)}
            </span>
          </div>

          {/* Basic metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px', fontSize: '14px' }}>
            <div className="glass-card" style={{ padding: '12px', boxShadow: 'none', background: 'rgba(15,23,42,0.01)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                Paid By
              </span>
              <strong>{members[expense.paidBy]?.name || 'Unknown Payer'}</strong>
            </div>
            <div className="glass-card" style={{ padding: '12px', boxShadow: 'none', background: 'rgba(15,23,42,0.01)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                Date & Category
              </span>
              <span>{expense.date} • {categories.find(c => c.id === expense.category)?.name || 'Misc'}</span>
            </div>
          </div>

          {/* Location details if geotagged */}
          {expense.location && (
            <div
              className="glass-card"
              style={{
                padding: '12px 14px',
                boxShadow: 'none',
                background: 'rgba(23,182,166,0.06)',
                border: '1px solid rgba(23,182,166,0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#17B6A6', textTransform: 'uppercase', display: 'block', marginBottom: '2px', fontWeight: 600 }}>
                  📍 Geotagged Location
                </span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {expense.location.placeName || `${expense.location.lat.toFixed(4)}, ${expense.location.lng.toFixed(4)}`}
                </span>
              </div>
              <a
                href={`https://www.google.com/maps?q=${expense.location.lat},${expense.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="secondary-btn"
                style={{ padding: '4px 10px', fontSize: '11.5px', color: '#17B6A6', borderColor: 'rgba(23,182,166,0.3)', flexShrink: 0, textDecoration: 'none' }}
              >
                Maps ↗
              </a>
            </div>
          )}

          {/* Receipt image */}
          {receiptUrl && (
            <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={receiptUrl}
                alt="Receipt"
                style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', background: 'rgba(15,23,42,0.02)' }}
              />
            </a>
          )}

          {/* Split details list */}
          <div>
            <h4 style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '10px'
            }}>
              Split Breakdown ({expense.splitMode} split)
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {expense.splitMemberIds.map((memId: string) => {
                const mem = members[memId];
                const share = expense.resolvedShares[memId] || 0;

                // Helper to get split configuration display
                let detailLabel = '';
                if (expense.splitMode === 'custom') {
                  detailLabel = `(Weight: ${expense.splitConfig?.[memId] ?? 1})`;
                } else if (expense.splitMode === 'percentage') {
                  detailLabel = `(${expense.splitConfig?.[memId] ?? 0}%)`;
                } else if (expense.splitMode === 'exact') {
                  detailLabel = `(Exact)`;
                }

                return (
                  <div key={memId} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '14px',
                    padding: '10px 12px',
                    background: 'rgba(15, 23, 42, 0.02)',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <span>
                      {mem?.name || 'Deleted Member'}{' '}
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{detailLabel}</span>
                    </span>
                    <strong className="money" style={{ color: 'var(--text-primary)' }}>
                      {currencySymbol} {share.toFixed(2)}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
