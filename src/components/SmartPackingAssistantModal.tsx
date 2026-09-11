import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { useScrollLock } from '../utils/useScrollLock';
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
type SeasonOverride = 'auto' | 'winter' | 'summer' | 'monsoon';

export function SmartPackingAssistantModal({
  isOpen,
  onClose,
  trip,
  weatherCondition,
  avgTemp,
  onBatchAddChecklist,
  onSaveAsNote,
}: Props) {
  // Lock body scroll while modal is active
  useScrollLock(isOpen);
  useEscapeKey(isOpen, onClose);
  useHistoryBack(isOpen, onClose);

  const [luggageFilter, setLuggageFilter] = useState<LuggageFilter>('all');
  const [includeLuggageTag, setIncludeLuggageTag] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);
  const [seasonOverride, setSeasonOverride] = useState<SeasonOverride>('auto');
  const [showFlightRules, setShowFlightRules] = useState(false);

  // Compute trip duration in days safely without timezone offsets
  const computedDuration = useMemo(() => {
    if (!trip.startDate || !trip.endDate) return 3;
    const s = trip.startDate.includes('T') ? trip.startDate.split('T')[0] : trip.startDate;
    const e = trip.endDate.includes('T') ? trip.endDate.split('T')[0] : trip.endDate;
    const [sy, sm, sd] = s.split('-').map(Number);
    const [ey, em, ed] = e.split('-').map(Number);
    if (!sy || !sm || !sd || !ey || !em || !ed) return 3;
    const d1 = new Date(sy, sm - 1, sd);
    const d2 = new Date(ey, em - 1, ed);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  }, [trip.startDate, trip.endDate]);

  // Allow real-time duration adjustment in modal
  const [durationDays, setDurationDays] = useState<number>(computedDuration);

  useEffect(() => {
    setDurationDays(computedDuration);
  }, [computedDuration]);

  // Seasonal climate inference for timing
  const seasonalClimate = useMemo(() => {
    return inferSeasonalClimate(trip.destination || trip.name, trip.startDate);
  }, [trip.destination, trip.name, trip.startDate]);

  // Effective weather condition and temperature based on overrides
  const effectiveWeather = useMemo(() => {
    if (seasonOverride === 'winter') {
      return { condition: 'Winter Cold', temp: 6, label: '❄️ Winter' };
    }
    if (seasonOverride === 'monsoon') {
      return { condition: 'Heavy Rain / Monsoon', temp: 25, label: '🌧️ Monsoon' };
    }
    if (seasonOverride === 'summer') {
      return { condition: 'Sunny / Hot', temp: 33, label: '☀️ Summer' };
    }
    if (weatherCondition && avgTemp !== undefined) {
      return { condition: weatherCondition, temp: avgTemp, label: `⛅ ${avgTemp}°C` };
    }
    return {
      condition: seasonalClimate.isCold ? 'Cold' : seasonalClimate.isRainy ? 'Rainy' : 'Fair',
      temp: avgTemp ?? seasonalClimate.estimatedTempC,
      label: `📅 ${seasonalClimate.seasonName}`,
    };
  }, [seasonOverride, weatherCondition, avgTemp, seasonalClimate]);

  // Generate all suggestions in real-time
  const allSuggestions = useMemo(() => {
    return generateSmartPackingSuggestions({
      destination: trip.destination || trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      durationDays,
      weatherCondition: effectiveWeather.condition,
      avgTemp: effectiveWeather.temp,
      luggageFilter: 'all',
      isInternational: Boolean(
        (trip.baseCurrency && trip.baseCurrency !== 'INR') ||
          (trip.destination &&
            ['bali', 'phuket', 'tokyo', 'dubai', 'london', 'paris', 'alps', 'bangkok', 'singapore'].some((c) =>
              trip.destination?.toLowerCase().includes(c)
            ))
      ),
    });
  }, [trip.destination, trip.name, trip.startDate, trip.endDate, trip.baseCurrency, durationDays, effectiveWeather]);

  // Selected item IDs state (default selects all items)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(allSuggestions.map((s) => s.id)));

  // Sync selected IDs when item list changes dynamically
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      allSuggestions.forEach((item) => {
        if (prev.has(item.id) || (item.defaultChecked && !prev.has(`unselected_${item.id}`))) {
          next.add(item.id);
        }
      });
      return next;
    });
  }, [allSuggestions]);

  // Real-time luggage breakdowns
  const cabinItems = useMemo(
    () => allSuggestions.filter((i) => i.airplaneEligibility === 'cabin-only'),
    [allSuggestions]
  );
  const checkinItems = useMemo(
    () => allSuggestions.filter((i) => i.airplaneEligibility === 'checkin-only'),
    [allSuggestions]
  );

  // Filtered view items based on active luggage tab
  const displayedItems = useMemo(() => {
    if (luggageFilter === 'cabin-only') {
      return allSuggestions.filter((i) => i.airplaneEligibility !== 'checkin-only');
    }
    if (luggageFilter === 'checkin-only') {
      return allSuggestions.filter((i) => i.airplaneEligibility !== 'cabin-only');
    }
    return allSuggestions;
  }, [allSuggestions, luggageFilter]);

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    triggerHaptic('light');
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        next.add(`unselected_${id}`);
      } else {
        next.add(id);
        next.delete(`unselected_${id}`);
      }
      return next;
    });
  };

  const selectAll = () => {
    triggerHaptic('light');
    setSelectedIds(new Set(allSuggestions.map((s) => s.id)));
  };

  const deselectAll = () => {
    triggerHaptic('light');
    const unselected = new Set<string>();
    allSuggestions.forEach((s) => unselected.add(`unselected_${s.id}`));
    setSelectedIds(unselected);
  };

  const handleDaysChange = (delta: number) => {
    triggerHaptic('light');
    setDurationDays((prev) => Math.max(1, Math.min(60, prev + delta)));
  };

  const handleAddSelected = async () => {
    const selectedItems = allSuggestions.filter((s) => selectedIds.has(s.id));
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
    const selectedItems = allSuggestions.filter((s) => selectedIds.has(s.id));
    if (selectedItems.length === 0) return;

    triggerHaptic('success');
    setIsSubmitting(true);

    const weatherSummary = `${effectiveWeather.label} (${effectiveWeather.condition} • ${effectiveWeather.temp}°C)`;

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

  // Real-time counts
  const selectedCount = allSuggestions.filter((i) => selectedIds.has(i.id)).length;
  const selectedCabinCount = cabinItems.filter((i) => selectedIds.has(i.id)).length;
  const selectedCheckinCount = checkinItems.filter((i) => selectedIds.has(i.id)).length;

  const modalContent = (
    <div
      className="modal-overlay packing-assistant-portal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Smart Travel Packing Assistant"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end', // Bottom sheet on mobile, centered on larger screens
        padding: '0',
        touchAction: 'auto',
        overflow: 'hidden',
      }}
    >
      <div
        className="glass-card packing-assistant-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '640px',
          height: 'min(92dvh, 760px)',
          maxHeight: 'min(92dvh, 760px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface, #ffffff)',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          borderBottomLeftRadius: '0',
          borderBottomRightRadius: '0',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.28)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Mobile Pull Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 2px' }}>
          <div style={{ width: '38px', height: '4px', borderRadius: '999px', background: 'var(--border-color, rgba(0,0,0,0.15))' }} />
        </div>

        {/* 1. Sleek Compact Header */}
        <div
          style={{
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-surface-elevated, rgba(15,23,42,0.02))',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15), rgba(14, 165, 233, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              ✈️
            </div>
            <div>
              <h3 style={{ fontSize: '15.5px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Smart Travel & Packing
              </h3>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                <span style={{ fontWeight: 600, color: 'var(--primary-accent)' }}>{trip.destination || trip.name}</span>
                <span>•</span>
                <span>{effectiveWeather.label}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface-elevated, rgba(0,0,0,0.04))',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* 2. Interactive Controls Bar (Days + Season + Select All) */}
        <div
          style={{
            padding: '8px 18px',
            background: 'var(--bg-surface, #fff)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '12px',
            flexShrink: 0,
          }}
        >
          {/* Days Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Duration:
            </span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                background: 'var(--bg-surface-elevated, rgba(0,0,0,0.03))',
                padding: '2px 4px',
              }}
            >
              <button
                type="button"
                onClick={() => handleDaysChange(-1)}
                disabled={durationDays <= 1}
                style={{
                  border: 'none',
                  background: 'transparent',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  fontWeight: 700,
                  cursor: durationDays <= 1 ? 'not-allowed' : 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                -
              </button>
              <span style={{ padding: '0 6px', fontWeight: 700, minWidth: '45px', textAlign: 'center', fontSize: '11.5px' }}>
                {durationDays}d
              </span>
              <button
                type="button"
                onClick={() => handleDaysChange(1)}
                disabled={durationDays >= 60}
                style={{
                  border: 'none',
                  background: 'transparent',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  fontWeight: 700,
                  cursor: durationDays >= 60 ? 'not-allowed' : 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Season Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
              value={seasonOverride}
              onChange={(e) => {
                triggerHaptic('light');
                setSeasonOverride(e.target.value as SeasonOverride);
              }}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11.5px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-surface-elevated, rgba(0,0,0,0.03))',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <option value="auto">Auto ({effectiveWeather.label})</option>
              <option value="summer">☀️ Summer</option>
              <option value="monsoon">🌧️ Monsoon</option>
              <option value="winter">❄️ Winter</option>
            </select>
          </div>

          {/* Quick Toggle All */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              style={{ background: 'transparent', border: 'none', color: 'var(--primary-accent)', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
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

        {/* 3. Aviation Security Advisory (Collapsible micro-pill) */}
        <div
          style={{
            padding: '6px 18px',
            background: 'rgba(14, 165, 233, 0.07)',
            borderBottom: '1px solid rgba(14, 165, 233, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#0284c7', fontWeight: 700 }}>🛡️ Aviation Rules:</span>
            <span>Power banks in Cabin • Liquids ≤ 100ml</span>
          </div>
          <button
            type="button"
            onClick={() => setShowFlightRules(!showFlightRules)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0284c7',
              fontSize: '10.5px',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            {showFlightRules ? 'Hide Info' : 'Details'}
          </button>
        </div>

        {showFlightRules && (
          <div
            style={{
              padding: '8px 18px',
              background: 'rgba(14, 165, 233, 0.04)',
              borderBottom: '1px solid rgba(14, 165, 233, 0.1)',
              fontSize: '10.5px',
              lineHeight: 1.45,
              color: 'var(--text-secondary)',
              flexShrink: 0,
            }}
          >
            • ⚡ <strong>Cabin Only:</strong> Power banks, spare lithium batteries, laptops, IDs, essential medication.<br />
            • 🧳 <strong>Check-in Only:</strong> Multi-tools, scissors, pocket knives, trekking poles, liquids &gt; 100ml.<br />
            • 🧴 <strong>3-1-1 Rule:</strong> All cabin liquids must be in containers ≤ 100ml in 1 transparent quart pouch.
          </div>
        )}

        {/* 4. Luggage Filter Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 18px',
            background: 'var(--bg-surface-elevated, rgba(0,0,0,0.015))',
            borderBottom: '1px solid var(--border-color)',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '2px' }}>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setLuggageFilter('all');
              }}
              style={{
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: luggageFilter === 'all' ? 700 : 500,
                background: luggageFilter === 'all' ? 'var(--primary-accent)' : 'transparent',
                color: luggageFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                border: luggageFilter === 'all' ? 'none' : '1px solid var(--border-color)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              All ({allSuggestions.length})
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setLuggageFilter('cabin-only');
              }}
              style={{
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: luggageFilter === 'cabin-only' ? 700 : 500,
                background: luggageFilter === 'cabin-only' ? '#0284c7' : 'transparent',
                color: luggageFilter === 'cabin-only' ? '#fff' : 'var(--text-secondary)',
                border: luggageFilter === 'cabin-only' ? 'none' : '1px solid var(--border-color)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Only show items eligible for aircraft cabin"
            >
              ✈️ Cabin ({allSuggestions.length - checkinItems.length})
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setLuggageFilter('checkin-only');
              }}
              style={{
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: luggageFilter === 'checkin-only' ? 700 : 500,
                background: luggageFilter === 'checkin-only' ? '#d97706' : 'transparent',
                color: luggageFilter === 'checkin-only' ? '#fff' : 'var(--text-secondary)',
                border: luggageFilter === 'checkin-only' ? 'none' : '1px solid var(--border-color)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              🧳 Check-in ({allSuggestions.length - cabinItems.length})
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={includeLuggageTag}
              onChange={(e) => setIncludeLuggageTag(e.target.checked)}
              style={{ accentColor: 'var(--primary-accent)', width: '15px', height: '15px' }}
            />
            <span style={{ fontSize: '10.5px' }}>Tag bag</span>
          </label>
        </div>

        {/* 5. Fluid, Scrollable Suggestion List (Expands to fill all vertical height) */}
        <div
          className="packing-assistant-scroll-list"
          style={{
            padding: '12px 18px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            overscrollBehaviorY: 'contain',
            touchAction: 'pan-y',
            flex: '1 1 auto',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {displayedItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No items match this filter.
            </div>
          ) : (
            displayedItems.map((item) => {
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
                    padding: '9px 12px',
                    borderRadius: '12px',
                    background: isChecked ? 'rgba(15, 169, 143, 0.05)' : 'var(--bg-surface, #fff)',
                    border: isChecked ? '1.5px solid var(--primary-accent)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, background 0.15s ease',
                    gap: '10px',
                  }}
                  onClick={() => toggleItem(item.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(item.id)}
                      style={{
                        width: '18px',
                        height: '18px',
                        marginTop: '2px',
                        accentColor: 'var(--primary-accent)',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                        <span>{item.icon || '📦'}</span>
                        <span>{item.text}</span>

                        {isCabin && (
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 700,
                              background: 'rgba(14, 165, 233, 0.12)',
                              color: '#0284c7',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            ✈️ Cabin
                          </span>
                        )}
                        {isCheckin && (
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 700,
                              background: 'rgba(217, 119, 6, 0.12)',
                              color: '#d97706',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            🧳 Check-in
                          </span>
                        )}
                        {item.isLiquid && (
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 700,
                              background: 'rgba(20, 184, 166, 0.12)',
                              color: 'var(--primary-accent)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            🧴 ≤100ml
                          </span>
                        )}
                      </div>

                      {item.cabinNote && (
                        <div style={{ fontSize: '11px', color: isCabin ? '#0284c7' : isCheckin ? '#c2410c' : 'var(--text-secondary)', fontWeight: 500, marginTop: '2px', lineHeight: 1.3 }}>
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
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      padding: '2px 5px',
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

        {/* 6. Pinned High-Z-Index Footer with Native Safe Area Support */}
        <div
          style={{
            flexShrink: 0,
            padding: '12px 18px calc(12px + env(safe-area-inset-bottom, 8px))',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-surface, #ffffff)',
            boxShadow: '0 -6px 20px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
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
                borderRadius: '12px',
              }}
              disabled={selectedCount === 0 || isSubmitting}
              onClick={handleSaveAsNote}
              title="Export as a reference travel note"
            >
              <span>{noteSavedFeedback ? '✅ Saved!' : '📝 Save Note'}</span>
            </button>
          )}

          <button
            type="button"
            className="gradient-btn"
            style={{
              flex: 1,
              padding: '11px 16px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '12px',
              boxShadow: 'var(--shadow-md)',
            }}
            disabled={selectedCount === 0 || isSubmitting}
            onClick={handleAddSelected}
          >
            {isSubmitting
              ? 'Adding...'
              : `✓ Add ${selectedCount} Items (${selectedCabinCount} Cabin, ${selectedCheckinCount} Check-in)`}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
