import { useState } from 'react';
import type { Trip, Member, Expense, Category } from '../types';
import type { MemberBalance, Transfer } from '../utils/settlement';
import { formatAmount } from '../utils/currency';
import { triggerHaptic } from '../utils/haptics';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useHistoryBack } from '../utils/useHistoryBack';
import { getMemberRole } from '../utils/memberRoles';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  members: Record<string, Member>;
  expenses: Expense[];
  categories: Category[];
  balances: MemberBalance[];
  settlements: Transfer[];
}

export function TravelDossierModal({
  isOpen,
  onClose,
  trip,
  members,
  expenses,
  categories,
  balances,
  settlements,
}: Props) {
  const [copied, setCopied] = useState(false);

  useHistoryBack(isOpen, onClose);
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const validExpenses = expenses.filter((e) => !e.deletedAt);
  const expenseCount = validExpenses.length;

  // Calculate day count
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const dayCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  const avgPerDay = totalSpend / dayCount;

  // Category summary
  const categoryTotals: Record<string, number> = {};
  validExpenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([catId, amount]) => {
      const catObj = categories.find((c) => c.id === catId);
      return {
        id: catId,
        name: catObj?.name || catId,
        icon: catObj?.icon || '🏷️',
        amount,
        percentage: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
      };
    });

  const handlePrint = () => {
    triggerHaptic('light');
    window.print();
  };

  const handleCopySummary = () => {
    triggerHaptic('light');
    let text = `✈️ *${trip.name}* — Travel Dossier\n`;
    text += `📅 ${trip.startDate} to ${trip.endDate} (${dayCount} days)\n`;
    text += `💰 Total Spend: ${formatAmount(totalSpend, trip.baseCurrency)}\n`;
    text += `📊 Avg/Day: ${formatAmount(avgPerDay, trip.baseCurrency)}\n\n`;

    text += `*Settlements Needed:*\n`;
    if (settlements.length === 0) {
      text += `✓ All settled up! No outstanding balances.\n`;
    } else {
      settlements.forEach((s) => {
        const fromName = members[s.from]?.name || 'Unknown';
        const toName = members[s.to]?.name || 'Unknown';
        text += `• ${fromName} ➔ ${toName}: ${formatAmount(s.amount, trip.baseCurrency)}\n`;
      });
    }

    text += `\n*Top Categories:*\n`;
    sortedCategories.slice(0, 4).forEach((c) => {
      text += `• ${c.icon} ${c.name}: ${formatAmount(c.amount, trip.baseCurrency)} (${c.percentage.toFixed(0)}%)\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="modal-backdrop dossier-modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content dossier-print-area"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '820px',
          width: '95%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '32px',
          borderRadius: 'var(--border-radius-lg, 20px)',
          background: 'var(--card-bg, var(--bg-surface))',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Modal Toolbar (hidden during print) */}
        <div className="dossier-screen-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>📄</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Travel Dossier & Statement</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Official trip summary & settlement vouchers</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="primary-btn"
              style={{ padding: '6px 14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={handlePrint}
            >
              <span>🖨️</span> Print / Save PDF
            </button>
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '6px 14px', fontSize: '12.5px' }}
              onClick={handleCopySummary}
            >
              {copied ? '✓ Copied!' : '📋 Copy Text'}
            </button>
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '6px 10px', fontSize: '13px' }}
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Dossier Document Content */}
        <div className="dossier-document">
          {/* Header Banner */}
          <div
            style={{
              padding: '24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(15, 169, 143, 0.12), rgba(47, 111, 237, 0.08))',
              border: '1px solid rgba(15, 169, 143, 0.25)',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--primary-accent)', textTransform: 'uppercase' }}>
                  Trip Statement & Ledger
                </div>
                <h1 style={{ margin: '4px 0 6px 0', fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {trip.name}
                </h1>
                <div style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
                  📅 {trip.startDate} – {trip.endDate} • {dayCount} days • {trip.baseCurrency}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Expenditure</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {formatAmount(totalSpend, trip.baseCurrency)}
                </div>
              </div>
            </div>

            {/* Member Roster with Roles */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Travelers ({trip.memberIds.length}):</span>
              {trip.memberIds.map((mId) => {
                const member = members[mId];
                if (!member) return null;
                const role = getMemberRole(trip, mId);
                return (
                  <span
                    key={mId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      fontSize: '11.5px',
                      background: 'var(--card-bg, #fff)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <span>{role === 'organizer' ? '👑' : role === 'viewer' ? '👁️' : '✍️'}</span>
                    <strong>{member.name}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>({role})</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-card-subtle, rgba(0,0,0,0.02))', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Daily Average</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {formatAmount(avgPerDay, trip.baseCurrency)}
              </div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-card-subtle, rgba(0,0,0,0.02))', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Expenses</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {expenseCount}
              </div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-card-subtle, rgba(0,0,0,0.02))', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Top Category</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sortedCategories[0]?.name || 'None'}
              </div>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-card-subtle, rgba(0,0,0,0.02))', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Settlements Needed</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: settlements.length > 0 ? 'var(--primary-accent)' : 'var(--color-success)', marginTop: '2px' }}>
                {settlements.length === 0 ? '0 (Balanced)' : settlements.length}
              </div>
            </div>
          </div>

          {/* Member Net Balances */}
          {balances.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚖️</span> Member Net Balances
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                {balances.map((b) => (
                  <div
                    key={b.memberId}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface, #fff)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{b.name}</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: b.balance > 0 ? 'var(--color-success, #10b981)' : b.balance < 0 ? 'var(--color-danger, #ef4444)' : 'var(--text-muted)',
                      }}
                    >
                      {b.balance > 0 ? `+${formatAmount(b.balance, trip.baseCurrency)}` : b.balance < 0 ? `-${formatAmount(Math.abs(b.balance), trip.baseCurrency)}` : 'Settled'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settlements / Debt Simplification Section */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🤝</span> Balance Settlements
            </h3>
            {settlements.length === 0 ? (
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--color-success, #10b981)', fontSize: '13.5px', fontWeight: 600, textAlign: 'center' }}>
                ✓ Everyone is settled up! No outstanding transfers.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                {settlements.map((s, idx) => {
                  const fromMember = members[s.from];
                  const toMember = members[s.to];
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'var(--bg-surface, #fff)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          {fromMember?.name || 'Unknown'} ➔ {toMember?.name || 'Unknown'}
                        </div>
                        {toMember?.upiId && (
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                            UPI: {toMember.upiId}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-accent)' }}>
                          {formatAmount(s.amount, trip.baseCurrency)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category Spending Breakdown */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📊</span> Category Breakdown
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedCategories.map((c) => (
                <div key={c.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '3px' }}>
                    <span>{c.icon} {c.name}</span>
                    <span style={{ fontWeight: 600 }}>
                      {formatAmount(c.amount, trip.baseCurrency)} ({c.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div style={{ height: '6px', width: '100%', background: 'rgba(0,0,0,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${c.percentage}%`, background: 'var(--primary-accent, #0fa98f)', borderRadius: '999px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Ledger Table */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🧾</span> Itemized Expense Ledger ({expenseCount})
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px' }}>Date</th>
                    <th style={{ padding: '8px' }}>Title</th>
                    <th style={{ padding: '8px' }}>Category</th>
                    <th style={{ padding: '8px' }}>Paid By</th>
                    <th style={{ padding: '8px' }}>Split</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {validExpenses.map((exp) => (
                    <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{exp.date}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{exp.title}</td>
                      <td style={{ padding: '8px' }}>
                        {categories.find((c) => c.id === exp.category)?.name || exp.category}
                      </td>
                      <td style={{ padding: '8px' }}>{members[exp.paidBy]?.name || 'Unknown'}</td>
                      <td style={{ padding: '8px', textTransform: 'capitalize' }}>
                        {exp.splitMode} ({exp.splitMemberIds.length} members)
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>
                        {formatAmount(exp.amount, exp.currency || trip.baseCurrency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
