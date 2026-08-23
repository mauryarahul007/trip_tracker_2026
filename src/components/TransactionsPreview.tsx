import type { Expense, Trip } from '../types';
import { IconChevronRight } from './Icons';
import { CategoryIcon } from './CategoryIcon';
import { getCurrencySymbol } from '../utils/currency';
import { usePrivacyStore, formatMaskedAmount } from '../store/privacyStore';

const PREVIEW_COUNT = 5;

type Props = {
  trip: Trip | undefined;
  expenses: Expense[]; // unfiltered activeTripExpenses -- preview always shows true recency, not the ledger's active filters
  onViewAll: () => void;
};

// Lean "recent activity" teaser for the Summary tab -- last few
// transactions, view-only (no edit/delete/swipe), with a single link to
// the full Transactions screen for anything more.
export function TransactionsPreview({ trip, expenses, onViewAll }: Props) {
  const isBlindMode = usePrivacyStore((s) => s.isBlindMode);
  const currencySymbol = getCurrencySymbol(trip?.baseCurrency || '');
  const recent = [...expenses]
    .filter((e) => !e.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .slice(0, PREVIEW_COUNT);

  if (recent.length === 0) return null;

  return (
    <div className="glass-card" style={{ marginTop: '16px', padding: '4px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 8px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Recent Activity</h3>
        <button type="button" className="transactions-preview-viewall" onClick={onViewAll}>
          View all <IconChevronRight size={14} className="icon-sm" />
        </button>
      </div>
      {recent.map((exp) => (
        <div key={exp.id} className="transactions-preview-row" onClick={onViewAll}>
          <CategoryIcon categoryId={exp.category} size={20} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {exp.title || exp.category}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{exp.date}</div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700 }} className={isBlindMode ? 'privacy-blur' : ''}>
            {formatMaskedAmount(exp.amount, currencySymbol, isBlindMode)}
          </div>
        </div>
      ))}
    </div>
  );
}
