import { useState, useMemo } from 'react';
import type { Trip, ChecklistItem } from '../types';
import {
  generateSmartPackingSuggestions,
  inferSeasonalClimate,
  generatePackingGuideNote,
  type PackingSuggestionItem,
} from '../utils/packingSuggestions';
import { triggerHaptic } from '../utils/haptics';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useHistoryBack } from '../utils/useHistoryBack';
import { newId } from '../utils/uuid';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  weatherCondition?: string;
  avgTemp?: number;
  onBatchAddChecklist: (items: ChecklistItem[]) => Promise<void>;
  onSaveAsNote?: (note: { title: string; content: string; category: 'transport' | 'general' }) => Promise<void>;
}

type LuggageFilter = 'all' | 'cabin-only' | 'checkin-only';

export function SmartPackingAssistantModal({
  isOpen,
  onClose,
  trip,
  weatherCondition,
  avgTemp,
  onBatchAddChecklist,
  onSaveAsNote,
}: Props) {
  const [luggageFilter, setLuggageFilter] = useState<LuggageFilter>('all');
  const [includeLuggageTag, setIncludeLuggageTag] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  // Compute trip duration in days
  const durationDays = useMemo(() => {
    if (!trip.startDate || !trip.endDate) return 3;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diff = Math.round(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  }, [trip.startDate, trip.endDate]);

  // Seasonal climate inference for timing
  const seasonalClimate = useMemo(() => {
    return inferSeasonalClimate(trip.destination || trip.name, trip.startDate);
  }, [trip.destination, trip.name, trip.startDate]);

  const effectiveTemp = avgTemp ?? seasonalClimate.estimatedTempC;

  // Generate suggestions tailored to destination, dates/timing, weather, and luggage filter
  const suggestions = useMemo(() => {
    return generateSmartPackingSuggestions({
      destination: trip.destination || trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      durationDays,
      weatherCondition,
      avgTemp: effectiveTemp,
      luggageFilter,
      isInternational: Boolean(
        (trip.baseCurrency && trip.baseCurrency !== 'INR') ||
          (trip.destination &&
            ['bali', 'phuket', 'tokyo', 'dubai', 'london', 'paris', 'alps', 'bangkok', 'singapore'].some((c) =>
              trip.destination?.toLowerCase().includes(c)
            ))
      ),
    });
  }, [trip.destination, trip.name, trip.startDate, trip.endDate, trip.baseCurrency, durationDays, weatherCondition, effectiveTemp, luggageFilter]);

  // Selected item IDs state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(suggestions.map((s) => s.id)));

  // Update selected IDs when luggage filter changes
  const handleLuggageFilterChange = (filter: LuggageFilter) => {
    triggerHaptic('light');
    setLuggageFilter(filter);
    const newItems = generateSmartPackingSuggestions({
      destination: trip.destination || trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      durationDays,
      weatherCondition,
      avgTemp: effectiveTemp,
      luggageFilter: filter,
    });
    setSelectedIds(new Set(newItems.map((s) => s.id)));
  };

  useEscapeKey(isOpen, onClose);
  useHistoryBack(isOpen, onClose);

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    triggerHaptic('light');
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    triggerHaptic('light');
    setSelectedIds(new Set(suggestions.map((s) => s.id)));
  };

  const deselectAll = () => {
    triggerHaptic('light');
    setSelectedIds(new Set());
  };

  const handleAddSelected = async () => {
    const selectedItems = suggestions.filter((s) => selectedIds.has(s.id));
    if (selectedItems.length === 0) return;

    triggerHaptic('success');
    setIsSubmitting(true);

    const now = Date.now();
    const newChecklistItems: ChecklistItem[] = selectedItems.map((item: PackingSuggestionItem) => {
      let label = item.text;
      if (includeLuggageTag) {
        if (item.airplaneEligibility === 'cabin-only') {
          label = `[✈️ Cabin] ${label}`;
        } else if (item.airplaneEligibility === 'checkin-only') {
          label = `[🧳 Check-in] ${label}`;
        }
      }

      return {
        id: newId(),
        text: label,
        category: item.category,
        completed: false,
        createdAt: now,
        updatedAt: now,
      };
    });

    await onBatchAddChecklist(newChecklistItems);
    setIsSubmitting(false);
    onClose();
  };

  const handleSaveAsNote = async () => {
    if (!onSaveAsNote) return;
    const selectedItems = suggestions.filter((s) => selectedIds.has(s.id));
    if (selectedItems.length === 0) return;

    triggerHaptic('success');
    setIsSubmitting(true);

    const weatherSummary = weatherCondition
      ? `${weatherCondition} • ${effectiveTemp}°C`
      : `${seasonalClimate.seasonName} (~${effectiveTemp}°C)`;

    const note = generatePackingGuideNote(
      trip.destination || trip.name,
      trip.startDate || 'TBD',
      trip.endDate || 'TBD',
      selectedItems,
      weatherSummary
    );

    await onSaveAsNote({
      title: note.title,
      content: note.content,
      category: 'transport',
    });

    setIsSubmitting(false);
    setNoteSavedFeedback(true);
    setTimeout(() => setNoteSavedFeedback(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Smart Travel Packing Assistant">
      <div
        className="glass-card fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '580px',
          width: '100%',
          height: 'min(88dvh, 680px)',
          maxHeight: 'min(88dvh, 680px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated, rgba(15,23,42,0.03))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>✈️</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Smart Travel & Packing Assistant</span>
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {trip.destination || trip.name} • {durationDays} {durationDays === 1 ? 'day' : 'days'}
                {weatherCondition ? ` • ${weatherCondition} (${effectiveTemp}°C)` : ` • ${seasonalClimate.seasonName} (~${effectiveTemp}°C)`}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Aviation Security & Timing Banner */}
        <div
          style={{
            padding: '10px 18px',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(20, 184, 166, 0.08))',
            borderBottom: '1px solid rgba(14, 165, 233, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '11.5px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--primary-accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>🛡️ Flight Travel Security Compliant</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: 'var(--primary-accent)', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                onClick={selectAll}
              >
                Select All
              </button>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '11.5px', cursor: 'pointer', padding: 0 }}
                onClick={deselectAll}
              >
                Clear
              </button>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            ⚡ <strong>Power banks & batteries</strong> must go in Cabin baggage only. 🧴 <strong>Liquids in cabin</strong> must be ≤ 100ml in 1 transparent quart pouch (3-1-1 rule). 🔪 <strong>Sharp tools</strong> must be checked in.
          </div>
        </div>

        {/* Luggage Mode Segmented Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 18px',
            background: 'var(--bg-surface-elevated, rgba(0,0,0,0.02))',
            borderBottom: '1px solid var(--border-color)',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleLuggageFilterChange('all')}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: luggageFilter === 'all' ? 700 : 500,
                background: luggageFilter === 'all' ? 'var(--primary-accent)' : 'transparent',
                color: luggageFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                border: luggageFilter === 'all' ? 'none' : '1px solid var(--border-color)',
                cursor: 'pointer',
              }}
            >
              All Baggage
            </button>
            <button
              type="button"
              onClick={() => handleLuggageFilterChange('cabin-only')}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: luggageFilter === 'cabin-only' ? 700 : 500,
                background: luggageFilter === 'cabin-only' ? '#0284c7' : 'transparent',
                color: luggageFilter === 'cabin-only' ? '#fff' : 'var(--text-secondary)',
                border: luggageFilter === 'cabin-only' ? 'none' : '1px solid var(--border-color)',
                cursor: 'pointer',
              }}
              title="Filter items eligible to travel strictly in aircraft cabin (no checked luggage)"
            >
              ✈️ Carry-on Only
            </button>
            <button
              type="button"
              onClick={() => handleLuggageFilterChange('checkin-only')}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: luggageFilter === 'checkin-only' ? 700 : 500,
                background: luggageFilter === 'checkin-only' ? '#d97706' : 'transparent',
                color: luggageFilter === 'checkin-only' ? '#fff' : 'var(--text-secondary)',
                border: luggageFilter === 'checkin-only' ? 'none' : '1px solid var(--border-color)',
                cursor: 'pointer',
              }}
            >
              🧳 Checked Baggage
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeLuggageTag}
              onChange={(e) => setIncludeLuggageTag(e.target.checked)}
              style={{ accentColor: 'var(--primary-accent)' }}
            />
            <span>Tag luggage bag</span>
          </label>
        </div>

        {/* Suggestion Item List */}
        <div
          style={{
            padding: '12px 18px',
            overflowY: 'auto',
            flex: '1 1 auto',
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {suggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No packing items match the selected luggage filter.
            </div>
          ) : (
            suggestions.map((item) => {
              const isChecked = selectedIds.has(item.id);
              const isCabin = item.airplaneEligibility === 'cabin-only';
              const isCheckin = item.airplaneEligibility === 'checkin-only';

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: isChecked ? 'rgba(15, 169, 143, 0.05)' : 'var(--bg-surface, #fff)',
                    border: isChecked ? '1.5px solid var(--primary-accent)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    gap: '10px',
                  }}
                  onClick={() => toggleItem(item.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(item.id)}
                      style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--primary-accent)', cursor: 'pointer' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>{item.icon || '📦'}</span>
                        <span>{item.text}</span>
                        {/* Aviation Compliance Badge */}
                        {isCabin && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              background: 'rgba(14, 165, 233, 0.12)',
                              color: '#0284c7',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            ✈️ Cabin Bag
                          </span>
                        )}
                        {isCheckin && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              background: 'rgba(217, 119, 6, 0.12)',
                              color: '#d97706',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            🧳 Check-in Only
                          </span>
                        )}
                        {item.isLiquid && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              background: 'rgba(20, 184, 166, 0.12)',
                              color: 'var(--primary-accent)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            🧴 ≤100ml
                          </span>
                        )}
                      </div>

                      {item.cabinNote && (
                        <div style={{ fontSize: '11px', color: isCabin ? '#0284c7' : isCheckin ? '#c2410c' : 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                          ℹ️ {item.cabinNote}
                        </div>
                      )}

                      {item.reason && !item.cabinNote && (
                        <div style={{ fontSize: '11px', color: 'var(--primary-accent)', fontWeight: 500, marginTop: '2px' }}>
                          💡 {item.reason}
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '9.5px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(0,0,0,0.04)',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Pinned Footer Actions */}
        <div
          style={{
            flexShrink: 0,
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            padding: '12px 18px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-surface, #fff)',
            boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            gap: '10px',
          }}
        >
          {onSaveAsNote && (
            <button
              type="button"
              className="secondary-btn"
              style={{
                flex: '0 0 auto',
                padding: '11px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              disabled={selectedIds.size === 0 || isSubmitting}
              onClick={handleSaveAsNote}
              title="Create a structured flight & packing reference note in the Notes tab"
            >
              <span>{noteSavedFeedback ? '✅ Saved!' : '📝 Save as Note'}</span>
            </button>
          )}

          <button
            type="button"
            className="gradient-btn"
            style={{ flex: 1, padding: '11px 16px', fontSize: '13.5px', fontWeight: 700 }}
            disabled={selectedIds.size === 0 || isSubmitting}
            onClick={handleAddSelected}
          >
            {isSubmitting ? 'Adding...' : `✓ Add ${selectedIds.size} Items to Checklist`}
          </button>
        </div>
      </div>
    </div>
  );
}
