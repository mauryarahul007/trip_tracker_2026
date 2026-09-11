import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Trip, ChecklistItem, Member } from '../types';
import {
  generateSmartPackingSuggestions,
  inferSeasonalClimate,
  generatePackingGuideNote,
  type PackingSuggestionItem,
} from '../utils/packingSuggestions';
import { IconChevronLeft } from './Icons';
import { triggerHaptic } from '../utils/haptics';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useHistoryBack } from '../utils/useHistoryBack';
import { useScrollLock } from '../utils/useScrollLock';
import { newId } from '../utils/uuid';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  members?: Member[];
  weatherCondition?: string;
  avgTemp?: number;
  onBatchAddChecklist: (items: ChecklistItem[]) => Promise<void>;
  onSaveAsNote?: (note: { title: string; content: string; category: 'transport' | 'general' }) => Promise<void>;
}

type TabFilter = 'all' | 'cabin' | 'checkin' | 'squad';

// Helper to estimate realistic weight per item
function estimateItemWeightKg(item: PackingSuggestionItem, durationDays: number): number {
  if (item.id === 'cloth-tops') {
    const count = Math.min(durationDays + 2, 10);
    return Math.round(count * 0.18 * 10) / 10;
  }
  if (item.id === 'cloth-bottoms') {
    const count = Math.min(Math.ceil(durationDays / 2) + 1, 5);
    return Math.round(count * 0.38 * 10) / 10;
  }
  if (item.id === 'cloth-inner') {
    const count = Math.min(durationDays + 2, 10);
    return Math.round(count * 0.08 * 10) / 10;
  }
  if (item.id === 'cloth-shoes') return 0.85;
  if (item.id === 'cold-jacket') return 1.2;
  if (item.id === 'gear-trekking-poles') return 0.65;
  if (item.id === 'gear-multitool') return 0.25;
  if (item.id === 'elec-powerbank') return 0.35;
  if (item.id === 'squad-speaker') return 0.45;
  if (item.category === 'documents') return 0.05;
  if (item.category === 'medical') return 0.12;
  if (item.isLiquid) return 0.2;
  return 0.3;
}

export function SmartPackingAssistantModal({
  isOpen,
  onClose,
  trip,
  members = [],
  weatherCondition,
  avgTemp,
  onBatchAddChecklist,
  onSaveAsNote,
}: Props) {
  // Lightweight popover for airport tray checklist
  const [showTraySheet, setShowTraySheet] = useState(false);

  // Reset inner sub-states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowTraySheet(false);
    }
  }, [isOpen]);

  const handleBack = () => {
    setShowTraySheet(false);
    onClose();
  };

  // Lock body scroll while modal is active & wire back navigation
  useScrollLock(isOpen);
  useEscapeKey(isOpen, handleBack);
  useHistoryBack(isOpen, handleBack);

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [includeLuggageTag, setIncludeLuggageTag] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  // Squad carrier assignment for shared items (itemId -> { memberId, memberName })
  const [assignedCarriers, setAssignedCarriers] = useState<Record<string, { memberId: string; memberName: string }>>({});

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

  // Real-time duration adjustment in modal
  const [durationDays, setDurationDays] = useState<number>(computedDuration);

  useEffect(() => {
    setDurationDays(computedDuration);
  }, [computedDuration]);

  // Seasonal climate inference
  const seasonalClimate = useMemo(() => {
    return inferSeasonalClimate(trip.destination || trip.name, trip.startDate);
  }, [trip.destination, trip.name, trip.startDate]);

  // Effective weather condition & temp
  const effectiveWeather = useMemo(() => {
    if (weatherCondition && avgTemp !== undefined) {
      return { condition: weatherCondition, temp: avgTemp, label: `⛅ ${avgTemp}°C` };
    }
    return {
      condition: seasonalClimate.isCold ? 'Cold' : seasonalClimate.isRainy ? 'Rainy' : 'Fair',
      temp: avgTemp ?? seasonalClimate.estimatedTempC,
      label: `📅 ${seasonalClimate.seasonName}`,
    };
  }, [weatherCondition, avgTemp, seasonalClimate]);

  // Generate all smart packing suggestions
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

  // Selected item IDs state (defaults to selecting all)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(allSuggestions.map((s) => s.id)));

  // Sync selected IDs when item list updates
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

  const squadItems = useMemo(
    () => allSuggestions.filter((i) => i.scope === 'shared'),
    [allSuggestions]
  );

  // Filtered displayed items based on activeTab
  const displayedItems = useMemo(() => {
    if (activeTab === 'cabin') {
      return allSuggestions.filter((i) => i.airplaneEligibility !== 'checkin-only');
    }
    if (activeTab === 'checkin') {
      return allSuggestions.filter((i) => i.airplaneEligibility !== 'cabin-only');
    }
    if (activeTab === 'squad') {
      return allSuggestions.filter((i) => i.scope === 'shared');
    }
    return allSuggestions;
  }, [allSuggestions, activeTab]);

  // Real-time weights for bag pills
  const cabinWeightKg = useMemo(() => {
    const selectedCabin = allSuggestions.filter(
      (i) => selectedIds.has(i.id) && i.airplaneEligibility !== 'checkin-only'
    );
    const itemWeight = selectedCabin.reduce((acc, curr) => acc + estimateItemWeightKg(curr, durationDays), 0);
    return Math.round((0.8 + itemWeight) * 10) / 10;
  }, [allSuggestions, selectedIds, durationDays]);

  const checkinWeightKg = useMemo(() => {
    const selectedCheckin = allSuggestions.filter(
      (i) => selectedIds.has(i.id) && i.airplaneEligibility === 'checkin-only'
    );
    const itemWeight = selectedCheckin.reduce((acc, curr) => acc + estimateItemWeightKg(curr, durationDays), 0);
    return Math.round((selectedCheckin.length > 0 ? 3.2 + itemWeight : 0) * 10) / 10;
  }, [allSuggestions, selectedIds, durationDays]);

  // Mandatory Flight Essentials & Readiness Status
  const flightEssentials = useMemo(() => {
    return allSuggestions.filter((i) => i.isFlightEssential);
  }, [allSuggestions]);

  const packedEssentialsCount = useMemo(() => {
    return flightEssentials.filter((i) => selectedIds.has(i.id)).length;
  }, [flightEssentials, selectedIds]);

  const isFlightCleared = flightEssentials.length > 0 && packedEssentialsCount === flightEssentials.length;

  // Airport Tray 4 Key Items
  const trayItems = useMemo(() => {
    return [
      {
        id: 'elec-powerbank',
        title: 'Lithium Power Bank',
        subtitle: 'Cabin only • Never in checked hold',
        icon: '🔋',
        isPacked: selectedIds.has('elec-powerbank'),
      },
      {
        id: 'toil-mini-kit',
        title: '3-1-1 Liquids Pouch',
        subtitle: 'Containers ≤ 100ml in 1 clear quart bag',
        icon: '🧴',
        isPacked: selectedIds.has('toil-mini-kit') || selectedIds.has('beach-sunscreen'),
      },
      {
        id: 'doc-id',
        title: 'Passport & Photo ID',
        subtitle: 'In hand for security officers',
        icon: '🪪',
        isPacked: selectedIds.has('doc-id'),
      },
      {
        id: 'doc-tickets',
        title: 'Boarding Pass & Itinerary',
        subtitle: 'Digital pass or paper copy',
        icon: '🎫',
        isPacked: selectedIds.has('doc-tickets'),
      },
    ];
  }, [selectedIds]);

  const handleQuickPackTray = () => {
    triggerHaptic('success');
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add('elec-powerbank');
      next.add('toil-mini-kit');
      next.add('doc-id');
      next.add('doc-tickets');
      next.delete('unselected_elec-powerbank');
      next.delete('unselected_toil-mini-kit');
      next.delete('unselected_doc-id');
      next.delete('unselected_doc-tickets');
      return next;
    });
  };

  const handleAssignCarrier = (itemId: string, memberId: string) => {
    triggerHaptic('light');
    const member = members.find((m) => m.id === memberId);
    setAssignedCarriers((prev) => {
      if (!memberId || !member) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: { memberId: member.id, memberName: member.name },
      };
    });
  };

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
      const carrier = assignedCarriers[item.id];

      if (includeLuggageTag) {
        if (item.airplaneEligibility === 'cabin-only') {
          label = `[✈️ Cabin] ${label}`;
        } else if (item.airplaneEligibility === 'checkin-only') {
          label = `[🧳 Check-in] ${label}`;
        }
      }

      if (carrier) {
        label = `[🎒 ${carrier.memberName}] ${label}`;
      } else if (item.scope === 'shared') {
        label = `[👥 Squad] ${label}`;
      }

      return {
        id: newId(),
        text: label,
        category: item.category,
        completed: false,
        assignedTo: carrier?.memberName,
        assignedToMemberId: carrier?.memberId || null,
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

  const selectedCount = allSuggestions.filter((i) => selectedIds.has(i.id)).length;
  const totalEstimatedWeight = Math.round((cabinWeightKg + checkinWeightKg) * 10) / 10;

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
        alignItems: 'flex-end',
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
          maxWidth: '680px',
          height: 'min(92dvh, 780px)',
          maxHeight: 'min(92dvh, 780px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface, #ffffff)',
          borderTopLeftRadius: '22px',
          borderTopRightRadius: '22px',
          borderBottomLeftRadius: '0',
          borderBottomRightRadius: '0',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Mobile Pull Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 2px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '999px', background: 'var(--border-color, rgba(0,0,0,0.15))' }} />
        </div>

        {/* 1. Ultra-Compact Header (Stable one-line title & subtitle, no shifting) */}
        <div
          style={{
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-surface-elevated, rgba(15,23,42,0.02))',
            flexShrink: 0,
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            {/* Dedicated in-app Back Button to return to previous screen */}
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back to Notes"
              title="Back to Notes"
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
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <IconChevronLeft size={18} />
            </button>

            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9px',
                background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(14, 165, 233, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '17px',
                flexShrink: 0,
              }}
            >
              ✈️
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                <h3 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  Smart Packing
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--primary-accent)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {trip.destination || trip.name}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px', whiteSpace: 'nowrap' }}>
                <span>{effectiveWeather.label}</span>
                <span>•</span>
                <span>{durationDays} Days</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* Compact Flight Ready / Tray Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowTraySheet(!showTraySheet);
              }}
              title="View Airport Security Scanner Tray details"
              style={{
                padding: '4px 8px',
                borderRadius: '12px',
                border: isFlightCleared ? '1px solid #10b981' : '1px solid rgba(14, 165, 233, 0.3)',
                background: isFlightCleared ? 'rgba(16, 185, 129, 0.12)' : 'rgba(14, 165, 233, 0.08)',
                color: isFlightCleared ? '#059669' : '#0284c7',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{isFlightCleared ? '✈️ Flight Ready ✓' : `🛂 ${packedEssentialsCount}/${flightEssentials.length} Essentials`}</span>
            </button>

            <button
              type="button"
              onClick={handleBack}
              aria-label="Close"
              title="Close"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-surface-elevated, rgba(0,0,0,0.04))',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2. Popover: Airport Security Scanner Tray (only shown when tapped) */}
        {showTraySheet && (
          <div
            style={{
              padding: '10px 16px',
              background: '#0f172a',
              color: '#f8fafc',
              borderBottom: '1px solid var(--border-color)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px' }}>🛃</span>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#38bdf8' }}>
                  Pre-Flight Security Checkpoint Tray (TSA / ICAO)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleQuickPackTray}
                  style={{
                    background: 'rgba(56, 189, 248, 0.2)',
                    border: '1px solid #38bdf8',
                    color: '#38bdf8',
                    borderRadius: '8px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Pack All 4
                </button>
                <button
                  type="button"
                  onClick={() => setShowTraySheet(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
              {trayItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: item.isPacked ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                    border: item.isPacked ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '15px' }}>{item.icon}</span>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, color: item.isPacked ? '#34d399' : '#f87171' }}>
                      {item.isPacked ? '✓ In Tray' : '⚠️ Missing'}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700 }}>{item.title}</span>
                  <span style={{ fontSize: '9px', color: '#94a3b8' }}>{item.subtitle}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Single-Row Streamlined Toolbar (Segmented Filters + Stepper + Select All) */}
        <div
          style={{
            padding: '6px 14px',
            background: 'var(--bg-surface, #fff)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexShrink: 0,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Segmented Bag & Scope Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('all');
              }}
              style={{
                padding: '4px 9px',
                borderRadius: '14px',
                fontSize: '11px',
                fontWeight: activeTab === 'all' ? 700 : 500,
                background: activeTab === 'all' ? 'var(--primary-accent)' : 'transparent',
                color: activeTab === 'all' ? '#fff' : 'var(--text-secondary)',
                border: activeTab === 'all' ? 'none' : '1px solid var(--border-color)',
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
                setActiveTab('cabin');
              }}
              style={{
                padding: '4px 9px',
                borderRadius: '14px',
                fontSize: '11px',
                fontWeight: activeTab === 'cabin' ? 700 : 500,
                background: activeTab === 'cabin' ? '#0284c7' : 'transparent',
                color: activeTab === 'cabin' ? '#fff' : 'var(--text-secondary)',
                border: activeTab === 'cabin' ? 'none' : '1px solid var(--border-color)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Items eligible for aircraft cabin (ICAO rule)"
            >
              ✈️ Cabin (~{cabinWeightKg}kg)
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('checkin');
              }}
              style={{
                padding: '4px 9px',
                borderRadius: '14px',
                fontSize: '11px',
                fontWeight: activeTab === 'checkin' ? 700 : 500,
                background: activeTab === 'checkin' ? '#d97706' : 'transparent',
                color: activeTab === 'checkin' ? '#fff' : 'var(--text-secondary)',
                border: activeTab === 'checkin' ? 'none' : '1px solid var(--border-color)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Items required in checked baggage"
            >
              🧳 Hold (~{checkinWeightKg}kg)
            </button>

            {squadItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab('squad');
                }}
                style={{
                  padding: '4px 9px',
                  borderRadius: '14px',
                  fontSize: '11px',
                  fontWeight: activeTab === 'squad' ? 700 : 500,
                  background: activeTab === 'squad' ? '#7c3aed' : 'transparent',
                  color: activeTab === 'squad' ? '#fff' : 'var(--text-secondary)',
                  border: activeTab === 'squad' ? 'none' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                title="Shared gear for squad (avoid duplicate items)"
              >
                👥 Squad ({squadItems.length})
              </button>
            )}
          </div>

          {/* Right controls: Duration Stepper + Select All */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Compact Days Stepper */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                background: 'var(--bg-surface-elevated, rgba(0,0,0,0.02))',
                padding: '1px 3px',
              }}
            >
              <button
                type="button"
                onClick={() => handleDaysChange(-1)}
                disabled={durationDays <= 1}
                style={{
                  border: 'none',
                  background: 'transparent',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  fontWeight: 700,
                  cursor: durationDays <= 1 ? 'not-allowed' : 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                }}
              >
                -
              </button>
              <span style={{ padding: '0 4px', fontWeight: 700, fontSize: '11px', minWidth: '24px', textAlign: 'center' }}>
                {durationDays}d
              </span>
              <button
                type="button"
                onClick={() => handleDaysChange(1)}
                disabled={durationDays >= 60}
                style={{
                  border: 'none',
                  background: 'transparent',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  fontWeight: 700,
                  cursor: durationDays >= 60 ? 'not-allowed' : 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                }}
              >
                +
              </button>
            </div>

            {/* Select All / Clear */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: 'var(--primary-accent)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                onClick={selectAll}
              >
                All
              </button>
              <span style={{ color: 'var(--text-muted)' }}>/</span>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                onClick={deselectAll}
              >
                None
              </button>
            </div>
          </div>
        </div>

        {/* 4. Main Suggestions List (Fills ~80%+ of Modal Height) */}
        <div
          className="packing-assistant-scroll-list"
          style={{
            padding: '10px 14px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            overscrollBehaviorY: 'contain',
            touchAction: 'pan-y',
            flex: '1 1 auto',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {displayedItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No packing items match the selected filter.
            </div>
          ) : (
            displayedItems.map((item) => {
              const isChecked = selectedIds.has(item.id);
              const isCabin = item.airplaneEligibility === 'cabin-only';
              const isCheckin = item.airplaneEligibility === 'checkin-only';
              const isShared = item.scope === 'shared';
              const carrier = assignedCarriers[item.id];

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: isChecked ? 'rgba(20, 184, 166, 0.05)' : 'var(--bg-surface, #fff)',
                    border: isChecked ? '1.5px solid var(--primary-accent)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, background 0.15s ease',
                    gap: '8px',
                  }}
                  onClick={() => toggleItem(item.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(item.id)}
                      style={{
                        width: '17px',
                        height: '17px',
                        marginTop: '2px',
                        accentColor: 'var(--primary-accent)',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                        <span>{item.icon || '📦'}</span>
                        <span>{item.text}</span>

                        {isCabin && (
                          <span
                            style={{
                              fontSize: '9px',
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
                              fontSize: '9px',
                              fontWeight: 700,
                              background: 'rgba(217, 119, 6, 0.12)',
                              color: '#d97706',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            🧳 Hold
                          </span>
                        )}
                        {item.isLiquid && (
                          <span
                            style={{
                              fontSize: '9px',
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
                        {isShared && (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              background: 'rgba(139, 92, 246, 0.12)',
                              color: '#7c3aed',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            👥 Squad
                          </span>
                        )}
                      </div>

                      {item.cabinNote && (
                        <div style={{ fontSize: '10.5px', color: isCabin ? '#0284c7' : isCheckin ? '#c2410c' : 'var(--text-secondary)', fontWeight: 500, marginTop: '2px', lineHeight: 1.3 }}>
                          ℹ️ {item.cabinNote}
                        </div>
                      )}

                      {item.reason && !item.cabinNote && (
                        <div style={{ fontSize: '10.5px', color: 'var(--primary-accent)', fontWeight: 500, marginTop: '2px' }}>
                          💡 {item.reason}
                        </div>
                      )}

                      {/* Squad carrier assignment dropdown */}
                      {isShared && members.length > 0 && (
                        <div
                          style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                            🎒 Carrier:
                          </span>
                          <select
                            value={carrier?.memberId || ''}
                            onChange={(e) => handleAssignCarrier(item.id, e.target.value)}
                            style={{
                              fontSize: '10px',
                              padding: '1px 5px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              background: carrier ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-surface, #fff)',
                              color: carrier ? '#7c3aed' : 'var(--text-primary)',
                              fontWeight: carrier ? 700 : 500,
                              cursor: 'pointer',
                            }}
                          >
                            <option value="">Unassigned (Squad)</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '8.5px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '1px 4px',
                        borderRadius: '4px',
                        background: 'rgba(0,0,0,0.04)',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                      }}
                    >
                      {item.category}
                    </span>
                    <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 500 }}>
                      ~{estimateItemWeightKg(item, durationDays)}kg
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. Footer (Pinned at Bottom with Safe Area) */}
        <div
          style={{
            flexShrink: 0,
            padding: '10px 14px calc(10px + env(safe-area-inset-bottom, 8px))',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-surface, #ffffff)',
            boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={includeLuggageTag}
              onChange={(e) => setIncludeLuggageTag(e.target.checked)}
              style={{ accentColor: 'var(--primary-accent)', width: '14px', height: '14px' }}
            />
            <span>Tag bag</span>
          </label>

          {onSaveAsNote && (
            <button
              type="button"
              className="secondary-btn"
              style={{
                flex: '0 0 auto',
                padding: '9px 12px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '10px',
              }}
              disabled={selectedCount === 0 || isSubmitting}
              onClick={handleSaveAsNote}
              title="Save packing guide to trip notes"
            >
              <span>{noteSavedFeedback ? '✅ Saved!' : '📝 Note'}</span>
            </button>
          )}

          <button
            type="button"
            className="gradient-btn"
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              borderRadius: '10px',
              boxShadow: 'var(--shadow-md)',
            }}
            disabled={selectedCount === 0 || isSubmitting}
            onClick={handleAddSelected}
          >
            {isSubmitting
              ? 'Adding...'
              : `✓ Add ${selectedCount} Items (~${totalEstimatedWeight}kg)`}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
