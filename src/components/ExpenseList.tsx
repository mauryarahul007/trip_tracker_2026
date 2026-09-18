import { useState, useEffect, useRef, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { Category, Expense, Member, Trip } from '../types';
import { IconSearch, IconEdit, IconAlertCircle, IconClose, IconCalendar, IconChevronRight, IconFilter } from './Icons';
import { SwipeableRow } from './SwipeableRow';
import { CategoryIcon } from './CategoryIcon';
import { getCurrencySymbol, formatAmount } from '../utils/currency';
import { convertCurrency } from '../utils/currencyConverter';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { triggerHaptic } from '../utils/haptics';
import { tripDayNumber } from '../utils/dateRange';
import { usePullToRefresh } from '../utils/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { useTripStore } from '../store/tripStore';
import { useCompactLedgerView } from '../hooks/useCompactLedgerView';
import { useHistoryBack } from '../utils/useHistoryBack';
import { useEscapeKey } from '../utils/useEscapeKey';
import { NextUpTravelCapsule } from './NextUpTravelCapsule';
import { SettlementHistorySection } from './SettlementHistorySection';

// Swipe-to-delete is a supplement to the explicit trash button — skip
// wrapping the row in it at all when the viewer isn't allowed to delete.
function ConditionalSwipe({ enabled, onDelete, onEdit, children }: { enabled: boolean; onDelete: () => void; onEdit?: () => void; children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;
  return <SwipeableRow onDelete={onDelete} onEdit={onEdit} plain>{children}</SwipeableRow>;
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
  setFilterRelation?: (v: '' | 'paidByMe' | 'involvesMe') => void;
  filterLocation: string;
  myMemberId: string | null;
  onClearFilters: () => void;
  onOpenFilters: () => void;
  setFilterAmountMin?: (v: string) => void;

  onReview: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  isAdmin: boolean;
  userId: string | null;
  activeTransitionSourceId?: string | null;
  onAddExpense?: (template?: { title?: string; category?: string }) => void;
  onCloneLastExpense?: () => void;
  onOpenSmartQuickAdd?: (autoListen?: boolean) => void;
  dirtyExpenseIds?: Set<string>;
  conflictExpenseIds?: Set<string>;
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
  setFilterRelation,
  filterLocation,
  myMemberId,
  onClearFilters,
  onOpenFilters,
  setFilterAmountMin,
  onReview,
  onEdit,
  onDelete,
  isAdmin,
  userId,
  activeTransitionSourceId,
  onAddExpense,
  onCloneLastExpense,
  onOpenSmartQuickAdd,
  dirtyExpenseIds,
  conflictExpenseIds,
}: Props) {
  const currencySymbol = getCurrencySymbol(trip?.baseCurrency || '');

  // The real scroll container is the ancestor `.tab-pane` (owned by
  // App.tsx), not this component's own root -- resolved once on mount via
  // `.closest` so this stays a self-contained addition, no new prop/ref
  // threaded through the 2000+ line App.tsx.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    paneRef.current = wrapperRef.current?.closest<HTMLElement>('.tab-pane') ?? null;
  }, []);
  const refreshActiveTripExpenses = useTripStore((s) => s.refreshActiveTripExpenses);
  const isFeatureEnabled = useTripStore((s) => s.isFeatureEnabled);
  const compactLedgerPref = useCompactLedgerView();
  const compactLedgerActive = isFeatureEnabled('enableCompactLedgerView', { tripId: trip?.id }) && compactLedgerPref;
  const ptrIndicatorRef = useRef<HTMLDivElement>(null);
  const pullToRefresh = usePullToRefresh(paneRef, ptrIndicatorRef, () => refreshActiveTripExpenses());
  const expensesLoadingTripId = useTripStore((s) => s.expensesLoadingTripId);
  const isLoadingExpenses = !!trip && expensesLoadingTripId === trip.id;
  const [toggledCurrencyExpenseIds, setToggledCurrencyExpenseIds] = useState<Record<string, boolean>>({});

  const handleToggleExpenseCurrency = (e: React.MouseEvent, expenseId: string) => {
    e.stopPropagation();
    triggerHaptic('light');
    setToggledCurrencyExpenseIds((prev) => ({
      ...prev,
      [expenseId]: !prev[expenseId],
    }));
  };

  const filtersRef = useRef<HTMLDivElement>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  useHistoryBack(showDateFilter, () => setShowDateFilter(false));
  useEscapeKey(showDateFilter, () => setShowDateFilter(false));
  const isAllActive = !filterCategory && !filterMember && !filterDateFrom && !filterDateTo && !filterAmountMin && !filterAmountMax && !filterRelation && !filterLocation;

  // Stats + quick-filter chips default collapsed behind one visible toggle
  // instead of stacking unconditionally above the list -- a trip with a
  // handful of expenses used to open to more controls than content. Forced
  // open whenever a filter is already active so the active state (and its
  // clear button) is never hidden from the person who set it.
  const [showChrome, setShowChrome] = useState(false);
  const chromeExpanded = showChrome || hasActiveFilters;

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
  const isActualExpense = (e: Expense) => !e.isSettlement && !e.title.startsWith('Settlement:');

  const groupByDay = (list: Expense[]) =>
    list.reduce<{ date: string; expenses: Expense[] }[]>((groups, exp) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === exp.date) {
        lastGroup.expenses.push(exp);
      } else {
        groups.push({ date: exp.date, expenses: [exp] });
      }
      return groups;
    }, []);

  // Settlements get their own section below the day-grouped expenses (see
  // "Settlements" render block) instead of being mixed into a day's
  // expense group -- keeps both lists homogeneous.
  const actualDisplayed = displayedExpenses.filter(isActualExpense);
  const settlementsDisplayed = displayedExpenses.filter((e) => !isActualExpense(e));
  const dayGroups = groupByDay(actualDisplayed);
  const settlementGroups = groupByDay(settlementsDisplayed);

  const avgDailySpend = useMemo(() => {
    const dailyTotals = dayGroups
      .map((g) => g.expenses.reduce((sum, e) => sum + e.amount, 0))
      .filter((tot) => tot > 0);
    if (dailyTotals.length === 0) return 0;
    const total = dailyTotals.reduce((acc, t) => acc + t, 0);
    return total / dailyTotals.length;
  }, [dayGroups]);

  // Every day-group starts collapsed on entering the tab to keep
  // the ledger clean and high-level; days expand on tap or toggle.
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

  // Shared row renderer -- used by both the expense day-groups and the
  // Settlements day-groups below, so swipe/avatar/currency-toggle/needs-
  // review markup isn't duplicated between the two sections.
  const renderExpenseRow = (exp: Expense, idx: number, siblingCount: number) => {
    const isPending = exp.id === pendingDeleteId;
    const isDirty = dirtyExpenseIds?.has(exp.id) ?? false;
    const isConflict = conflictExpenseIds?.has(exp.id) ?? false;
    const canManage = isAdmin || exp.createdByUserId === userId;
    const isPayerDeleted = trip ? !trip.memberIds.includes(exp.paidBy) : false;
    const hasDeletedParticipants = trip ? exp.splitMemberIds.some((id) => !trip.memberIds.includes(id)) : false;
    const needsReview = isPayerDeleted || hasDeletedParticipants;
    const payerMember = members[exp.paidBy];
    const cat = categories.find((c) => c.id === exp.category);
    const splitMembers = exp.splitMemberIds.map((id) => ({ id, member: members[id] }));
    const visibleSplitMembers = splitMembers.slice(0, 4);
    const overflowSplitCount = splitMembers.length - visibleSplitMembers.length;
    const categoryAccentColor = needsReview ? 'var(--color-warning)' : getCatColor(exp.category, 0);

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
          borderBottom: idx < siblingCount - 1 ? '1.5px dashed var(--border-color)' : 'none',
          opacity: isPending ? 0.35 : 1,
          pointerEvents: isPending ? 'none' : undefined,
          transition: 'opacity 0.25s ease',
          // Skip layout/paint for off-screen rows -- cheap
          // substitute for list virtualization at this scale.
          contentVisibility: 'auto',
          containIntrinsicSize: compactLedgerActive ? '0 62px' : '0 84px',
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
              display: 'flex', flexDirection: 'column', gap: compactLedgerActive ? '4px' : '6px',
              padding: compactLedgerActive ? '7px 12px' : '12px 14px',
              borderLeft: `3.5px solid ${categoryAccentColor}`,
              background: needsReview ? 'rgba(185, 138, 62, 0.07)' : undefined,
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
              onClick={() => { triggerHaptic('light'); onReview(exp); }}
            >
              <div
                style={{
                  width: compactLedgerActive ? '24px' : '32px',
                  height: compactLedgerActive ? '24px' : '32px',
                  borderRadius: isFeatureEnabled('enableCategoryColorRings', { tripId: trip?.id }) ? '10px' : '8px',
                  background: isFeatureEnabled('enableCategoryColorRings', { tripId: trip?.id })
                    ? `linear-gradient(135deg, ${categoryAccentColor}2e, ${categoryAccentColor}0d)`
                    : `${categoryAccentColor}18`,
                  border: isFeatureEnabled('enableCategoryColorRings', { tripId: trip?.id })
                    ? `1.5px solid ${categoryAccentColor}55`
                    : 'none',
                  boxShadow: isFeatureEnabled('enableCategoryColorRings', { tripId: trip?.id })
                    ? `0 0 0 2px ${categoryAccentColor}22, 0 3px 8px ${categoryAccentColor}18`
                    : undefined,
                  color: categoryAccentColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
              >
                <CategoryIcon categoryId={cat?.id || ''} fallbackEmoji={cat?.icon || '🏷️'} size={compactLedgerActive ? 13 : 16} />
              </div>
              <h4 style={{ flex: 1, minWidth: 0, fontSize: '15px', lineHeight: 1.3, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px', viewTransitionName: activeTransitionSourceId === exp.id ? 'expense-shared-title' : undefined }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.title}</span>
                {(exp.receiptImage || exp.receiptPath) && (
                  <span style={{ fontSize: '11px', flexShrink: 0, opacity: 0.85 }} title="Photo receipt attached">📸</span>
                )}
                {exp.disputedAt && (
                  <span style={{ fontSize: '11px', flexShrink: 0 }} title={exp.disputeNote ? `Flagged: ${exp.disputeNote}` : 'Flagged as disputed'} aria-label="Disputed">🚩</span>
                )}
                {exp.approvalStatus === 'pending_approval' && (
                  <span style={{ fontSize: '11px', flexShrink: 0 }} title="Pending approval — excluded from balances until a second member approves it" aria-label="Pending approval">⏳</span>
                )}
                {isConflict ? (
                  <span style={{ fontSize: '10px', flexShrink: 0, opacity: 0.9 }} title="Sync conflict — choose which version to keep" aria-label="Sync conflict">⚠️</span>
                ) : isDirty ? (
                  <span style={{ fontSize: '10px', flexShrink: 0, opacity: 0.8 }} title="Pending sync" aria-label="Pending sync">🔄</span>
                ) : null}
              </h4>
              {(() => {
                const isForeign = Boolean(
                  exp.currency &&
                  trip?.baseCurrency &&
                  exp.currency.trim().toUpperCase() !== trip.baseCurrency.trim().toUpperCase()
                );
                const isShowingForeign = isForeign && !!toggledCurrencyExpenseIds[exp.id];
                const convertedForeign = isForeign
                  ? convertCurrency(exp.amount, trip?.baseCurrency || 'INR', exp.currency)
                  : null;
                const displayAmount = isShowingForeign && convertedForeign
                  ? convertedForeign.convertedAmount
                  : exp.amount;
                const displaySymbol = isShowingForeign
                  ? getCurrencySymbol(exp.currency)
                  : currencySymbol;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="money" style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {formatAmount(displayAmount, displaySymbol)}
                      </span>
                      {isForeign && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleExpenseCurrency(e, exp.id)}
                          aria-label={`Switch between ${trip?.baseCurrency} and ${exp.currency}`}
                          title={`Logged in ${exp.currency}. Tap to toggle between ${trip?.baseCurrency} and ${exp.currency}`}
                          style={{
                            background: isShowingForeign ? 'var(--primary-accent)' : 'rgba(255,255,255,0.08)',
                            color: isShowingForeign ? '#fff' : 'var(--text-muted)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            cursor: 'pointer',
                            lineHeight: 1.2,
                          }}
                        >
                          {isShowingForeign ? exp.currency : `⇄ ${exp.currency}`}
                        </button>
                      )}
                    </div>
                    {showMyShare && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        your share {formatAmount(myShare as number, currencySymbol)}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
            {(() => {
              const multiPayersList = exp.paidByShares && Object.keys(exp.paidByShares).length > 1
                ? Object.entries(exp.paidByShares).map(([mId, amt]) => ({
                    id: mId,
                    member: members[mId],
                    amount: amt,
                  }))
                : null;

              const multiPayersTitle = multiPayersList
                ? `Paid jointly by: ${multiPayersList.map((p) => `${p.member?.name || 'Removed'}: ${currencySymbol} ${p.amount.toFixed(2)}`).join(', ')}`
                : `Paid by ${payerMember?.name || 'a removed member'}`;

              return (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', minWidth: 0 }}
                  onClick={() => { triggerHaptic('light'); onReview(exp); }}
                  title={multiPayersTitle}
                >
                  {multiPayersList ? (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexShrink: 0 }}>
                        {multiPayersList.slice(0, 2).map((p, pIdx) => (
                          <div key={p.id} style={{ marginLeft: pIdx === 0 ? 0 : '-7px' }}>
                            <ExpenseAvatar member={p.member} size={22} muted={!p.member} />
                          </div>
                        ))}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '5px' }}>
                        {multiPayersList.length} payers
                      </span>
                    </div>
                  ) : (
                    <ExpenseAvatar member={payerMember} size={22} muted={isPayerDeleted} />
                  )}
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
          );
        })()}
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
  };

  // Shared day-card renderer -- used for both the expense day-groups and
  // the Settlements day-groups. `collapseKeyPrefix` keeps the two
  // sections' expand/collapse state independent even when a settlement
  // happened on the same date as an expense.
  const renderDayGroupCard = (
    group: { date: string; expenses: Expense[] },
    groupIdx: number,
    opts?: { collapseKeyPrefix?: string; amountSuffix?: string; showBurn?: boolean }
  ) => {
    const collapseKeyPrefix = opts?.collapseKeyPrefix ?? '';
    const collapseKey = `${collapseKeyPrefix}${group.date}`;
    const groupDate = new Date(`${group.date}T00:00:00`);
    const dateLabel = Number.isNaN(groupDate.getTime())
      ? group.date
      : groupDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
    const dayNum = trip?.startDate ? tripDayNumber(trip.startDate, group.date) : null;
    const groupLabel = dayNum ? `Day ${dayNum} · ${dateLabel}` : dateLabel;
    const groupTotal = group.expenses.reduce((sum, e) => sum + e.amount, 0);
    const collapsed = isDayCollapsed(collapseKey, groupIdx);
    // Burn indicator strictly measures real expense burn rate against daily averages (never debt settlements)
    const isHighBurn = (opts?.showBurn ?? false) && avgDailySpend > 0 && groupTotal > avgDailySpend * 1.5 && group.expenses.length > 1;
    const isSticky = isFeatureEnabled('enableStickyDayHeaders', { tripId: trip?.id });

    return (
      <div
        key={collapseKey}
        className="glass-card"
        style={{
          padding: 0,
          overflow: isSticky ? 'visible' : 'hidden',
          marginBottom: '10px',
          borderRadius: '12px',
        }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => toggleDay(collapseKey, groupIdx)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDay(collapseKey, groupIdx); } }}
          style={{
            position: 'sticky', top: 0, zIndex: isSticky ? 4 : 2,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '10px', padding: '10px 14px', cursor: 'pointer',
            background: isSticky ? 'var(--bg-header-glass, rgba(28, 33, 40, 0.95))' : 'var(--bg-surface-hover)',
            backdropFilter: isSticky ? 'blur(12px)' : undefined,
            WebkitBackdropFilter: isSticky ? 'blur(12px)' : undefined,
            boxShadow: isSticky ? '0 2px 8px rgba(0, 0, 0, 0.15)' : undefined,
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
            borderBottomLeftRadius: collapsed ? '12px' : 0,
            borderBottomRightRadius: collapsed ? '12px' : 0,
            borderBottom: collapsed ? 'none' : '1.5px solid var(--border-color)',
            transition: 'background 0.2s ease, border-radius 0.2s ease',
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
            {isSticky && (
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-surface)',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  flexShrink: 0,
                }}
              >
                {group.expenses.length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {isHighBurn && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: 'var(--color-danger)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                High burn
              </span>
            )}
            <span className="money" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {formatAmount(groupTotal, currencySymbol)}{opts?.amountSuffix ? ` ${opts.amountSuffix}` : ''}
            </span>
          </div>
        </div>

        {!collapsed && group.expenses.map((exp, idx) => renderExpenseRow(exp, idx, group.expenses.length))}
      </div>
    );
  };

  return (
    <div ref={wrapperRef}>
      <PullToRefreshIndicator ref={ptrIndicatorRef} state={pullToRefresh} />
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
            {onOpenSmartQuickAdd && isFeatureEnabled('enableVoiceInput') && (
              <button
                type="button"
                className="expense-filters-btn"
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenSmartQuickAdd(true);
                }}
                aria-label="3-Second Voice Quick-Add expense"
                title="3-Second Voice Quick-Add expense"
                style={{
                  padding: '0 0.65rem',
                  color: 'var(--color-danger, #ef4444)',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600,
                }}
              >
                <span aria-hidden="true" style={{ fontSize: '13px' }}>🎙️</span>
                <span>Voice</span>
              </button>
            )}
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

          <button
            type="button"
            className="expense-chrome-toggle"
            onClick={() => {
              triggerHaptic('light');
              setShowChrome((v) => !v);
            }}
            aria-expanded={chromeExpanded}
          >
            <span className="expense-chrome-toggle-label">
              <IconChevronRight
                size={13}
                className="icon-sm"
                style={{ transition: 'transform 0.2s ease', transform: chromeExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              />
              {chromeExpanded ? 'Hide stats & quick filters' : 'Stats & quick filters'}
              {hasActiveFilters && <span className="expense-filters-btn-badge" aria-hidden="true" style={{ position: 'static' }} />}
            </span>
            <span className="expense-chrome-toggle-total money">{formatAmount(totalSpent, currencySymbol)} total</span>
          </button>

          {chromeExpanded && (
            <>
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

              {/* Horizontal quick filter pills */}
              <div className="filter-chips-collapse expanded scroll-fade-mask" data-no-tab-swipe="true">
                <div className="filter-chips-track" role="region" aria-label="Quick filters" data-no-tab-swipe="true">
                  <button
                    type="button"
                    className={`filter-chip ${isAllActive ? 'active' : ''}`}
                    onClick={onClearFilters}
                  >
                    All
                  </button>
                  {onCloneLastExpense && (
                    <button
                      type="button"
                      className="filter-chip"
                      onClick={() => {
                        triggerHaptic('light');
                        onCloneLastExpense();
                      }}
                    >
                      Copy last
                    </button>
                  )}
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
            </>
          )}
        </div>
      )}

      {/* Imminent Boarding / Travel / Stay Dynamic Capsule */}
      {trip &&
        isFeatureEnabled('enableNextUpCapsule', { tripId: trip.id }) &&
        isFeatureEnabled('enableTravelPasses', { tripId: trip.id }) && (
          <NextUpTravelCapsule
            trip={trip}
            passes={trip.passes}
          />
        )}

      {/* Always-Accessible Quick-Filter Chip Bar */}
      {isFeatureEnabled('enableExpenseQuickFilterChips', { tripId: trip?.id }) && (
        <div
          className="filter-chips-track scroll-fade-mask"
          data-no-tab-swipe="true"
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            padding: '4px 2px 10px 2px',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <button
            type="button"
            className={`filter-chip ${isAllActive ? 'active' : ''}`}
            onClick={onClearFilters}
            style={{ flexShrink: 0 }}
          >
            All ({activeTripExpenseCount})
          </button>
          {myMemberId && (
            <>
              <button
                type="button"
                className={`filter-chip ${filterRelation === 'involvesMe' ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic('light');
                  setFilterRelation?.(filterRelation === 'involvesMe' ? '' : 'involvesMe');
                }}
                style={{ flexShrink: 0 }}
              >
                My Expenses
              </button>
              <button
                type="button"
                className={`filter-chip ${filterRelation === 'paidByMe' ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic('light');
                  setFilterRelation?.(filterRelation === 'paidByMe' ? '' : 'paidByMe');
                }}
                style={{ flexShrink: 0 }}
              >
                Paid by Me
              </button>
            </>
          )}
          {activeTripExpenses.some((e) => e.approvalStatus === 'pending_approval') && (
            <button
              type="button"
              className="filter-chip"
              onClick={() => {
                triggerHaptic('light');
                setSearch('pending_approval');
              }}
              style={{
                flexShrink: 0,
                borderColor: 'rgba(245, 158, 11, 0.4)',
                color: 'var(--color-warning-text)',
                background: 'rgba(245, 158, 11, 0.08)',
              }}
            >
              Pending ⏳
            </button>
          )}
          {categories.slice(0, 4).map((c) => (
            <button
              key={c.id}
              type="button"
              className={`filter-chip ${filterCategory === c.id ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setFilterCategory(filterCategory === c.id ? '' : c.id);
              }}
              style={{ flexShrink: 0 }}
            >
              <CategoryIcon categoryId={c.id} fallbackEmoji={c.icon} size={13} />
              <span>{c.name}</span>
            </button>
          ))}
          {(() => {
            const thresholdAmt = trip?.baseCurrency === 'INR' ? '1000' : '50';
            const isHighActive = filterAmountMin === thresholdAmt;
            return (
              <button
                type="button"
                className={`filter-chip ${isHighActive ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic('light');
                  setFilterAmountMin?.(isHighActive ? '' : thresholdAmt);
                }}
                style={{ flexShrink: 0 }}
              >
                &gt; {currencySymbol}{thresholdAmt}
              </button>
            );
          })()}
          {hasActiveFilters && (
            <button
              type="button"
              className="filter-chip filter-chip-clear"
              onClick={onClearFilters}
              style={{ flexShrink: 0 }}
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Clean Transaction Feed with Date Dividers or Quick Starters */}
      {filteredExpenses.length === 0 && isLoadingExpenses ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: '68px', borderRadius: '14px', opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      ) : filteredExpenses.length === 0 ? (
        hasActiveFilters ? (
          <div className="glass-card ledger-empty" style={{ borderStyle: 'dashed' }}>
            <div className="ledger-rule" />
            <div className="ledger-rule" />
            <div className="ledger-empty-prompt">
              <span className="ledger-pencil" aria-hidden="true">
                <IconEdit size={14} className="icon-sm" />
              </span>
              <p>Nothing matches those filters — try clearing them.</p>
              <button
                type="button"
                className="secondary-btn"
                style={{ marginTop: '8px', padding: '6px 14px', fontSize: '12px' }}
                onClick={onClearFilters}
              >
                Clear all filters
              </button>
            </div>
            <div className="ledger-rule" />
            <div className="ledger-rule" />
          </div>
        ) : (
          <div
            className="glass-card"
            style={{
              padding: '28px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              borderRadius: '20px',
              background: 'linear-gradient(180deg, var(--bg-surface) 0%, rgba(63, 203, 189, 0.05) 100%)',
              border: '1.5px solid var(--border-color)',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'rgba(63, 203, 189, 0.12)',
                color: 'var(--primary-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                border: '1px solid rgba(63, 203, 189, 0.25)',
              }}
            >
              🧭
            </div>

            <div>
              <h3 style={{ fontSize: '16.5px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                Start Your Expedition Ledger
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, maxWidth: '300px', lineHeight: 1.4 }}>
                Log your first group expense or tap a quick template below:
              </p>
            </div>

            {/* Quick Starter Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                width: '100%',
                maxWidth: '360px',
              }}
            >
              {[
                { label: 'Flights / Transit', icon: '✈️', title: 'Flight Tickets', catKeyword: 'travel' },
                { label: 'Stay & Hotel', icon: '🏨', title: 'Hotel Booking', catKeyword: 'stay' },
                { label: 'Squad Meal', icon: '🍽️', title: 'Group Dinner', catKeyword: 'food' },
                { label: 'Activities & Entry', icon: '🎟️', title: 'Sightseeing Passes', catKeyword: 'activities' },
              ].map((template) => {
                const matchedCat = categories.find((c) =>
                  c.id.toLowerCase().includes(template.catKeyword) || c.name.toLowerCase().includes(template.catKeyword)
                );
                return (
                  <button
                    key={template.label}
                    type="button"
                    className="quick-starter-btn"
                    onClick={() => {
                      triggerHaptic('light');
                      onAddExpense?.({
                        title: template.title,
                        category: matchedCat?.id || categories[0]?.id || '',
                      });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '11px 12px',
                      background: 'var(--bg-surface)',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{template.icon}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {template.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
              {onOpenSmartQuickAdd && isFeatureEnabled('enableVoiceInput') && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    triggerHaptic('medium');
                    onOpenSmartQuickAdd(true);
                  }}
                  style={{
                    padding: '10px 18px',
                    fontSize: '13px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    color: 'var(--color-danger, #ef4444)',
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                    background: 'rgba(239, 68, 68, 0.06)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🎙️</span>
                  <span>Speak Expense</span>
                </button>
              )}
              {onAddExpense && (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    triggerHaptic('light');
                    onAddExpense();
                  }}
                  style={{
                    padding: '10px 22px',
                    fontSize: '13px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                  }}
                >
                  + Log Custom Expense
                </button>
              )}
            </div>
          </div>
        )
      ) : (
        <>
          {dayGroups.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {dayGroups.length} {dayGroups.length === 1 ? 'day' : 'days'} {avgDailySpend > 0 ? `· Avg ${formatAmount(avgDailySpend, currencySymbol)}/day` : ''}
              </span>
              {dayGroups.length > 1 && (
                <button
                  type="button"
                  onClick={toggleAllDays}
                  aria-label={allDaysExpanded ? 'Collapse all days' : 'Expand all days'}
                  title={allDaysExpanded ? 'Collapse all days' : 'Expand all days'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: allDaysExpanded ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    color: allDaysExpanded ? 'var(--primary-accent)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease, color 0.15s ease',
                  }}
                >
                  <IconChevronRight
                    size={12}
                    className="icon-sm"
                    style={{ transition: 'transform 0.2s ease', transform: allDaysExpanded ? 'rotate(-90deg)' : 'rotate(90deg)' }}
                  />
                  <span>{allDaysExpanded ? 'Collapse All' : 'Expand All'}</span>
                </button>
              )}
            </div>
          )}
          {dayGroups.map((group, groupIdx) => renderDayGroupCard(group, groupIdx, { showBurn: true }))}

          {settlementGroups.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 10px', padding: '0 4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Settlements · {settlementsDisplayed.length}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {formatAmount(settlementsDisplayed.reduce((sum, e) => sum + e.amount, 0), currencySymbol)} settled
                </span>
              </div>
              {settlementGroups.map((group, groupIdx) =>
                renderDayGroupCard(group, groupIdx, { collapseKeyPrefix: 'settlement:', amountSuffix: 'settled' })
              )}
              {isFeatureEnabled('enableSettlementHistory', { tripId: trip?.id }) && (
                <SettlementHistorySection
                  settlementExpenses={settlementsDisplayed}
                  members={members}
                  currencySymbol={currencySymbol}
                />
              )}
            </>
          )}
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

    </div>
  );
}
