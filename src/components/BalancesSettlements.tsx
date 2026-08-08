import type { Expense, Member, Trip } from '../types';
import type { MemberBalance, Transfer } from '../utils/settlement';

type Props = {
  trip: Trip;
  members: Record<string, Member>;
  balances: MemberBalance[];
  transfers: Transfer[];
  activeTripExpenses: Expense[];
  onMemberClick: (memberId: string) => void;
  onSettle: (fromId: string, toId: string, amount: number) => void;
};

export function BalancesSettlements({
  trip,
  members,
  balances,
  transfers,
  activeTripExpenses,
  onMemberClick,
  onSettle,
}: Props) {
  const currencySymbol = trip.baseCurrency === 'INR' ? '₹' : trip.baseCurrency;

  return (
    <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Balances & Settlements</h3>

      {/* Balances List */}
      <div className="glass-card" style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Member Balances
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {balances.map((b) => {
            const isPositive = b.balance > 0.01;
            const isNegative = b.balance < -0.01;
            const color = isPositive ? 'var(--color-success)' : isNegative ? 'var(--color-danger)' : 'var(--text-secondary)';
            const absVal = Math.abs(b.balance).toFixed(2);
            return (
              <div
                key={b.memberId}
                className="balance-row"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', padding: '6px 4px', borderRadius: '8px', cursor: 'pointer' }}
                onClick={() => onMemberClick(b.memberId)}
                title={`View ${b.name}'s expenses`}
              >
                <span><strong>{b.name}</strong></span>
                <span style={{ color, fontWeight: '700' }}>
                  {isPositive ? `gets back ${currencySymbol}${absVal}` : isNegative ? `owes ${currencySymbol}${absVal}` : 'settled'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settlements List */}
      <div className="glass-card">
        <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Settlement Actions (Minimized)
        </h4>
        {transfers.length === 0 ? (
          <p style={{ color: 'var(--color-success)', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🎉 All settlements complete! No outstanding debts.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transfers.map((t, idx) => {
              const fromName = members[t.from]?.name || 'Unknown';
              const toName = members[t.to]?.name || 'Unknown';
              // Check if this transfer has already been settled
              const isSettled = activeTripExpenses.some(
                (e) =>
                  e.title.startsWith('Settlement:') &&
                  e.paidBy === t.from &&
                  e.splitMemberIds.includes(t.to) &&
                  Math.abs(e.amount - t.amount) < 0.02
              );
              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < transfers.length - 1 ? '1px dashed rgba(15,23,42,0.05)' : 'none' }}>
                  <div style={{ fontSize: '14px' }}>
                    <strong>{fromName}</strong> owes <strong>{toName}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: isSettled ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {currencySymbol} {t.amount.toFixed(2)}
                    </span>
                    {isSettled ? (
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>✓ Settled</span>
                    ) : (
                      <button
                        className="gradient-btn"
                        style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                        onClick={() => onSettle(t.from, t.to, t.amount)}
                      >
                        Settle
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
