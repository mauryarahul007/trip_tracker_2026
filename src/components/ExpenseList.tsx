import type { Category, Expense, Member, Trip } from '../types';
import { IconSearch, IconEdit, IconTrash, IconAlertCircle } from './Icons';
import { SwipeableRow } from './SwipeableRow';
import { CategoryIcon } from './CategoryIcon';

type Props = {
  trip: Trip | undefined;
  members: Record<string, Member>;
  categories: Category[];
  activeTripMembers: Member[];
  activeTripExpenseCount: number;
  filteredExpenses: Expense[];
  pendingDeleteId?: string;
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
  pendingDeleteId,
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
          <div className="input-icon-wrap" style={{ flex: '2 1 160px' }}>
            <IconSearch size={16} className="icon-sm" />
            <input
              type="text"
              className="input-field"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
            {hasActiveFilters ? "Nothing matches those filters — try clearing them." : 'Nothing logged yet. Add the first expense to start the ledger.'}
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {filteredExpenses.map((exp, idx) => {
            const isPending = exp.id === pendingDeleteId;
            const isPayerDeleted = trip ? !trip.memberIds.includes(exp.paidBy) : false;
            const hasDeletedParticipants = trip ? exp.splitMemberIds.some((id) => !trip.memberIds.includes(id)) : false;
            const needsReview = isPayerDeleted || hasDeletedParticipants;
            const payerName = members[exp.paidBy]?.name || 'Unknown (deleted)';
            const cat = categories.find((c) => c.id === exp.category);
            const splitNames = exp.splitMemberIds.map((id) => {
              const m = members[id];
              if (!m || (trip && !trip.memberIds.includes(id))) return '[Deleted Member]';
              return m.name;
            }).join(', ');

            const reviewMessage = isPayerDeleted && hasDeletedParticipants
              ? 'Payer and a split member were removed — reassign the payer and update the split.'
              : isPayerDeleted
                ? 'Payer was removed — assign a new payer.'
                : 'A split member was removed — update the split.';

            return (
              <div
                key={exp.id}
                aria-hidden={isPending}
                style={{
                  borderBottom: idx < filteredExpenses.length - 1 ? '1.5px dashed var(--border-color)' : 'none',
                  opacity: isPending ? 0.35 : 1,
                  pointerEvents: isPending ? 'none' : undefined,
                  transition: 'opacity 0.25s ease',
                }}
              >
                <SwipeableRow onDelete={() => onDelete(exp)}>
                  <div
                    style={{
                      display: 'flex', flexDirection: 'column', gap: '8px',
                      padding: '14px 16px',
                      borderLeft: needsReview ? '3px solid var(--color-warning)' : 'none',
                      background: needsReview ? 'rgba(185, 138, 62, 0.07)' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', rowGap: '10px' }}>
                      <div
                        style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', flex: '1 1 200px', minWidth: 0 }}
                        onClick={() => onReview(exp)}
                      >
                        <div style={{ flexShrink: 0, width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-hover)', borderRadius: '50%', color: 'var(--primary-accent)' }}>
                          <CategoryIcon categoryId={cat?.id || ''} fallbackEmoji={cat?.icon || '🏷️'} size={19} />
                        </div>
                        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <h4 style={{ fontSize: '15px', lineHeight: 1.3, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.title}</h4>
                          <p style={{ fontSize: '13px', lineHeight: 1.4, fontWeight: 500, color: 'var(--text-secondary)' }}>
                            <span style={isPayerDeleted ? { color: 'var(--color-warning)', fontWeight: 600 } : undefined}>
                              {payerName}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {exp.date}</span>
                          </p>
                          <p style={{ fontSize: '12px', lineHeight: 1.4, fontWeight: 400, color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={splitNames}>
                            with {splitNames}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', flex: '0 1 auto' }}>
                        <span className="money" style={{ fontSize: '15.5px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {currencySymbol} {exp.amount.toFixed(2)}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {!exp.title.startsWith('Settlement:') && (
                            <button
                              className="secondary-btn"
                              style={{
                                padding: '6px 8px',
                                color: needsReview ? 'var(--color-warning)' : undefined,
                                borderColor: needsReview ? 'rgba(185,138,62,0.35)' : undefined,
                              }}
                              aria-label={needsReview ? 'Review expense' : 'Edit expense'}
                              title={needsReview ? 'Review' : 'Edit'}
                              onClick={(e) => { e.stopPropagation(); onEdit(exp); }}
                            >
                              {needsReview ? <IconAlertCircle size={14} className="icon-sm" /> : <IconEdit size={14} className="icon-sm" />}
                            </button>
                          )}
                          <button
                            className="secondary-btn"
                            style={{ padding: '6px 8px', color: 'var(--color-danger)', borderColor: 'rgba(184,69,46,0.25)' }}
                            aria-label="Delete expense"
                            title="Delete"
                            onClick={(e) => { e.stopPropagation(); onDelete(exp); }}
                          >
                            <IconTrash size={14} className="icon-sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {needsReview && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '12px', fontWeight: 500, color: 'var(--color-warning)',
                      }}>
                        <IconAlertCircle size={14} className="icon-sm" />
                        <span>{reviewMessage}</span>
                      </div>
                    )}
                  </div>
                </SwipeableRow>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
