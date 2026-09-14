import { useState } from 'react';
import type { Expense, Member } from '../types';
import { groupSettlementsByPair } from '../utils/settlement';
import { formatAmount } from '../utils/currency';
import { formatRelativeTime } from '../utils/relativeTime';
import { triggerHaptic } from '../utils/haptics';
import { IconChevronRight } from './Icons';

interface Props {
  settlementExpenses: Expense[]; // isSettlement rows only
  members: Record<string, Member>;
  currencySymbol: string;
}

// Surfaces partial-settlement progress ("₹200 of ₹500 paid across 2
// payments") that's otherwise invisible -- custom-amount settling already
// works (BalancesSettlements.tsx), this just groups the resulting ledger
// rows by debtor/creditor pair instead of leaving them as flat entries.
export function SettlementHistorySection({ settlementExpenses, members, currencySymbol }: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const groups = groupSettlementsByPair(settlementExpenses).filter((g) => g.payments.length > 1);
  if (groups.length === 0) return null;

  return (
    <div style={{ marginTop: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 10px', padding: '0 4px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          Payment History
        </span>
      </div>

      {groups.map((group) => {
        const key = `${group.fromMemberId}:${group.toMemberId}`;
        const isExpanded = expandedKey === key;
        const fromName = members[group.fromMemberId]?.name || 'Unknown';
        const toName = members[group.toMemberId]?.name || 'Unknown';

        return (
          <div
            key={key}
            className="card"
            style={{ padding: '12px 14px', marginBottom: '8px', borderRadius: 'var(--border-radius-lg, 14px)', border: '1px solid var(--border-color)' }}
          >
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setExpandedKey(isExpanded ? null : key);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              aria-expanded={isExpanded}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {fromName} → {toName}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {formatAmount(group.totalPaid, currencySymbol)} paid across {group.payments.length} payments
                </div>
              </div>
              <IconChevronRight
                size={14}
                className="icon-sm"
                style={{ transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}
              />
            </button>

            {isExpanded && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {group.payments.map((payment) => (
                  <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{formatRelativeTime(new Date(payment.createdAt).toISOString())}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatAmount(payment.amount, currencySymbol)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
