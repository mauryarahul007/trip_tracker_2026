import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Category, Expense, Member, Trip } from '../types';
import { IconSearch, IconEdit, IconTrash, IconAlertCircle, IconClose, IconCalendar } from './Icons';
import { SwipeableRow } from './SwipeableRow';
import { CategoryIcon } from './CategoryIcon';
import { getCurrencySymbol } from '../utils/currency';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { usePrivacyStore, formatMaskedAmount } from '../store/privacyStore';
import { triggerHaptic } from '../utils/haptics';

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
        loading="lazy"
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
  activeTripExpenses,
  onReviewAffected,
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
  const isBlindMode = usePrivacyStore((s) => s.isBlindMode);

  const filtersRef = useRef<HTMLDivElement>(null);
  const [revealOnScroll, setRevealOnScroll] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const isAllActive = !filterCategory && !filterMember && !filterDateFrom && !filterDateTo;
  const PULL_REVEAL_THRESHOLD = 36;

  // Stable state is hidden. Chips only reveal via an actual pull-down
  // gesture starting from the very top of the list (like Mail's
  // pull-to-reveal search bar) — not from scroll position or direction
  // alone, which kept re-showing on ordinary scroll jitter/momentum.
  // Scrolling away from the top always collapses them again.
  useEffect(() => {
    // Scroll events on an overflow:auto element don't bubble, so a listener
    // on an ancestor only sees them via the capture phase — mirroring the
    // header-collapse scroll listener in nativeShell.ts, which uses this
    // same document.body capture-phase pattern for the same reason.
    const handleScroll = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains('tab-pane')) return;
      if (filtersRef.current && !target.contains(filtersRef.current)) return;
      if (target.scrollTop > 15) setRevealOnScroll(false);
    };

    const atTopOfList = () => {
      // All tabs stay mounted (App.tsx toggles them via display:none, not
      // unmount), so without this check the Expenses tab-pane's scrollTop
      // — 0 whenever that tab just hasn't been scrolled, regardless of
      // which tab is actually on screen — would read as "at top" even
      // while a completely different tab is visible, making the
      // preventDefault() below hijack scroll gestures on Members/
      // Analytics/Settings too.
      const scrollParent = filtersRef.current?.closest('.tab-pane') as HTMLElement | null;
      if (!scrollParent || scrollParent.style.display === 'none') return false;
      return scrollParent.scrollTop <= 0;
    };

    let pullStartX: number | null = null;
    let pullStartY: number | null = null;
    const startPull = (x: number, y: number) => {
      const atTop = atTopOfList();
      pullStartX = atTop ? x : null;
      pullStartY = atTop ? y : null;
    };
    const trackPull = (y: number) => {
      if (pullStartY === null) return;
      if (!atTopOfList()) {
        pullStartY = null;
        return;
      }
      if (y - pullStartY > PULL_REVEAL_THRESHOLD) setRevealOnScroll(true);
    };
    const endPull = () => {
      pullStartX = null;
      pullStartY = null;
    };

    // Pointer events should cover both touch and mouse drags, but touch
    // simulation in some browser devtools doesn't dispatch them reliably —
    // native touchstart/touchmove/touchend (what actually fires on a real
    // device) is tracked in parallel as a redundant, more direct path.
    const handlePointerDown = (e: PointerEvent) => startPull(e.clientX, e.clientY);
    const handlePointerMove = (e: PointerEvent) => trackPull(e.clientY);
    const handleTouchStart = (e: TouchEvent) => {
      const x = e.touches[0]?.clientX;
      const y = e.touches[0]?.clientY;
      if (x !== undefined && y !== undefined) startPull(x, y);
    };
    // Must be a non-passive listener: at scrollTop 0, dragging down is
    // exactly the gesture iOS's own rubber-band/overscroll recognizer also
    // wants, and once it claims the touch sequence, no further touchmove
    // events reach this listener at all — matching the observed "works on
    // the second attempt" (the first drag gets lost to native scroll
    // takeover). preventDefault() while a qualifying pull is in progress
    // keeps the whole gesture in JS, the same way WhatsApp's own
    // pull-to-reveal search bar holds onto it.
    //
    // Only claims the gesture once it's clearly more vertical than
    // horizontal — otherwise a horizontal drag that starts anywhere near
    // the top of the list (e.g. scrolling the filter chip row, which sits
    // right there) had its native horizontal scroll silently swallowed by
    // this preventDefault() as soon as y so much as ticked sideways.
    const handleTouchMove = (e: TouchEvent) => {
      const x = e.touches[0]?.clientX;
      const y = e.touches[0]?.clientY;
      if (x === undefined || y === undefined) return;
      if (
        pullStartX !== null &&
        pullStartY !== null &&
        atTopOfList() &&
        y >= pullStartY &&
        Math.abs(y - pullStartY) > Math.abs(x - pullStartX)
      ) {
        e.preventDefault();
      }
      trackPull(y);
    };

    // Trackpad/mouse wheel scrolling never fires pointer/touch events at
    // all, so the drag gesture above is untestable (and unusable) with a
    // mouse — this covers the same intent for desktop: scrolling up while
    // already at the top is the direct equivalent of a pull-down gesture
    // there.
    let wheelPull = 0;
    const handleWheel = (e: WheelEvent) => {
      if (!atTopOfList()) {
        wheelPull = 0;
        return;
      }
      if (e.deltaY < 0) {
        wheelPull += -e.deltaY;
        if (wheelPull > PULL_REVEAL_THRESHOLD) setRevealOnScroll(true);
      } else {
        wheelPull = 0;
      }
    };

    document.body.addEventListener('scroll', handleScroll, true);
    document.body.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.body.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.body.addEventListener('pointerup', endPull, { passive: true });
    document.body.addEventListener('pointercancel', endPull, { passive: true });
    document.body.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.body.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.body.addEventListener('touchend', endPull, { passive: true });
    document.body.addEventListener('touchcancel', endPull, { passive: true });
    document.body.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      document.body.removeEventListener('scroll', handleScroll, true);
      document.body.removeEventListener('pointerdown', handlePointerDown);
      document.body.removeEventListener('pointermove', handlePointerMove);
      document.body.removeEventListener('pointerup', endPull);
      document.body.removeEventListener('pointercancel', endPull);
      document.body.removeEventListener('touchstart', handleTouchStart);
      document.body.removeEventListener('touchmove', handleTouchMove);
      document.body.removeEventListener('touchend', endPull);
      document.body.removeEventListener('touchcancel', endPull);
      document.body.removeEventListener('wheel', handleWheel);
    };
  }, []);

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

  const shouldShowChips = revealOnScroll || searchFocused || hasActiveFilters || !!localSearch || showDateFilter;

  // 2. Pagination State for virtualization
  const [visibleCount, setVisibleCount] = useState(50);
  
  // Reset pagination when filter criteria change
  useEffect(() => {
    setVisibleCount(50);
  }, [trip?.id, filterCategory, filterMember, filterDateFrom, filterDateTo, search]);

  const displayedExpenses = filteredExpenses.slice(0, visibleCount);

  // Expenses whose payer and/or split still reference a member who was
  // later removed from the trip — each one already gets its own inline
  // warning below, this just offers a way to work through all of them
  // instead of hunting each one down individually.
  const affectedExpenseIds = trip
    ? activeTripExpenses
        .filter(
          (e) =>
            !trip.memberIds.includes(e.paidBy) ||
            e.splitMemberIds.some((id) => !trip.memberIds.includes(id))
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

      {/* Search & Quick Filters */}
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
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
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

          {/* Horizontal quick filter pills */}
          <div className={`filter-chips-collapse ${shouldShowChips ? 'expanded' : ''}`}>
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
              : expenseDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const formattedTime = exp.createdAt
              ? new Date(exp.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              : null;

            const isFirstOfDate = idx === 0 || displayedExpenses[idx - 1].date !== exp.date;

            const reviewMessage = isPayerDeleted && hasDeletedParticipants
              ? 'Payer and a split member were removed — reassign the payer and update the split.'
              : isPayerDeleted
                ? 'Payer was removed — assign a new payer.'
                : 'A split member was removed — update the split.';

            return (
              <div key={exp.id}>
                {isFirstOfDate && (
                  <div style={{
                    padding: '7px 14px',
                    background: 'var(--bg-secondary)',
                    borderTop: idx > 0 ? '1px solid var(--border-color)' : 'none',
                    borderBottom: '1px solid var(--border-color)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>📅 {formattedDate}</span>
                  </div>
                )}

                <div
                  aria-hidden={isPending}
                  style={{
                    borderBottom: idx < displayedExpenses.length - 1 && displayedExpenses[idx + 1].date === exp.date ? '1.5px dashed var(--border-color)' : 'none',
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
                        onClick={() => { triggerHaptic('light'); onReview(exp); }}
                      >
                        <CategoryIcon categoryId={cat?.id || ''} fallbackEmoji={cat?.icon || '🏷️'} size={15} />
                        <h4 style={{ flex: 1, minWidth: 0, fontSize: '15px', lineHeight: 1.3, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                          {exp.title}
                        </h4>
                        <span className="money privacy-blur" style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--font-family-mono)' }}>
                          {formatMaskedAmount(exp.amount.toFixed(2), currencySymbol, isBlindMode)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
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
                            <span style={{ color: '#0284C7', fontSize: '12px', flexShrink: 0 }} title={exp.location.placeName}>📍</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <span style={{ fontSize: '11.5px', lineHeight: 1.4, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {formattedTime || formattedDate}
                          </span>
                          {canManage && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                              {!exp.title.startsWith('Settlement:') && (
                                <button
                                  className="row-icon-btn"
                                  style={needsReview ? { color: 'var(--color-warning)' } : undefined}
                                  aria-label={needsReview ? 'Review expense' : 'Edit expense'}
                                  title={needsReview ? 'Review' : 'Edit'}
                                  onClick={(e) => { e.stopPropagation(); triggerHaptic('light'); onEdit(exp); }}
                                >
                                  {needsReview ? <IconAlertCircle size={15} className="icon-sm" /> : <IconEdit size={15} className="icon-sm" />}
                                </button>
                              )}
                              <button
                                className="row-icon-btn row-icon-btn-danger"
                                aria-label="Delete expense"
                                title="Delete"
                                onClick={(e) => { e.stopPropagation(); triggerHaptic('warning'); onDelete(exp); }}
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
