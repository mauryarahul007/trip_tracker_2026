import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { Category, Expense, Member, Trip } from '../types';
import { IconSearch, IconEdit, IconTrash, IconAlertCircle, IconClose, IconCalendar } from './Icons';
import { SwipeableRow } from './SwipeableRow';
import { CategoryIcon } from './CategoryIcon';
import { getCurrencySymbol } from '../utils/currency';
import { initial } from '../utils/initials';

// Swipe-to-delete is a supplement to the explicit trash button — skip
// wrapping the row in it at all when the viewer isn't allowed to delete.
function ConditionalSwipe({ enabled, onDelete, children }: { enabled: boolean; onDelete: () => void; children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;
  return <SwipeableRow onDelete={onDelete}>{children}</SwipeableRow>;
}

// Photo when the member has one (from their linked Google account),
// initials otherwise — same fallback pattern used for member avatars
// elsewhere in the app (see MembersGroupsTab's .lt-initials).
function ExpenseAvatar({ member, size = 22, muted = false }: { member: Member | undefined; size?: number; muted?: boolean }) {
  const label = member?.name || 'Removed member';
  const commonStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    border: '1.5px solid var(--bg-surface)',
    opacity: muted ? 0.55 : 1,
  };
  if (member?.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt=""
        title={label}
        referrerPolicy="no-referrer"
        style={{ ...commonStyle, objectFit: 'cover' }}
      />
    );
  }
  return (
    <div
      title={label}
      style={{
        ...commonStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: muted ? 'var(--text-muted)' : 'var(--text-primary)',
        color: 'var(--bg-surface)',
        fontFamily: 'var(--font-family-title)',
        fontWeight: 700,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {member ? initial(label) : '?'}
    </div>
  );
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
  myMemberId?: string | null;
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
  myMemberId,
}: Props) {
  const currencySymbol = getCurrencySymbol(trip?.baseCurrency || '');

  const [showDateFilter, setShowDateFilter] = useState(false);
  const isAllActive = !filterCategory && !filterMember && !filterDateFrom && !filterDateTo;

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
          <div className="expense-search-row">
            <div className="input-icon-wrap expense-search-wrap">
              <IconSearch size={16} className="icon-sm" />
              <input
                type="text"
                className="input-field expense-search-input"
                placeholder="Search expenses by title or note..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              {localSearch && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => {
                    setLocalSearch('');
                    setSearch('');
                  }}
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <IconClose size={14} />
                </button>
              )}
            </div>
          </div>

          {/* WhatsApp-style horizontal quick filter pills */}
          <div className="filter-chips-track" role="region" aria-label="Quick filters">
            <button
              type="button"
              className={`filter-chip ${isAllActive ? 'active' : ''}`}
              onClick={onClearFilters}
            >
              All
            </button>

            {myMemberId && (
              <button
                type="button"
                className={`filter-chip ${filterMember === myMemberId ? 'active' : ''}`}
                onClick={() => setFilterMember(filterMember === myMemberId ? '' : myMemberId)}
              >
                👤 Mine
              </button>
            )}

            {/* Category chips */}
            {categories.map((c) => {
              const isSelected = filterCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`filter-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => setFilterCategory(isSelected ? '' : c.id)}
                >
                  <CategoryIcon categoryId={c.id} fallbackEmoji={c.icon} size={13} />
                  <span>{c.name}</span>
                </button>
              );
            })}

            {/* Member chips (when multiple members exist, exclude myMemberId since that's already in 'Mine') */}
            {activeTripMembers.length > 1 &&
              activeTripMembers
                .filter((m) => m.id !== myMemberId)
                .map((m) => {
                  const isSelected = filterMember === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`filter-chip ${isSelected ? 'active' : ''}`}
                      onClick={() => setFilterMember(isSelected ? '' : m.id)}
                    >
                      <ExpenseAvatar member={m} size={15} />
                      <span>{m.name}</span>
                    </button>
                  );
                })}

            {/* Date filter chip */}
            <button
              type="button"
              className={`filter-chip ${(filterDateFrom || filterDateTo || showDateFilter) ? 'active' : ''}`}
              onClick={() => setShowDateFilter((v) => !v)}
              title="Filter by date range"
            >
              <IconCalendar size={13} />
              <span>
                {filterDateFrom || filterDateTo
                  ? `${filterDateFrom || 'Start'} – ${filterDateTo || 'End'}`
                  : 'Dates'}
              </span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                className="filter-chip filter-chip-clear"
                onClick={() => {
                  onClearFilters();
                  setShowDateFilter(false);
                }}
                title="Clear all active filters"
              >
                <IconClose size={12} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Collapsible Date Range Sub-panel */}
          {showDateFilter && (
            <div className="filter-date-popup fade-in">
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
              {(filterDateFrom || filterDateTo) && (
                <button
                  type="button"
                  className="filter-clear-link"
                  onClick={() => {
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                >
                  Reset dates
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
            const payerMember = members[exp.paidBy];
            const cat = categories.find((c) => c.id === exp.category);
            const splitMembers = exp.splitMemberIds.map((id) => ({ id, member: members[id] }));
            const visibleSplitMembers = splitMembers.slice(0, 4);
            const overflowSplitCount = splitMembers.length - visibleSplitMembers.length;

            const expenseDate = new Date(`${exp.date}T00:00:00`);
            const formattedDate = Number.isNaN(expenseDate.getTime())
              ? exp.date
              : expenseDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            const formattedTime = exp.createdAt
              ? new Date(exp.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              : null;

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
                      padding: '12px 14px',
                      borderLeft: needsReview ? '3px solid var(--color-warning)' : 'none',
                      background: needsReview ? 'rgba(185, 138, 62, 0.07)' : undefined,
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                      onClick={() => onReview(exp)}
                    >
                      <CategoryIcon categoryId={cat?.id || ''} fallbackEmoji={cat?.icon || '🏷️'} size={15} />
                      <h4 style={{ flex: 1, minWidth: 0, fontSize: '15px', lineHeight: 1.3, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.title}</h4>
                      <span className="money" style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {currencySymbol} {exp.amount.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', minWidth: 0 }}
                        onClick={() => onReview(exp)}
                        title={`Paid by ${payerMember?.name || 'a removed member'}`}
                      >
                        <ExpenseAvatar member={payerMember} size={22} muted={isPayerDeleted} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px', flexShrink: 0 }}>→</span>
                        <div style={{ display: 'flex', flexShrink: 0 }}>
                          {visibleSplitMembers.map(({ id, member }, splitIdx) => (
                            <div key={id} style={{ marginLeft: splitIdx === 0 ? 0 : '-8px' }}>
                              <ExpenseAvatar member={member} size={20} muted={!member} />
                            </div>
                          ))}
                          {overflowSplitCount > 0 && (
                            <div
                              style={{
                                marginLeft: '-8px', width: '20px', height: '20px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'var(--bg-surface-hover)', color: 'var(--text-secondary)',
                                fontSize: '9.5px', fontWeight: 700, fontFamily: 'var(--font-family-mono)',
                                border: '1.5px solid var(--bg-surface)', flexShrink: 0,
                              }}
                            >
                              +{overflowSplitCount}
                            </div>
                          )}
                        </div>
                        {exp.location?.placeName && (
                          <span style={{ color: '#00BFA5', fontSize: '12px', flexShrink: 0 }} title={exp.location.placeName}>📍</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <span style={{ fontSize: '11.5px', lineHeight: 1.4, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {formattedDate}{formattedTime ? ` · ${formattedTime}` : ''}
                        </span>
                        {canManage && (
                          // Its own gap, distinct from the date-to-buttons
                          // gap above — edit and delete sitting right next
                          // to each other need more separation than that,
                          // since one is destructive and a mis-tap there
                          // isn't recoverable the way a mis-tap elsewhere
                          // would be.
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
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
                          </div>
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
