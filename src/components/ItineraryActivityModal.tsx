import React, { useState } from 'react';
import type { ItineraryCategory, ItineraryItem } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { IconMapPin, IconPlus, IconX } from './Icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<ItineraryItem, 'id' | 'createdAt' | 'updatedAt' | 'tripId'>) => Promise<void>;
  onDelete?: () => Promise<void>;
  initialDate?: string;
  initialItem?: ItineraryItem | null;
  tripStartDate?: string;
  tripEndDate?: string;
}

const CATEGORIES: { id: ItineraryCategory; label: string; icon: string }[] = [
  { id: 'activity', label: 'Activity', icon: '🎟️' },
  { id: 'food', label: 'Dining', icon: '🍝' },
  { id: 'sightseeing', label: 'Sightseeing', icon: '🏛️' },
  { id: 'transport', label: 'Transit', icon: '🚕' },
  { id: 'lodging', label: 'Stay', icon: '🏨' },
  { id: 'other', label: 'Other', icon: '✨' },
];

export const ItineraryActivityModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialDate,
  initialItem,
  tripStartDate,
  tripEndDate,
}) => {
  const [title, setTitle] = useState(initialItem?.title || '');
  const [date, setDate] = useState(initialItem?.date || initialDate || tripStartDate || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(initialItem?.time || '10:00');
  const [category, setCategory] = useState<ItineraryCategory>(initialItem?.category || 'activity');
  const [location, setLocation] = useState(initialItem?.location || '');
  const [notes, setNotes] = useState(initialItem?.notes || '');
  const [costEstimate, setCostEstimate] = useState<string>(
    initialItem?.costEstimate ? String(initialItem.costEstimate) : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an activity title.');
      triggerHaptic('warning');
      return;
    }
    if (!date) {
      setError('Please pick a date for this activity.');
      triggerHaptic('warning');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const parsedCost = costEstimate ? parseFloat(costEstimate) : undefined;
      await onSave({
        title: title.trim(),
        date,
        time: time.trim() || undefined,
        category,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        costEstimate: parsedCost && Number.isFinite(parsedCost) ? parsedCost : undefined,
        completed: initialItem?.completed ?? false,
      });
      triggerHaptic('success');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save itinerary activity.');
      triggerHaptic('warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      setIsSubmitting(true);
      await onDelete();
      triggerHaptic('light');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete activity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="itinerary-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card-surface"
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🗓️</span>
            <h3 id="itinerary-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
              {initialItem ? 'Edit Itinerary Activity' : 'Add Itinerary Activity'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              padding: '6px',
            }}
            aria-label="Close"
          >
            <IconX size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--color-danger, #ef4444)',
              color: 'var(--color-danger, #ef4444)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              ACTIVITY TITLE *
            </label>
            <input
              type="text"
              className="text-input"
              placeholder="e.g. Colosseum Tour, Dinner at Roscioli"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', borderRadius: '12px', padding: '10px 14px', fontSize: '15px' }}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                DATE *
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="date"
                  className="text-input"
                  min={tripStartDate}
                  max={tripEndDate}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ width: '100%', borderRadius: '12px', padding: '10px 12px', fontSize: '14px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                TIME (OPTIONAL)
              </label>
              <input
                type="time"
                className="text-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{ width: '100%', borderRadius: '12px', padding: '10px 12px', fontSize: '14px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              CATEGORY
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setCategory(cat.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected
                        ? '1.5px solid var(--primary-accent)'
                        : '1px solid var(--border-color)',
                      backgroundColor: isSelected
                        ? 'rgba(var(--primary-accent-rgb, 59, 130, 246), 0.15)'
                        : 'var(--bg-surface)',
                      color: isSelected ? 'var(--primary-accent)' : 'var(--text-primary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              LOCATION / VENUE
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <IconMapPin size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="text-input"
                placeholder="Address or Google Maps landmark"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{ width: '100%', borderRadius: '12px', padding: '10px 12px 10px 36px', fontSize: '14px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              NOTES & RESERVATIONS
            </label>
            <textarea
              className="text-input"
              rows={2}
              placeholder="Booking refs, dress code, confirmation codes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', borderRadius: '12px', padding: '10px 14px', fontSize: '14px', resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              ESTIMATED COST (OPTIONAL)
            </label>
            <input
              type="number"
              className="text-input"
              placeholder="Estimated budget amount"
              value={costEstimate}
              onChange={(e) => setCostEstimate(e.target.value)}
              style={{ width: '100%', borderRadius: '12px', padding: '10px 14px', fontSize: '14px' }}
              min="0"
              step="any"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            {initialItem && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="btn btn-secondary"
                style={{
                  color: 'var(--color-danger, #ef4444)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '10px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{
                flex: 2,
                padding: '10px',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: 'var(--primary-accent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <IconPlus size={16} />
              {isSubmitting ? 'Saving...' : initialItem ? 'Update Activity' : 'Add to Day'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
