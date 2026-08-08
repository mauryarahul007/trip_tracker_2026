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
            const isPayerDeleted = trip ? !trip.memberIds.includes(exp.paidBy) : false;
            const hasDeletedParticipants = trip ? exp.splitMemberIds.some(id => !trip.memberIds.includes(id)) : false;
            const needsReview = isPayerDeleted || hasDeletedParticipants;

            const payerName = members[exp.paidBy]?.name || 'Unknown (Deleted)';
            const cat = categories.find((c) => c.id === exp.category);
            
            const splitNames = exp.splitMemberIds.map((id) => {
              const m = members[id];
              if (!m || (trip && !trip.memberIds.includes(id))) {
                return '[Deleted Member]';
              }
              return m.name;
            }).join(', ');

            return (
              <div 
                key={exp.id} 
                className="glass-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px', 
                  padding: '16px',
                  border: needsReview ? '1px solid rgba(245, 158, 11, 0.35)' : undefined,
                  background: needsReview ? 'rgba(245, 158, 11, 0.02)' : undefined,
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', rowGap: '10px', width: '100%' }}>
                  <div
                    style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', flex: '1 1 200px', minWidth: 0 }}
                    onClick={() => onReview(exp)}
                  >
                    <div style={{ flexShrink: 0, fontSize: '24px', background: 'rgba(15,23,42,0.03)', padding: '8px', borderRadius: '50%' }}>
                      {cat?.icon || '🏷️'}
                    </div>
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <h4 style={{ fontSize: '15px', lineHeight: 1.3, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.title}</h4>
                      <p style={{ fontSize: '13px', lineHeight: 1.4, fontWeight: 500, color: 'var(--text-secondary)' }}>
                        <span style={isPayerDeleted ? { color: 'var(--color-warning)', fontWeight: 600 } : {}}>
                          {isPayerDeleted ? '⚠️ Unknown (Deleted)' : payerName}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {exp.date}</span>
                      </p>
                      <p style={{ fontSize: '12px', lineHeight: 1.4, fontWeight: 400, color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={splitNames}>
                        with {splitNames}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', flex: '0 1 auto' }}>
                    <span style={{ fontFamily: 'var(--font-family-title)', fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                      {currencySymbol} {exp.amount.toFixed(2)}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {!exp.title.startsWith('Settlement:') && (
                        <button
                          className="secondary-btn"
                          style={{ 
                            padding: '4px 10px', 
                            fontSize: '12px',
                            background: needsReview ? 'var(--color-warning)' : undefined,
                            color: needsReview ? '#ffffff' : undefined,
                            borderColor: needsReview ? 'rgba(217,119,6,0.3)' : undefined,
                          }}
                          onClick={(e) => { e.stopPropagation(); onEdit(exp); }}
                        >
                          {needsReview ? 'Review' : 'Edit'}
                        </button>
                      )}
                      <button
                        className="secondary-btn"
                        style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--color-danger)', borderColor: 'rgba(225,29,72,0.15)' }}
                        onClick={(e) => { e.stopPropagation(); onDelete(exp); }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                {needsReview && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    background: 'rgba(245, 158, 11, 0.06)', 
                    padding: '6px 12px', 
                    borderRadius: '6px', 
                    fontSize: '12px', 
                    color: 'rgb(180, 83, 9)',
                    fontWeight: '500',
                    border: '1px solid rgba(245, 158, 11, 0.15)'
                  }}>
                    <span>⚠️</span>
                    <span>
                      {isPayerDeleted && hasDeletedParticipants 
                        ? 'Payer and split participant(s) were deleted. Please change ownership/splits.'
                        : isPayerDeleted
                        ? 'Payer was deleted. Please assign a new payer.'
                        : 'A split participant was deleted. Please update split configuration.'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
