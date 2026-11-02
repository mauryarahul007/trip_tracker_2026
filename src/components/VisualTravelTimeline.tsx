import { useMemo, useState, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Category, Expense, Member, TravelPass, Trip } from '../types';
import {
  IconPlus,
  IconMapPin,
  IconCamera,
  IconFlag,
  IconChevronRight,
  IconCalendar,
  IconCatTravel,
  IconCatStay,
} from './Icons';
import { CategoryIcon } from './CategoryIcon';
import { getCurrencySymbol, formatAmount } from '../utils/currency';
import { tripDayNumber } from '../utils/dateRange';
import { triggerHaptic } from '../utils/haptics';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';

export type VisualTravelTimelineProps = {
  trip: Trip | undefined;
  members: Record<string, Member>;
  categories: Category[];
  expenses: Expense[];
  passes?: TravelPass[];
  currencySymbol?: string;
  myMemberId: string | null;
  isAdmin: boolean;
  userId: string | null;
  onReviewExpense: (expense: Expense) => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
  onAddExpenseForDate?: (date: string) => void;
  onOpenPassDetails?: (pass: TravelPass) => void;
  getCatColor: (id: string, idx: number) => string;
};

type TimelineItem =
  | { kind: 'expense'; date: string; time: string; data: Expense }
  | { kind: 'pass'; date: string; time: string; data: TravelPass };

type DayTimelineGroup = {
  date: string;
  dayNumber: number | null;
  dateLabel: string;
  totalSpend: number;
  expenses: Expense[];
  passes: TravelPass[];
  items: TimelineItem[];
};

function formatIsoDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function extractPassDate(pass: TravelPass): { date: string; time: string } {
  if (pass.startDateTime) {
    const raw = pass.startDateTime;
    if (raw.includes('T')) {
      const [d, t] = raw.split('T');
      return { date: d, time: t.slice(0, 5) };
    }
    return { date: raw.slice(0, 10), time: '12:00' };
  }
  return { date: '', time: '' };
}

function MemberAvatarBadge({
  member,
  size = 20,
}: {
  member: Member | undefined;
  size?: number;
}) {
  const label = member?.name || 'Traveler';
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    border: '1.5px solid var(--bg-surface)',
    objectFit: 'cover',
  };

  if (member?.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={label}
        title={label}
        referrerPolicy="no-referrer"
        loading="lazy"
        width={size}
        height={size}
        style={style}
      />
    );
  }

  return (
    <div
      title={label}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: member ? avatarColorForName(label) : 'var(--text-muted)',
        color: '#FFFDF6',
        fontFamily: 'var(--font-family-title)',
        fontWeight: 700,
        fontSize: Math.round(size * 0.44),
      }}
    >
      {member ? initial(label) : '?'}
    </div>
  );
}

export function VisualTravelTimeline({
  trip,
  members,
  categories,
  expenses,
  passes = [],
  currencySymbol: passedSymbol,
  myMemberId,
  onReviewExpense,
  onAddExpenseForDate,
  onOpenPassDetails,
  getCatColor,
}: VisualTravelTimelineProps) {
  const symbol = passedSymbol || getCurrencySymbol(trip?.baseCurrency || '') || '$';
  const [filterKind, setFilterKind] = useState<'all' | 'expenses' | 'passes'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filter actual expenses (exclude settlements)
  const actualExpenses = useMemo(
    () => expenses.filter((e) => !e.isSettlement && !e.title.startsWith('Settlement:')),
    [expenses]
  );

  // Group all items into a unified Day-by-Day timeline
  const dayGroups = useMemo<DayTimelineGroup[]>(() => {
    const dateMap = new Map<string, { expenses: Expense[]; passes: TravelPass[] }>();

    // 1. Gather dates from trip range if defined
    if (trip?.startDate) {
      const s = new Date(`${trip.startDate}T00:00:00`);
      const e = trip.endDate ? new Date(`${trip.endDate}T00:00:00`) : s;
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
        const cur = new Date(s);
        // Safety cap at 45 days so wide pending dates don't stall rendering
        let count = 0;
        while (cur <= e && count < 45) {
          const iso = cur.toISOString().split('T')[0];
          if (!dateMap.has(iso)) {
            dateMap.set(iso, { expenses: [], passes: [] });
          }
          cur.setDate(cur.getDate() + 1);
          count++;
        }
      }
    }

    // 2. Map expenses into dateMap
    actualExpenses.forEach((exp) => {
      const d = exp.date;
      if (!d) return;
      if (!dateMap.has(d)) {
        dateMap.set(d, { expenses: [], passes: [] });
      }
      dateMap.get(d)!.expenses.push(exp);
    });

    // 3. Map travel passes into dateMap
    passes.forEach((pass) => {
      const { date } = extractPassDate(pass);
      if (!date) return;
      if (!dateMap.has(date)) {
        dateMap.set(date, { expenses: [], passes: [] });
      }
      dateMap.get(date)!.passes.push(pass);
    });

    // 4. Sort dates according to chosen sort order
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) =>
      sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
    );

    // 5. Build timeline day groups
    return sortedDates.map((date) => {
      const data = dateMap.get(date)!;
      const dayNum = trip?.startDate ? tripDayNumber(trip.startDate, date) : null;
      const dateLabel = formatIsoDate(date);
      const dayExpenses = data.expenses;
      const dayPasses = data.passes;

      const totalSpend = dayExpenses
        .filter((e) => !e.excludeFromTotals)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      // Merge into unified chronological stream for the day
      const items: TimelineItem[] = [];

      dayPasses.forEach((p) => {
        const { time } = extractPassDate(p);
        items.push({ kind: 'pass', date, time: time || '09:00', data: p });
      });

      dayExpenses.forEach((e) => {
        items.push({ kind: 'expense', date, time: '12:00', data: e });
      });

      // Sort items within day by time
      items.sort((a, b) => a.time.localeCompare(b.time));

      return {
        date,
        dayNumber: dayNum,
        dateLabel,
        totalSpend,
        expenses: dayExpenses,
        passes: dayPasses,
        items,
      };
    });
  }, [trip?.startDate, trip?.endDate, actualExpenses, passes, sortOrder]);

  // Overall Timeline Spend Average
  const avgDailySpend = useMemo(() => {
    const nonZeroDays = dayGroups.filter((g) => g.totalSpend > 0);
    if (nonZeroDays.length === 0) return 0;
    const sum = nonZeroDays.reduce((acc, g) => acc + g.totalSpend, 0);
    return sum / nonZeroDays.length;
  }, [dayGroups]);

  const scrollToDay = (date: string) => {
    triggerHaptic('light');
    const el = dayRefs.current[date];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="vtt-container" data-testid="visual-travel-timeline">
      {/* Timeline Controls Header */}
      <div className="vtt-header-controls">
        {/* Scrubber pills for rapid day jumping */}
        {dayGroups.length > 1 && (
          <div className="vtt-day-scrubber" role="navigation" aria-label="Timeline days">
            {dayGroups.map((group) => {
              const label = group.dayNumber ? `Day ${group.dayNumber}` : group.date.slice(5);
              const hasActivity = group.expenses.length > 0 || group.passes.length > 0;
              return (
                <button
                  key={group.date}
                  type="button"
                  className={`vtt-scrubber-pill${hasActivity ? ' has-activity' : ''}`}
                  onClick={() => scrollToDay(group.date)}
                  title={`${label} · ${group.dateLabel} (${formatAmount(group.totalSpend, symbol)})`}
                >
                  <span className="vtt-scrubber-label">{label}</span>
                  {group.totalSpend > 0 && (
                    <span className="vtt-scrubber-dot" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Filter bar & Sort toggle */}
        <div className="vtt-action-row">
          <div className="vtt-filter-group" role="tablist" aria-label="Timeline filters">
            <button
              type="button"
              className={`vtt-filter-pill${filterKind === 'all' ? ' active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setFilterKind('all');
              }}
            >
              All Events ({actualExpenses.length + passes.length})
            </button>
            <button
              type="button"
              className={`vtt-filter-pill${filterKind === 'expenses' ? ' active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setFilterKind('expenses');
              }}
            >
              Bills Only ({actualExpenses.length})
            </button>
            {passes.length > 0 && (
              <button
                type="button"
                className={`vtt-filter-pill${filterKind === 'passes' ? ' active' : ''}`}
                onClick={() => {
                  triggerHaptic('light');
                  setFilterKind('passes');
                }}
              >
                Passes ({passes.length})
              </button>
            )}
          </div>

          <button
            type="button"
            className="vtt-sort-btn"
            onClick={() => {
              triggerHaptic('light');
              setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            }}
            title="Toggle chronological vs reverse order"
          >
            <span>{sortOrder === 'asc' ? 'Day 1 → End' : 'Latest First'}</span>
          </button>
        </div>
      </div>

      {/* Main Spine Timeline Feed */}
      <div className="vtt-spine-track">
        {dayGroups.length === 0 ? (
          <div className="glass-card vtt-empty-state">
            <IconCalendar size={28} className="vtt-empty-icon" />
            <p className="vtt-empty-text">No itinerary or expenses logged for this trip yet.</p>
          </div>
        ) : (
          dayGroups.map((group, groupIdx) => {
            const isHighBurn = avgDailySpend > 0 && group.totalSpend > avgDailySpend * 1.5 && group.expenses.length > 1;
            const visibleItems = group.items.filter((item) => {
              if (filterKind === 'expenses') return item.kind === 'expense';
              if (filterKind === 'passes') return item.kind === 'pass';
              return true;
            });

            return (
              <div
                key={group.date}
                ref={(el) => {
                  dayRefs.current[group.date] = el;
                }}
                className="vtt-day-section"
              >
                {/* Day Header Node */}
                <div className="vtt-day-node">
                  <div className="vtt-node-badge">
                    <span className="vtt-node-day">
                      {group.dayNumber ? `D${group.dayNumber}` : `#${groupIdx + 1}`}
                    </span>
                  </div>

                  <div className="vtt-day-info">
                    <div className="vtt-day-title-row">
                      <h3 className="vtt-day-title">
                        {group.dayNumber ? `Day ${group.dayNumber}` : 'Travel Day'}
                        <span className="vtt-day-date"> · {group.dateLabel}</span>
                      </h3>
                      {group.totalSpend > 0 && (
                        <div className="vtt-day-spend-wrap">
                          <span className="vtt-day-spend-pill money">
                            {formatAmount(group.totalSpend, symbol)}
                          </span>
                          {isHighBurn && (
                            <span className="vtt-burn-pill" title="Spending was >50% above daily average">
                              High Burn 🔥
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {onAddExpenseForDate && (
                    <button
                      type="button"
                      className="vtt-add-bill-btn"
                      onClick={() => {
                        triggerHaptic('medium');
                        onAddExpenseForDate(group.date);
                      }}
                      title={`Add expense for ${group.dateLabel}`}
                      aria-label={`Add expense for ${group.dateLabel}`}
                    >
                      <IconPlus size={14} />
                      <span className="vtt-add-bill-label">Add bill</span>
                    </button>
                  )}
                </div>

                {/* Day Content Track */}
                <div className="vtt-day-items">
                  {visibleItems.length === 0 ? (
                    <div className="vtt-empty-day-stub">
                      <span>No {filterKind === 'all' ? 'events' : filterKind} logged for this day</span>
                      {onAddExpenseForDate && (
                        <button
                          type="button"
                          className="vtt-empty-add-btn"
                          onClick={() => {
                            triggerHaptic('light');
                            onAddExpenseForDate(group.date);
                          }}
                        >
                          + Log bill for Day {group.dayNumber || groupIdx + 1}
                        </button>
                      )}
                    </div>
                  ) : (
                    visibleItems.map((item) => {
                      if (item.kind === 'pass') {
                        const pass = item.data;
                        const isFlight = pass.type === 'flight';
                        const isStay = pass.type === 'stay';
                        const isTrain = pass.type === 'train';

                        return (
                          <div
                            key={`pass-${pass.id}`}
                            className="vtt-item-card vtt-pass-card"
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              triggerHaptic('light');
                              onOpenPassDetails?.(pass);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onOpenPassDetails?.(pass);
                              }
                            }}
                          >
                            <div className="vtt-item-left">
                              <div className={`vtt-pass-icon-badge ${pass.type}`}>
                                {isFlight ? (
                                  <span style={{ fontSize: '15px' }}>✈️</span>
                                ) : isStay ? (
                                  <IconCatStay size={15} />
                                ) : isTrain ? (
                                  <span style={{ fontSize: '15px' }}>🚆</span>
                                ) : (
                                  <IconCatTravel size={15} />
                                )}
                              </div>
                            </div>

                            <div className="vtt-item-body">
                              <div className="vtt-item-headline">
                                <span className="vtt-pass-type-badge">{pass.type.toUpperCase()}</span>
                                <h4 className="vtt-item-title">{pass.title}</h4>
                                {pass.referenceCode && (
                                  <span className="vtt-code-pill font-mono">{pass.referenceCode}</span>
                                )}
                              </div>

                              <div className="vtt-item-subline">
                                {pass.origin && pass.destination ? (
                                  <span>
                                    {pass.origin} → {pass.destination}
                                  </span>
                                ) : pass.address ? (
                                  <span>{pass.address}</span>
                                ) : pass.provider ? (
                                  <span>{pass.provider}</span>
                                ) : null}

                                {pass.seatOrRoom && (
                                  <span className="vtt-meta-pill font-mono">
                                    {isStay ? `Room ${pass.seatOrRoom}` : `Seat ${pass.seatOrRoom}`}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="vtt-item-right">
                              <span className="vtt-card-action-hint">
                                View <IconChevronRight size={12} />
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // Expense Item Card
                      const exp = item.data;
                      const cat = categories.find((c) => c.id === exp.category);
                      const catColor = getCatColor(exp.category, 0);
                      const payerMember = members[exp.paidBy];
                      const myShare = myMemberId ? exp.resolvedShares[myMemberId] : undefined;
                      const showMyShare = typeof myShare === 'number' && Math.abs(myShare - exp.amount) > 0.01;

                      return (
                        <div
                          key={`exp-${exp.id}`}
                          className="vtt-item-card vtt-expense-card"
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            triggerHaptic('light');
                            onReviewExpense(exp);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onReviewExpense(exp);
                            }
                          }}
                        >
                          <div className="vtt-item-left">
                            <div
                              className="vtt-expense-cat-badge"
                              style={{
                                background: `${catColor}18`,
                                color: catColor,
                                border: `1px solid ${catColor}33`,
                              }}
                            >
                              <CategoryIcon
                                categoryId={cat?.id || ''}
                                fallbackEmoji={cat?.icon || '🏷️'}
                                size={14}
                              />
                            </div>
                          </div>

                          <div className="vtt-item-body">
                            <div className="vtt-item-headline">
                              <h4 className="vtt-item-title">{exp.title}</h4>
                              {(exp.receiptImage || exp.receiptPath) && (
                                <span className="vtt-tag-icon" title="Receipt photo attached">
                                  <IconCamera size={13} />
                                </span>
                              )}
                              {exp.disputedAt && (
                                <span className="vtt-tag-icon dispute" title="Disputed bill">
                                  <IconFlag size={13} />
                                </span>
                              )}
                              {exp.location?.placeName && (
                                <span className="vtt-tag-icon location" title={exp.location.placeName}>
                                  <IconMapPin size={13} />
                                </span>
                              )}
                            </div>

                            <div className="vtt-item-subline">
                              <div className="vtt-payer-chip">
                                <MemberAvatarBadge member={payerMember} size={16} />
                                <span>{payerMember?.name || 'Removed member'}</span>
                              </div>
                              <span className="vtt-split-summary">
                                · {exp.splitMemberIds.length} {exp.splitMemberIds.length === 1 ? 'person' : 'people'}
                              </span>
                              {showMyShare && (
                                <span className="vtt-my-share">
                                  (Your share: {formatAmount(myShare, symbol)})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="vtt-item-right">
                            <span className="vtt-expense-amount money">
                              {formatAmount(exp.amount, symbol)}
                            </span>
                            {exp.excludeFromTotals && (
                              <span className="vtt-excluded-tag">Excluded</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
