import type { Expense } from '../types';
import { IconAlertCircle } from './Icons';
import { getCurrencySymbol } from '../utils/currency';

interface ConflictResolverModalProps {
  localExpense: Expense;
  serverExpense: Expense;
  currency: string;
  onKeepLocal: () => void;
  onAcceptServer: () => void;
  onClose: () => void;
}

export function ConflictResolverModal({
  localExpense,
  serverExpense,
  currency,
  onKeepLocal,
  onAcceptServer,
  onClose,
}: ConflictResolverModalProps) {
  const currencySymbol = getCurrencySymbol(currency);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card fade-in"
        style={{ maxWidth: '500px', width: '100%', padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(235, 107, 86, 0.15)',
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <IconAlertCircle size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', margin: 0 }}>Sync Conflict Detected</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              This expense was modified on another device while you were offline.
            </p>
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {/* Local Version */}
          <div style={{
            padding: '12px',
            borderRadius: 'var(--border-radius-sm)',
            background: 'var(--bg-secondary)',
            border: '1.5px solid var(--primary-accent)',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-accent)', textTransform: 'uppercase' }}>
              Your Offline Version
            </span>
            <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px' }}>{localExpense.title}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {currencySymbol}{localExpense.amount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Date: {localExpense.date}
            </div>
          </div>

          {/* Server Version */}
          <div style={{
            padding: '12px',
            borderRadius: 'var(--border-radius-sm)',
            background: 'var(--bg-secondary)',
            border: '1.5px solid var(--border-color)',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Cloud / Server Version
            </span>
            <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px' }}>{serverExpense.title}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {currencySymbol}{serverExpense.amount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Date: {serverExpense.date}
            </div>
          </div>
        </div>

        {/* Action Options */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ flex: 1, padding: '10px' }}
            onClick={onAcceptServer}
          >
            Accept Cloud Version
          </button>
          <button
            type="button"
            className="primary-btn"
            style={{ flex: 1, padding: '10px' }}
            onClick={onKeepLocal}
          >
            Keep My Version
          </button>
        </div>
      </div>
    </div>
  );
}
