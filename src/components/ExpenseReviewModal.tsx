import { useRef, useState, useEffect } from 'react';
import type { Category, Expense, Member, Trip } from '../types';
import { getReceiptSignedUrl } from '../services/tripApi';
import { IconEdit, IconTrash, IconCopy, IconAlertCircle, IconClose, IconRefresh, IconCheck } from './Icons';
import { getCurrencySymbol, formatMoneyNumber } from '../utils/currency';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { isRefund } from '../utils/refunds';
import { SettingsToggleRow } from './common/SettingsSwitch';


type Props = {
  expense: Expense;
  members: Record<string, Member>;
  categories: Category[];
  trip: Trip | undefined;
  canManage: boolean;
  currentUserId?: string | null;
  isTripAdmin?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onFlagDispute?: () => void;
  onResolveDispute?: () => void;
  myMemberId?: string | null;
  onConfirmSettlement?: () => void;
  settlementConfirmationEnabled?: boolean;
  onApproveExpense?: () => void;
  /** enableExpenseRefunds: set to show Record refund; refunds are this expense's recorded refunds, refundable what is left. */
  onRecordRefund?: (amount: number) => void;
  refunds?: Expense[];
  refundable?: number;
  /** enableExpenseExclusion: set to show the "Count in trip totals" toggle. */
  onToggleExcludeFromTotals?: (exclude: boolean) => void;
};

export function ExpenseReviewModal({ expense, members, categories, trip, canManage, currentUserId, isTripAdmin, onClose, onEdit, onDelete, onDuplicate, onFlagDispute, onResolveDispute, myMemberId, onConfirmSettlement, settlementConfirmationEnabled, onApproveExpense, onRecordRefund, refunds = [], refundable = 0, onToggleExcludeFromTotals }: Props) {
  const isSettlement = expense.title.startsWith('Settlement:') || isRefund(expense);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundText, setRefundText] = useState('');
  const refundAmount = Number(refundText);
  const refundValid = refundAmount > 0 && refundAmount <= refundable + 0.001;
  const currencySymbol = getCurrencySymbol(trip?.baseCurrency || '');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useFocusTrap(sheetRef, true, false, onClose);


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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--primary-accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Expense Review
            </span>
            <h3 id="expense-review-title" style={{ fontSize: '22px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{expense.title}</h3>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="secondary-btn hit-area"
            style={{ padding: '6px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            onClick={onClose}
          >
            <IconClose size={14} className="icon-sm" />
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          {canManage && !isSettlement && (
            <button
              className="secondary-btn"
              style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={onEdit}
            >
              <IconEdit size={13} className="icon-sm" /> Edit
            </button>
          )}
          {canManage && !isSettlement && onDuplicate && (
            <button
              className="secondary-btn"
              style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={onDuplicate}
            >
              <IconCopy size={13} className="icon-sm" /> Duplicate
            </button>
          )}
          {canManage && !isSettlement && onRecordRefund && refundable > 0 && (
            <button
              className="secondary-btn"
              style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setRefundOpen((o) => !o)}
            >
              <IconRefresh size={13} className="icon-sm" /> Refund
            </button>
          )}
          {!isSettlement && !expense.disputedAt && onFlagDispute && (
            <button
              className="secondary-btn"
              style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={onFlagDispute}
            >
              <IconAlertCircle size={13} className="icon-sm" /> Flag
            </button>
          )}
          {expense.disputedAt && (isTripAdmin || expense.disputedByUserId === currentUserId) && onResolveDispute && (
            <button
              className="secondary-btn"
              style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={onResolveDispute}
            >
              <IconAlertCircle size={13} className="icon-sm" /> Resolve
            </button>
          )}
          {expense.approvalStatus === 'pending_approval' && expense.createdByUserId !== currentUserId && onApproveExpense && (
            <button
              className="secondary-btn"
              style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={onApproveExpense}
            >
              ✓ Approve
            </button>
          )}
          {isSettlement && settlementConfirmationEnabled && !expense.settlementConfirmedAt && expense.splitMemberIds[0] === myMemberId && onConfirmSettlement && (
            <button
              className="secondary-btn"
              style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={onConfirmSettlement}
            >
              ✓ Confirm Receipt
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
        </div>

        {canManage && onToggleExcludeFromTotals && (
          <div style={{ marginBottom: '16px' }}>
            <SettingsToggleRow
              icon={<IconCheck size={16} />}
              title="Count in trip totals"
              subtitle="Off keeps it out of totals, charts and who pays whom."
              label="Count in trip totals"
              checked={!expense.excludeFromTotals}
              onChange={(counted) => onToggleExcludeFromTotals(!counted)}
            />
          </div>
        )}

        {expense.approvalStatus === 'pending_approval' && (
          <div style={{
            fontSize: '12.5px',
            color: 'var(--color-warning, #b8862e)',
            background: 'rgba(184, 134, 46, 0.08)',
            border: '1px solid rgba(184, 134, 46, 0.25)',
            borderRadius: 'var(--border-radius-md)',
            padding: '8px 12px',
            marginBottom: '16px',
          }}>
            Pending approval — above this trip's threshold, so it's excluded from balances until a second member approves it.
          </div>
        )}

        {isSettlement && settlementConfirmationEnabled && (
          <div style={{
            fontSize: '12.5px',
            color: expense.settlementConfirmedAt ? 'var(--color-success, #17B6A6)' : 'var(--text-secondary)',
            background: expense.settlementConfirmedAt ? 'rgba(23,182,166,0.08)' : 'var(--bg-subtle, rgba(15,23,42,0.04))',
            border: `1px solid ${expense.settlementConfirmedAt ? 'rgba(23,182,166,0.25)' : 'var(--border-color)'}`,
            borderRadius: 'var(--border-radius-md)',
            padding: '8px 12px',
            marginBottom: '16px',
          }}>
            {expense.settlementConfirmedAt
              ? `✓ Confirmed received by ${members[expense.splitMemberIds[0]]?.name || 'recipient'}`
              : 'Awaiting confirmation from the recipient that this was received.'}
          </div>
        )}

        {expense.disputedAt && (
          <div style={{
            fontSize: '12.5px',
            color: 'var(--color-danger)',
            background: 'rgba(184, 69, 46, 0.06)',
            border: '1px solid rgba(184, 69, 46, 0.25)',
            borderRadius: 'var(--border-radius-md)',
            padding: '8px 12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <IconAlertCircle size={14} className="icon-sm" />
            <span>
              Flagged by {members[expense.disputedByUserId || '']?.name || 'a participant'}
              {expense.disputeNote ? `: "${expense.disputeNote}"` : ' — needs a look before this is settled.'}
            </span>
          </div>
        )}

        {!canManage && !isSettlement && (
          <div style={{
            fontSize: '12.5px',
            color: 'var(--text-muted)',
            background: 'rgba(15,23,42,0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)',
            padding: '8px 12px',
            marginBottom: '16px',
          }}>
            You didn't add this expense, so only the trip admin or whoever added it can edit or delete it.
          </div>
        )}

        {refundOpen && onRecordRefund && (
          <form
            style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}
            onSubmit={(ev) => {
              ev.preventDefault();
              if (!refundValid) return;
              onRecordRefund(refundAmount);
              setRefundOpen(false);
              setRefundText('');
            }}
          >
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              autoFocus
              aria-label="Refund amount received by the payer"
              placeholder={`Refund received by ${members[expense.paidBy]?.name || 'payer'} (max ${formatMoneyNumber(refundable, currencySymbol)})`}
              value={refundText}
              onChange={(ev) => setRefundText(ev.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button type="submit" className="primary-btn" disabled={!refundValid} style={{ padding: '8px 14px' }}>Save</button>
          </form>
        )}

        {refunds.length > 0 && (
          <div style={{ fontSize: '12.5px', background: 'rgba(15,23,42,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '8px 12px', marginBottom: '16px' }}>
            <strong>Refunded {currencySymbol} {formatMoneyNumber(refunds.reduce((sum, r) => sum + r.amount, 0), currencySymbol)}</strong> to {members[expense.paidBy]?.name || 'the payer'}; shares and balances already reflect it.
            {refunds.map((r) => (
              <div key={r.id} style={{ color: 'var(--text-muted)' }}>{r.date}: {currencySymbol} {formatMoneyNumber(r.amount, currencySymbol)}</div>
            ))}
          </div>
        )}

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
              {currencySymbol} {formatMoneyNumber(expense.amount, currencySymbol)}
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
                decoding="async"
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

            {expense.splitMode === 'itemized' && expense.itemizedConfig && (
              <div style={{
                marginBottom: '12px',
                padding: '10px 12px',
                background: 'rgba(15,23,42,0.02)',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '12.5px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  🧾 Itemized Line Items ({expense.itemizedConfig.items.length})
                </div>
                {expense.itemizedConfig.items.map((item, idx) => (
                  <div key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
                    <span>
                      {item.name || `Item #${idx + 1}`} ({item.assignedMemberIds.map(id => members[id]?.name || 'Unknown').join(', ') || 'Shared'})
                    </span>
                    <span className="money" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {currencySymbol} {formatMoneyNumber(item.amount, currencySymbol)}
                    </span>
                  </div>
                ))}
                {(Boolean(expense.itemizedConfig.tax) || Boolean(expense.itemizedConfig.tip) || Boolean(expense.itemizedConfig.discount)) && (
                  <div style={{ paddingTop: '6px', borderTop: '1px dashed var(--border-color)', display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {Boolean(expense.itemizedConfig.tax) && <span>Tax: {currencySymbol}{formatMoneyNumber(expense.itemizedConfig.tax ?? 0, currencySymbol)}</span>}
                    {Boolean(expense.itemizedConfig.tip) && <span>Tip: {currencySymbol}{formatMoneyNumber(expense.itemizedConfig.tip ?? 0, currencySymbol)}</span>}
                    {Boolean(expense.itemizedConfig.discount) && <span>Discount: -{currencySymbol}{formatMoneyNumber(expense.itemizedConfig.discount ?? 0, currencySymbol)}</span>}
                  </div>
                )}
              </div>
            )}

            <div className="u-col-8">
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
                } else if (expense.splitMode === 'itemized') {
                  detailLabel = `(Itemized)`;
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
                      {currencySymbol} {formatMoneyNumber(share, currencySymbol)}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attached Polaroid Photo / Receipt Card */}
          {(expense.receiptImage || receiptUrl) && (
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed var(--border-color)' }}>
              <h4 style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px'
              }}>
                📸 Polaroid Memory & Receipt
              </h4>
              <div
                style={{
                  background: '#FFFFFF',
                  padding: '10px 10px 18px',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  border: '1px solid #E2E8F0',
                  textAlign: 'center',
                  transform: 'rotate(-1.5deg)',
                  maxWidth: '240px',
                  margin: '0 auto',
                }}
              >
                <img
                  src={expense.receiptImage || receiptUrl || ''}
                  alt={expense.title}
                  decoding="async"
                  style={{
                    width: '100%',
                    height: '180px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    display: 'block',
                  }}
                />
                <div style={{ marginTop: '8px', fontFamily: 'var(--font-family-title)', fontStyle: 'italic', fontSize: '13px', color: '#334155' }}>
                  {expense.title} · {expense.date}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
