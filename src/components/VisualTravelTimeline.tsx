import { useMemo, useState, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Category, Expense, Member, TravelPass, Trip, ItineraryItem } from '../types';
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
import { triggerHaptic } from '../utils/haptics';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import {
  buildItineraryTimeline,
  formatTimeDisplay,
  getDirectionsUrl,
} from '../utils/itineraryTimeline';
import { useTripStore } from '../store/tripStore';
import { ItineraryActivityModal } from './ItineraryActivityModal';

export type VisualTravelTimelineProps = {
  trip: Trip | undefined;
  members: Record<string, Member>;
  categories: Category[];
  expenses: Expense[];
  passes?: TravelPass[];
  itinerary?: ItineraryItem[];
  currencySymbol?: string;
  myMemberId: string | null;
  isAdmin: boolean;
  userId: string | null;
  onReviewExpense: (expense: Expense) => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
  onAddExpenseForDate?: (date: string, template?: { title?: string; category?: string }) => void;
  onOpenPassDetails?: (pass: TravelPass) => void;
  getCatColor: (id: string, idx: number) => string;
};

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
      {initial(label)}
    </div>
  );
}

const CATEGORY_EMOJIS: Record<string, string> = {
  activity: '🎟️',
  food: '🍝',
  sightseeing: '🏛️',
  transport: '🚕',
  lodging: '🏨',
  other: '✨',
};

export function VisualTravelTimeline({
  trip,
  members,
  categories,
  expenses,
  passes = [],
  itinerary,
  currencySymbol,
  myMemberId,
  onReviewExpense,
  onAddExpenseForDate,
  onOpenPassDetails,
  getCatColor,
}: VisualTravelTimelineProps) {
  const [filterKind, setFilterKind] = useState<'all' | 'activities' | 'expenses' | 'passes'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activityModalState, setActivityModalState] = useState<{
    isOpen: boolean;
    date?: string;
    item?: ItineraryItem | null;
  }>({ isOpen: false });

  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const symbol = currencySymbol || getCurrencySymbol(trip?.baseCurrency || '');

  // Filter out soft-deleted expenses
  const actualExpenses = useMemo(
    () => expenses.filter((e) => !e.deletedAt && !e.isSettlement),
    [expenses]
  );

  const addItineraryItem = useTripStore((s) => s.addItineraryItem);
  const updateItineraryItem = useTripStore((s) => s.updateItineraryItem);
  const deleteItineraryItem = useTripStore((s) => s.deleteItineraryItem);
  const toggleItineraryItem = useTripStore((s) => s.toggleItineraryItem);

  const activeActivities = useMemo(() => {
    return itinerary || trip?.itinerary || [];
  }, [itinerary, trip?.itinerary]);

  // Build unified Day-by-Day timeline
  const dayGroups = useMemo(() => {
    return buildItineraryTimeline({
      tripStartDate: trip?.startDate,
      tripEndDate: trip?.endDate,
      activities: activeActivities,
      passes,
      expenses: actualExpenses,
      sortOrder,
    });
  }, [trip?.startDate, trip?.endDate, activeActivities, passes, actualExpenses, sortOrder]);

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

  const handleSaveActivity = async (
    data: Omit<ItineraryItem, 'id' | 'createdAt' | 'updatedAt' | 'tripId'>
  ) => {
    if (!trip?.id) return;
    if (activityModalState.item) {
      await updateItineraryItem(trip.id, activityModalState.item.id, data);
    } else {
      await addItineraryItem(trip.id, data);
    }
  };

  const handleDeleteActivity = async () => {
    if (!trip?.id || !activityModalState.item) return;
    await deleteItineraryItem(trip.id, activityModalState.item.id);
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
              const hasActivity = group.items.length > 0;
              return (
                <button
                  key={group.date}
                  type="button"
                  className={`vtt-scrubber-pill${hasActivity ? ' has-activity' : ''}`}
                  onClick={() => scrollToDay(group.date)}
                  title={`${label} · ${group.dateLabel} (${formatAmount(group.totalSpend, symbol)})`}
                >
                  <span className="vtt-scrubber-label">{label}</span>
                  {group.totalSpend > 0 && <span className="vtt-scrubber-dot" />}
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
              All Events ({actualExpenses.length + passes.length + activeActivities.length})
            </button>
            {activeActivities.length > 0 && (
              <button
                type="button"
                className={`vtt-filter-pill${filterKind === 'activities' ? ' active' : ''}`}
                onClick={() => {
                  triggerHaptic('light');
                  setFilterKind('activities');
                }}
              >
                Activities ({activeActivities.length})
              </button>
            )}
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
            const isHighBurn =
              avgDailySpend > 0 &&
              group.totalSpend > avgDailySpend * 1.5 &&
              group.expenses.length > 1;

            const visibleItems = group.items.filter((item) => {
              if (filterKind === 'activities') return item.kind === 'activity';
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
                            <span
                              className="vtt-burn-pill"
                              title="Spending was >50% above daily average"
                            >
                              High Burn 🔥
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="vtt-add-bill-btn"
                      onClick={() => {
                        triggerHaptic('medium');
                        setActivityModalState({ isOpen: true, date: group.date, item: null });
                      }}
                      title={`Add activity for ${group.dateLabel}`}
                      style={{ backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.3)' }}
                    >
                      <IconPlus size={14} />
                      <span className="vtt-add-bill-label">Activity</span>
                    </button>

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
                </div>

                {/* Day Content Track */}
                <div className="vtt-day-items">
                  {visibleItems.length === 0 ? (
                    <div className="vtt-empty-day-stub">
                      <span>No {filterKind === 'all' ? 'events' : filterKind} scheduled for this day</span>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          type="button"
                          className="vtt-empty-add-btn"
                          onClick={() => {
                            triggerHaptic('light');
                            setActivityModalState({ isOpen: true, date: group.date, item: null });
                          }}
                        >
                          + Add Activity
                        </button>
                        {onAddExpenseForDate && (
                          <button
                            type="button"
                            className="vtt-empty-add-btn"
                            onClick={() => {
                              triggerHaptic('light');
                              onAddExpenseForDate(group.date);
                            }}
                          >
                            + Log Bill
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    visibleItems.map((item) => {
                      // Activity Item Card
                      if (item.kind === 'activity') {
                        const act = item.data;
                        const emoji = CATEGORY_EMOJIS[act.category || 'activity'] || '🎟️';

                        return (
                          <div
                            key={`act-${act.id}`}
                            className={`vtt-item-card vtt-activity-card${act.completed ? ' completed' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              triggerHaptic('light');
                              setActivityModalState({ isOpen: true, date: act.date, item: act });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setActivityModalState({ isOpen: true, date: act.date, item: act });
                              }
                            }}
                          >
                            <div className="vtt-item-left" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={!!act.completed}
                                onChange={async () => {
                                  triggerHaptic('light');
                                  if (trip?.id) {
                                    await toggleItineraryItem(trip.id, act.id);
                                  }
                                }}
                                className="vtt-activity-checkbox"
                                title={act.completed ? 'Mark as pending' : 'Mark as completed'}
                              />
                            </div>

                            <div className="vtt-item-body">
                              <div className="vtt-item-headline">
                                <span style={{ fontSize: '15px' }}>{emoji}</span>
                                <h4 className="vtt-item-title">{act.title}</h4>
                                {act.time && (
                                  <span className="vtt-meta-pill font-mono">
                                    {formatTimeDisplay(act.time)}
                                  </span>
                                )}
                              </div>

                              <div className="vtt-item-subline" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {act.location && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <IconMapPin size={12} style={{ color: 'var(--text-muted)' }} />
                                    {act.location}
                                  </span>
                                )}
                                {act.notes && (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                    {act.notes}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="vtt-item-right" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                              {act.location && (
                                <a
                                  href={getDirectionsUrl(act.location)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="vtt-action-btn-pill"
                                  title="Open in Google Maps"
                                >
                                  <IconMapPin size={11} /> Directions
                                </a>
                              )}
                              {onAddExpenseForDate && (
                                <button
                                  type="button"
                                  className="vtt-action-btn-pill"
                                  onClick={() => {
                                    triggerHaptic('medium');
                                    onAddExpenseForDate(act.date, {
                                      title: act.title,
                                      category: act.category === 'food' ? 'Food & Drinks' : undefined,
                                    });
                                  }}
                                  title="Log an expense for this activity"
                                >
                                  + Bill
                                </button>
                              )}
                              <span className="vtt-card-action-hint" style={{ marginLeft: '4px' }}>
                                Edit <IconChevronRight size={12} />
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // Pass Item Card
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
                      const showMyShare =
                        typeof myShare === 'number' && Math.abs(myShare - exp.amount) > 0.01;

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
                                · {exp.splitMemberIds.length}{' '}
                                {exp.splitMemberIds.length === 1 ? 'person' : 'people'}
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

      {activityModalState.isOpen && (
        <ItineraryActivityModal
          isOpen={activityModalState.isOpen}
          onClose={() => setActivityModalState({ isOpen: false, item: null })}
          onSave={handleSaveActivity}
          onDelete={activityModalState.item ? handleDeleteActivity : undefined}
          initialDate={activityModalState.date}
          initialItem={activityModalState.item}
          tripStartDate={trip?.startDate}
          tripEndDate={trip?.endDate}
        />
      )}
    </div>
  );
}
