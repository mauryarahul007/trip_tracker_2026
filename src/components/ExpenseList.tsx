import { useState, useEffect } from 'react';
import type { Category, Expense, Member, Trip } from '../types';
import { IconSearch, IconEdit, IconTrash, IconAlertCircle, IconFilter } from './Icons';
import { SwipeableRow } from './SwipeableRow';
import { CategoryIcon } from './CategoryIcon';
import { getCurrencySymbol } from '../utils/currency';

// Swipe-to-delete is a supplement to the explicit trash button — skip
// wrapping the row in it at all when the viewer isn't allowed to delete.
function ConditionalSwipe({ enabled, onDelete, children }: { enabled: boolean; onDelete: () => void; children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;
  return <SwipeableRow onDelete={onDelete}>{children}</SwipeableRow>;
}

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

  onReview: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;

  isAdmin: boolean;
  userId: string | null;
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
  isAdmin,
  userId,
}: Props) {
  const currencySymbol = getCurrencySymbol(trip?.baseCurrency || '');

  // 0. Advanced filters (category/member/date range) stay collapsed by
  // default — search is the filter people reach for constantly, the rest
  // are occasional, so burying them behind a toggle keeps the common case
  // to one compact row instead of three.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = [filterCategory, filterMember, filterDateFrom, filterDateTo].filter(Boolean).length;

  // 1. Debounce Search Input
  const [localSearch, setLocalSearch] = useState(search);
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(localSearch);
    }, 200);
    return () => clearTimeout(timer);
  }, [localSearch, setSearch]);

  // 2. Pagination State for virtualization
  const [visibleCount, setVisibleCount] = useState(50);
  
  // Reset pagination when filter criteria change
  useEffect(() => {
    setVisibleCount(50);
  }, [trip?.id, filterCategory, filterMember, filterDateFrom, filterDateTo, search]);

  const displayedExpenses = filteredExpenses.slice(0, visibleCount);

  return (
    <>
      {/* Search & Filters */}
      {activeTripExpenseCount > 0 && (
        <div className="expense-filters">
          <div className="expense-filters-row">
            <div className="input-icon-wrap expense-search">
              <IconSearch size={16} className="icon-sm" />
              <input
                type="text"
                className="input-field"
                placeholder="Search expenses..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className={`filter-toggle-btn ${filtersOpen ? 'open' : ''}`}
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-label="Toggle filters"
            >
              <IconFilter size={16} className="icon-sm" />
              {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
            </button>
          </div>
          {filtersOpen && (
            <div className="expense-filters-panel">
              <select
                className="input-field select-field"
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
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
              >
                <option value="">All Members</option>
                {activeTripMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <div className="expense-date-range">
                <input
                  type="date"
                  className="input-field"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  aria-label="From date"
                />
                <span className="expense-date-sep">–</span>
                <input
                  type="date"
                  className="input-field"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  aria-label="To date"
                />
              </div>
              {hasActiveFilters && (
                <button type="button" className="filter-clear-link" onClick={onClearFilters}>
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="glass-card ledger-empty" style={{ borderStyle: 'dashed' }}>
          <div className="ledger-rule" />
          <div className="ledger-rule" />
          <div className="ledger-empty-prompt">
            <span className="ledger-pencil" aria-hidden="true">
              <IconEdit size={14} className="icon-sm" />
            </span>
            <p>
              {hasActiveFilters ? "Nothing matches those filters — try clearing them." : 'Nothing logged yet. Add the first line to start the ledger.'}
            </p>
          </div>
          <div className="ledger-rule" />
          <div className="ledger-rule" />
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {displayedExpenses.map((exp, idx) => {
            const isPending = exp.id === pendingDeleteId;
            const canManage = isAdmin || exp.createdByUserId === userId;
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
                  borderBottom: idx < displayedExpenses.length - 1 ? '1.5px dashed var(--border-color)' : 'none',
                  opacity: isPending ? 0.35 : 1,
                  pointerEvents: isPending ? 'none' : undefined,
                  transition: 'opacity 0.25s ease',
                }}
              >
                <ConditionalSwipe enabled={canManage} onDelete={() => onDelete(exp)}>
                  <div
                    style={{
                      display: 'flex', flexDirection: 'column', gap: '6px',
                      padding: '10px 14px',
                      borderLeft: needsReview ? '3px solid var(--color-warning)' : 'none',
                      background: needsReview ? 'rgba(185, 138, 62, 0.07)' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', flex: 1, minWidth: 0 }}
                        onClick={() => onReview(exp)}
                      >
                        <div style={{ flexShrink: 0, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-hover)', borderRadius: '50%', color: 'var(--primary-accent)' }}>
                          <CategoryIcon categoryId={cat?.id || ''} fallbackEmoji={cat?.icon || '🏷️'} size={16} />
                        </div>
                        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <h4 style={{ fontSize: '14.5px', lineHeight: 1.3, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.title}</h4>
                          <p style={{ fontSize: '12.5px', lineHeight: 1.4, fontWeight: 500, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={isPayerDeleted ? { color: 'var(--color-warning)', fontWeight: 600 } : undefined}>
                              {payerName}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {exp.date}</span>
                            {exp.location?.placeName ? (
                              <span style={{ color: '#00BFA5', fontWeight: 500 }}> · 📍 {exp.location.placeName}</span>
                            ) : null}
                            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · with {splitNames}</span>
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                        <span className="money" style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', marginRight: canManage ? '4px' : 0 }}>
                          {currencySymbol} {exp.amount.toFixed(2)}
                        </span>
                        {canManage && (
                          <>
                            {!exp.title.startsWith('Settlement:') && (
                              <button
                                className="row-icon-btn"
                                style={needsReview ? { color: 'var(--color-warning)' } : undefined}
                                aria-label={needsReview ? 'Review expense' : 'Edit expense'}
                                title={needsReview ? 'Review' : 'Edit'}
                                onClick={(e) => { e.stopPropagation(); onEdit(exp); }}
                              >
                                {needsReview ? <IconAlertCircle size={15} className="icon-sm" /> : <IconEdit size={15} className="icon-sm" />}
                              </button>
                            )}
                            <button
                              className="row-icon-btn row-icon-btn-danger"
                              aria-label="Delete expense"
                              title="Delete"
                              onClick={(e) => { e.stopPropagation(); onDelete(exp); }}
                            >
                              <IconTrash size={15} className="icon-sm" />
                            </button>
                          </>
                        )}
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
                </ConditionalSwipe>
              </div>
            );
          })}
        </div>
      )}

      {filteredExpenses.length > visibleCount && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ width: '100%', padding: '12px' }}
            onClick={() => setVisibleCount((prev) => prev + 50)}
          >
            Load More (showing {visibleCount} of {filteredExpenses.length})
          </button>
        </div>
      )}
    </>
  );
}
