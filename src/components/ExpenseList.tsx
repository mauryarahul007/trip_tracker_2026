import type { Category, Expense, Member, Trip } from '../types';

type Props = {
  trip: Trip | undefined;
  members: Record<string, Member>;
  categories: Category[];
  activeTripMembers: Member[];
  activeTripExpenseCount: number;
  filteredExpenses: Expense[];
  hasActiveFilters: boolean;

  search: string;
  setSearch: (v: string) => void;
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  filterMember: string;
  setFilterMember: (v: string) => void;
  filterDateFrom: string;
  setFilterDateFrom: (v: string) => void;
  filterDateTo: string;
  setFilterDateTo: (v: string) => void;
  onClearFilters: () => void;

  onReview: (exp: Expense) => void;
  onEdit: (exp: Expense) => void;
  onDelete: (exp: Expense) => void;
};

export function ExpenseList({
  trip,
  members,
  categories,
  activeTripMembers,
  activeTripExpenseCount,
  filteredExpenses,
  hasActiveFilters,
  search,
  setSearch,
  filterCategory,
  setFilterCategory,
  filterMember,
  setFilterMember,
  filterDateFrom,
  setFilterDateFrom,
  filterDateTo,
  setFilterDateTo,
  onClearFilters,
  onReview,
  onEdit,
  onDelete,
}: Props) {
  const currencySymbol = trip?.baseCurrency === 'INR' ? '₹' : trip?.baseCurrency;

  return (
    <>
      {/* Search & Filters */}
      {activeTripExpenseCount > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="🔍 Search expenses..."
            style={{ flex: '2 1 160px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input-field select-field"
            style={{ flex: '1 1 130px' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <select
            className="input-field select-field"
            style={{ flex: '1 1 130px' }}
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
          >
            <option value="">All Members</option>
            {activeTripMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <input
            type="date"
            className="input-field"
            style={{ flex: '1 1 130px' }}
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            aria-label="From date"
          />
          <input
            type="date"
            className="input-field"
            style={{ flex: '1 1 130px' }}
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            aria-label="To date"
          />
          {hasActiveFilters && (
            <button type="button" className="secondary-btn" onClick={onClearFilters}>
              Clear
            </button>
          )}
        </div>
      )}

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '32px', borderStyle: 'dashed' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            {hasActiveFilters ? 'No expenses match your search/filters.' : 'No expenses recorded yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredExpenses.map((exp) => {
            const payer = members[exp.paidBy];
            const cat = categories.find((c) => c.id === exp.category);
            const splitNames = exp.splitMemberIds.map((id) => members[id]?.name).filter(Boolean).join(', ');
            return (
              <div key={exp.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                <div
                  style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', flex: 1 }}
                  onClick={() => onReview(exp)}
                >
                  <div style={{ fontSize: '24px', background: 'rgba(15,23,42,0.03)', padding: '8px', borderRadius: '50%' }}>
                    {cat?.icon || '🏷️'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', color: 'var(--primary-accent)', textDecoration: 'underline', textDecorationColor: 'rgba(79, 70, 229, 0.2)' }}>{exp.title}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Paid by: <strong>{payer?.name || 'Deleted'}</strong> • {exp.date}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={splitNames}>
                      Split with: {splitNames}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {currencySymbol} {exp.amount.toFixed(2)}
                  </span>
                  {!exp.title.startsWith('Settlement:') && (
                    <button
                      className="secondary-btn"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={(e) => { e.stopPropagation(); onEdit(exp); }}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    className="secondary-btn"
                    style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--color-danger)', borderColor: 'rgba(225,29,72,0.15)' }}
                    onClick={(e) => { e.stopPropagation(); onDelete(exp); }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
