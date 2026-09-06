import { useState, useMemo } from 'react';
import type { Trip, ChecklistItem } from '../types';
import { generateSmartPackingSuggestions, type PackingSuggestionItem } from '../utils/packingSuggestions';
import { triggerHaptic } from '../utils/haptics';
import { useEscapeKey } from '../utils/useEscapeKey';
import { newId } from '../utils/uuid';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  weatherCondition?: string;
  avgTemp?: number;
  onBatchAddChecklist: (items: ChecklistItem[]) => Promise<void>;
}

export function SmartPackingAssistantModal({
  isOpen,
  onClose,
  trip,
  weatherCondition,
  avgTemp,
  onBatchAddChecklist,
}: Props) {
  // Compute trip duration in days
  const durationDays = useMemo(() => {
    if (!trip.startDate || !trip.endDate) return 3;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diff = Math.round(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  }, [trip.startDate, trip.endDate]);

  // Generate suggestions
  const suggestions = useMemo(() => {
    return generateSmartPackingSuggestions({
      destination: trip.destination || trip.name,
      durationDays,
      weatherCondition,
      avgTemp,
      isInternational: Boolean((trip.baseCurrency && trip.baseCurrency !== 'INR') || (trip.destination && ['bali', 'phuket', 'tokyo', 'dubai', 'london', 'paris', 'alps'].some((c) => trip.destination?.toLowerCase().includes(c)))),
    });
  }, [trip.destination, trip.name, trip.baseCurrency, durationDays, weatherCondition, avgTemp]);

  // Selected item IDs state (default all checked)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(suggestions.map((s) => s.id)));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEscapeKey(isOpen, onClose);

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
    const newChecklistItems: ChecklistItem[] = selectedItems.map((item: PackingSuggestionItem) => ({
      id: newId(),
      text: item.text,
      category: item.category,
      completed: false,
      createdAt: now,
      updatedAt: now,
    }));

    await onBatchAddChecklist(newChecklistItems);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="glass-card modal-sheet fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '580px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '24px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>🧳</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Smart Packing Assistant</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {trip.destination || trip.name} • {durationDays} {durationDays === 1 ? 'day' : 'days'}
                {avgTemp ? ` • ${avgTemp}°C` : ''}
                {weatherCondition ? ` • ${weatherCondition}` : ''}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>

        {/* Intelligence Banner */}
        <div style={{ padding: '10px 20px', background: 'rgba(15, 169, 143, 0.08)', borderBottom: '1px solid rgba(15, 169, 143, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <div style={{ color: 'var(--primary-accent)', fontWeight: 600 }}>
            ✨ Tailored to destination & weather forecast
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
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

        {/* Suggestion Item List */}
        <div style={{ padding: '14px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {suggestions.map((item) => {
            const isChecked = selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: isChecked ? 'rgba(15, 169, 143, 0.05)' : 'var(--bg-surface, #fff)',
                  border: isChecked ? '1px solid rgba(15, 169, 143, 0.3)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onClick={() => toggleItem(item.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleItem(item.id)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary-accent)', cursor: 'pointer' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{item.icon || '📦'}</span>
                      <span>{item.text}</span>
                    </div>
                    {item.reason && (
                      <div style={{ fontSize: '10.5px', color: 'var(--primary-accent)', fontWeight: 500, marginTop: '2px' }}>
                        💡 {item.reason}
                      </div>
                    )}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(0,0,0,0.04)',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                >
                  {item.category}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-surface-elevated, rgba(15,23,42,0.02))' }}>
          <button
            type="button"
            className="gradient-btn"
            style={{ width: '100%', padding: '10px', fontSize: '13px' }}
            disabled={selectedIds.size === 0 || isSubmitting}
            onClick={handleAddSelected}
          >
            {isSubmitting ? 'Adding...' : `✓ Add ${selectedIds.size} Items to Trip Packing List`}
          </button>
        </div>
      </div>
    </div>
  );
}
