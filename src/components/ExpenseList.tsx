import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Category, Expense, Member, Trip } from '../types';
import { IconSearch, IconEdit, IconAlertCircle, IconClose, IconCalendar, IconChevronRight, IconFilter } from './Icons';
import { SwipeableRow } from './SwipeableRow';
import { CategoryIcon } from './CategoryIcon';
import { getCurrencySymbol, formatAmount } from '../utils/currency';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { triggerHaptic } from '../utils/haptics';
import { tripDayNumber } from '../utils/dateRange';

// Swipe-to-delete is a supplement to the explicit trash button — skip
// wrapping the row in it at all when the viewer isn't allowed to delete.
function ConditionalSwipe({ enabled, onDelete, onEdit, children }: { enabled: boolean; onDelete: () => void; onEdit?: () => void; children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;
  return <SwipeableRow onDelete={onDelete} onEdit={onEdit}>{children}</SwipeableRow>;
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
        loading="lazy"
        decoding="async"
        width={size}
        height={size}
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
        background: member ? avatarColorForName(label) : 'var(--text-muted)',
        color: '#FFFDF6',
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
  activeTripExpenses: Expense[];
  onReviewAffected: (expenseIds: string[]) => void;
  filteredExpenses: Expense[];
  pendingDeleteId?: string;
  hasActiveFilters: boolean;

  // Header stat strip -- same aggregate numbers already computed once in
  // App.tsx for Settings' Analytics section, not recomputed here.
  totalSpent: number;
  averageCost: number;
  topCategoryName?: string;
  topCategoryPercentage?: number;
  getCatColor: (id: string, idx: number) => string;

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
  filterAmountMin: string;
  filterAmountMax: string;
  filterRelation: '' | 'paidByMe' | 'involvesMe';
  filterLocation: string;
  myMemberId: string | null;
  onClearFilters: () => void;
  onOpenFilters: () => void;

  onReview: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;

  isAdmin: boolean;
  userId: string | null;
  activeTransitionSourceId?: string | null;
};

export function ExpenseList({
  trip,
  members,
  categories,
  activeTripMembers,
  activeTripExpenseCount,
  activeTripExpenses,
  onReviewAffected,
  filteredExpenses,
  pendingDeleteId,
  hasActiveFilters,
  totalSpent,
  averageCost,
  topCategoryName,
  topCategoryPercentage,
  getCatColor,
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
  filterAmountMin,
  filterAmountMax,
  filterRelation,
  filterLocation,
  myMemberId,
  onClearFilters,
  onOpenFilters,
  onReview,
  onEdit,
  onDelete,
  isAdmin,
  userId,
  activeTransitionSourceId,
}: Props) {
  const currencySymbol = getCurrencySymbol(trip?.baseCurrency || '');

  const filtersRef = useRef<HTMLDivElement>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const isAllActive = !filterCategory && !filterMember && !filterDateFrom && !filterDateTo && !filterAmountMin && !filterAmountMax && !filterRelation && !filterLocation;

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
  }, [trip?.id, filterCategory, filterMember, filterDateFrom, filterDateTo, search, filterAmountMin, filterAmountMax, filterRelation, filterLocation]);

  const displayedExpenses = filteredExpenses.slice(0, visibleCount);

  // Group the flat "List" view into per-day sections so a long trip reads
  // as a scannable list of day totals instead of one endless feed.
  // Expenses already arrive newest date first, so the first N groups
  // encountered are the most recent days -- expand those by default,
  // collapse the rest.
  const dayGroups = displayedExpenses.reduce<{ date: string; expenses: Expense[] }[]>((groups, exp) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.date === exp.date) {
      lastGroup.expenses.push(exp);
    } else {
      groups.push({ date: exp.date, expenses: [exp] });
    }
    return groups;
  }, []);

  // Every day-group starts collapsed on entering the tab; only the days a
  // user explicitly expands (via collapseOverrides) open up.
  const DEFAULT_EXPANDED_DAYS = 0;
  // Only stores days the user has explicitly toggled away from their
  // default state -- the default itself (first N groups open, rest
  // collapsed) is derived fresh from dayGroups every render, so it stays
  // correct as Load More or filters change which dates are present.
  const [collapseOverrides, setCollapseOverrides] = useState<Record<string, boolean>>({});
  const isDayCollapsedByDefault = (groupIndex: number) => groupIndex >= DEFAULT_EXPANDED_DAYS;
  const isDayCollapsed = (date: string, groupIndex: number) =>
    collapseOverrides[date] ?? isDayCollapsedByDefault(groupIndex);
  const toggleDay = (date: string, groupIndex: number) => {
    triggerHaptic('light');
    const currentlyCollapsed = isDayCollapsed(date, groupIndex);
    setCollapseOverrides((prev) => ({ ...prev, [date]: !currentlyCollapsed }));
  };
  const allDaysExpanded = dayGroups.length > 0 && dayGroups.every((g, idx) => !isDayCollapsed(g.date, idx));
  const toggleAllDays = () => {
    triggerHaptic('light');
    const nextCollapsed = allDaysExpanded;
    setCollapseOverrides((prev) => {
      const next = { ...prev };
      dayGroups.forEach((g) => { next[g.date] = nextCollapsed; });
      return next;
    });
  };

  // Expenses whose payer and/or split still reference a member who was
  // later removed from the trip — each one already gets its own inline
  // warning below, this just offers a way to work through all of them
  // instead of hunting each one down individually. Scoped to expenses the
  // current user can actually edit (same rule as the per-row swipe-to-edit
  // gate) — including ones only an admin/original author can fix would
  // let this button open an edit that the backend silently rejects.
  const affectedExpenseIds = trip
    ? activeTripExpenses
        .filter(
          (e) =>
            (isAdmin || e.createdByUserId === userId) &&
            (!trip.memberIds.includes(e.paidBy) ||
              e.splitMemberIds.some((id) => !trip.memberIds.includes(id)))
        )
        .map((e) => e.id)
    : [];

  return (
    <>
      {trip?.frozen && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#EF4444',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '14px',
          }}
        >
          <IconAlertCircle size={16} /> This trip is currently locked / frozen by Superadmin. Modifications are disabled.
        </div>
      )}

      {activeTripExpenseCount > 0 && (
        <div className="expense-stat-strip">
          <div className="expense-stat">
            <span className="expense-stat-label">Total spent</span>
            <span className="expense-stat-value">{formatAmount(totalSpent, currencySymbol)}</span>
          </div>
          <div className="expense-stat">
            <span className="expense-stat-label">Daily average</span>
            <span className="expense-stat-value">{formatAmount(averageCost, currencySymbol)}</span>
          </div>
          {topCategoryName && (
            <div className="expense-stat">
              <span className="expense-stat-label">Top category</span>
              <span className="expense-stat-value">{topCategoryName}{typeof topCategoryPercentage === 'number' ? ` · ${Math.round(topCategoryPercentage)}%` : ''}</span>
            </div>
          )}
        </div>
      )}

      {affectedExpenseIds.length > 1 && (
        <button
          type="button"
          className="glass-card expense-review-banner"
          onClick={() => onReviewAffected(affectedExpenseIds)}
        >
          <IconAlertCircle size={16} className="icon-sm" />
          <span className="expense-review-banner-text">
            {affectedExpenseIds.length} expenses need review after a member was removed
          </span>
          <span className="expense-review-banner-cta">Review them →</span>
        </button>
      )}

      {/* Search & Filters -- always visible; previously hidden behind an
          undiscoverable pull-down-from-top gesture with no visual hint it
          existed, which read as "filtering doesn't work". */}
      {activeTripExpenseCount > 0 && (
        <div ref={filtersRef} className="expense-filters">
          <div className="expense-search-row">
            <div className="input-icon-wrap expense-search-wrap">
              <IconSearch size={16} className="icon-sm" />
              <input
                type="text"
                className="input-field expense-search-input"
                placeholder="Search expenses..."
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
            <button
              type="button"
              className="expense-filters-btn"
              onClick={onOpenFilters}
              aria-label="Advanced filters"
              title="Advanced filters"
            >
              <IconFilter size={16} className="icon-sm" />
              Filters
              {hasActiveFilters && <span className="expense-filters-btn-badge" aria-hidden="true" />}
            </button>
          </div>

          {/* Horizontal quick filter pills */}
          <div className="filter-chips-collapse expanded">
            <div className="filter-chips-track" role="region" aria-label="Quick filters">
              <button
                type="button"
                className={`filter-chip ${isAllActive ? 'active' : ''}`}
                onClick={onClearFilters}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`filter-chip ${filterCategory === c.id ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic('light');
                    setFilterCategory(filterCategory === c.id ? '' : c.id);
                  }}
                >
                  <CategoryIcon categoryId={c.id} fallbackEmoji={c.icon} size={13} />
                  <span>{c.name}</span>
                </button>
              ))}

              {activeTripMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`filter-chip ${filterMember === m.id ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic('light');
                    setFilterMember(filterMember === m.id ? '' : m.id);
                  }}
                >
                  <ExpenseAvatar member={m} size={15} />
                  <span>{m.name}</span>
                </button>
              ))}

              <button
                type="button"
                className={`filter-chip ${filterDateFrom || filterDateTo ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic('light');
                  setShowDateFilter(!showDateFilter);
                }}
              >
                <IconCalendar size={13} />
                <span>Dates</span>
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="filter-chip filter-chip-clear"
                  onClick={onClearFilters}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {showDateFilter && (
            <div className="date-filter-panel glass-card" style={{ marginTop: '8px', padding: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  className="input-field"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  style={{ fontSize: '12px', padding: '6px' }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>to</span>
                <input
                  type="date"
                  className="input-field"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  style={{ fontSize: '12px', padding: '6px' }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clean Transaction Feed with Date Dividers */}
      {filteredExpenses.length === 0 ? (
        <div className="glass-card ledger-empty" style={{ borderStyle: 'dashed' }}>
          <div className="ledger-rule" />
          <div className="ledger-rule" />
          <div className="ledger-empty-prompt">
            <span className="ledger-pencil" aria-hidden="true">
              <IconEdit size={14} className="icon-sm" />
            </span>
            <p>
              {hasActiveFilters ? 'Nothing matches those filters — try clearing them.' : 'Nothing logged yet. Add the first line to start the ledger.'}
            </p>
          </div>
          <div className="ledger-rule" />
          <div className="ledger-rule" />
        </div>
      ) : (
        <>
          {dayGroups.length > DEFAULT_EXPANDED_DAYS && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={toggleAllDays}
                aria-label={allDaysExpanded ? 'Collapse all days' : 'Expand all days'}
                title={allDaysExpanded ? 'Collapse all days' : 'Expand all days'}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '28px', flexShrink: 0,
                  background: allDaysExpanded ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-sm)',
                  color: allDaysExpanded ? 'var(--primary-accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
              >
                <IconChevronRight
                  size={14}
                  className="icon-sm"
                  style={{ transition: 'transform 0.2s ease', transform: allDaysExpanded ? 'rotate(-90deg)' : 'rotate(90deg)' }}
                />
              </button>
            </div>
          )}
          {dayGroups.map((group, groupIdx) => {
            const groupDate = new Date(`${group.date}T00:00:00`);
            const dateLabel = Number.isNaN(groupDate.getTime())
              ? group.date
              : groupDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
            const dayNum = trip?.startDate ? tripDayNumber(trip.startDate, group.date) : null;
            const groupLabel = dayNum ? `Day ${dayNum} · ${dateLabel}` : dateLabel;
            const groupTotal = group.expenses.reduce((sum, e) => sum + e.amount, 0);
            const collapsed = isDayCollapsed(group.date, groupIdx);

            return (
              <div key={group.date} className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '10px' }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleDay(group.date, groupIdx)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDay(group.date, groupIdx); } }}
                  style={{
                    position: 'sticky', top: 0, zIndex: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '10px', padding: '10px 14px', cursor: 'pointer',
                    background: 'var(--bg-surface-hover)',
                    borderBottom: collapsed ? 'none' : '1.5px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <IconChevronRight
                      size={15}
                      className="icon-sm"
                      style={{ transition: 'transform 0.2s ease', transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {groupLabel}
                    </span>
                  </div>
                  {collapsed && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {group.expenses.length} · {formatAmount(groupTotal, currencySymbol)}
                    </span>
                  )}
                </div>

                {!collapsed && group.expenses.map((exp, idx) => {
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

                  // Shown only when it differs from the full amount --
                  // otherwise it's just noise repeating the line total.
                  const myShare = myMemberId ? exp.resolvedShares[myMemberId] : undefined;
                  const showMyShare = typeof myShare === 'number' && Math.abs(myShare - exp.amount) > 0.01;

                  const reviewMessage = isPayerDeleted && hasDeletedParticipants
                    ? 'Payer and a split member were removed — reassign the payer and update the split.'
                    : isPayerDeleted
                      ? 'Payer was removed — assign a new payer.'
                      : 'A split member was removed — update the split.';

                  return (
                    <div
                      key={exp.id}
                      aria-hidden={isPending}
                      className="expense-item-cascade"
                      style={{
                        borderBottom: idx < group.expenses.length - 1 ? '1.5px dashed var(--border-color)' : 'none',
                        opacity: isPending ? 0.35 : 1,
                        pointerEvents: isPending ? 'none' : undefined,
                        transition: 'opacity 0.25s ease',
                        // Skip layout/paint for off-screen rows -- cheap
                        // substitute for list virtualization at this scale.
                        contentVisibility: 'auto',
                        containIntrinsicSize: '0 84px',
                        ['--item-index' as string]: Math.min(idx, 15),
                      }}
                    >
                      <ConditionalSwipe
                        enabled={canManage}
                        onDelete={() => onDelete(exp)}
                        onEdit={exp.title.startsWith('Settlement:') ? undefined : () => onEdit(exp)}
                      >
                        <div
                          style={{
                            display: 'flex', flexDirection: 'column', gap: '6px',
                            padding: '12px 14px',
                            borderLeft: `3px solid ${needsReview ? 'var(--color-warning)' : getCatColor(exp.category, 0)}`,
                            background: needsReview ? 'rgba(185, 138, 62, 0.07)' : undefined,
                          }}
                        >
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                            onClick={() => { triggerHaptic('light'); onReview(exp); }}
                          >
                            <CategoryIcon categoryId={cat?.id || ''} fallbackEmoji={cat?.icon || '🏷️'} size={15} />
                            <h4 style={{ flex: 1, minWidth: 0, fontSize: '15px', lineHeight: 1.3, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px', viewTransitionName: activeTransitionSourceId === exp.id ? 'expense-shared-title' : undefined }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.title}</span>
                              {(exp.receiptImage || exp.receiptPath) && (
                                <span style={{ fontSize: '11px', flexShrink: 0, opacity: 0.85 }} title="Photo receipt attached">📸</span>
                              )}
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                              <span className="money" style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                {formatAmount(exp.amount, currencySymbol)}
                              </span>
                              {showMyShare && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                  your share {formatAmount(myShare as number, currencySymbol)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', minWidth: 0 }}
                            onClick={() => { triggerHaptic('light'); onReview(exp); }}
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
                          {needsReview && (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              fontSize: '12px', fontWeight: 500, color: 'var(--color-warning-text)',
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
            );
          })}
        </>
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
