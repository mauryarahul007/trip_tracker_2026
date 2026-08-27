import { useRef } from 'react';
import type { Trip, Expense, Member, Category } from '../types';
import { calculateTripAchievements } from '../utils/achievementBadges';
import { IconClose, IconCheck, IconTrophy } from './Icons';
import { triggerHaptic } from '../utils/haptics';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface AchievementBadgeModalProps {
  trip: Trip;
  expenses: Expense[];
  members: Member[];
  categories: Category[];
  isFullySettled: boolean;
  onClose: () => void;
}

export function AchievementBadgeModal({
  trip,
  expenses,
  members,
  categories,
  isFullySettled,
  onClose,
}: AchievementBadgeModalProps) {
  const badges = calculateTripAchievements(trip, expenses, members, categories, isFullySettled);
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const cardRef = useRef<HTMLDivElement>(null);

  useFocusTrap(cardRef, true, false, onClose);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievements-modal-title"
        tabIndex={-1}
        className="modal-card fade-in"
        style={{
          maxWidth: '460px',
          padding: '24px',
          borderRadius: '24px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary-accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Squad Milestones
            </div>
            <h3 id="achievements-modal-title" style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconTrophy size={18} style={{ color: 'var(--color-warning)' }} aria-hidden="true" /> Trip Achievements
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {unlockedCount} of {badges.length} Enamel Pins Unlocked
            </div>
          </div>

          <button
            type="button"
            className="secondary-btn touch-target-btn"
            style={{ minWidth: '44px', minHeight: '44px', padding: '6px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Close achievements dialog"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
          >
            <IconClose size={16} />
          </button>
        </div>


        {/* Badges List */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '2px' }}>
          {badges.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '16px',
                border: b.unlocked ? '1.5px solid rgba(63, 203, 189, 0.35)' : '1px solid var(--border-color)',
                background: b.unlocked ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                opacity: b.unlocked ? 1 : 0.65,
                transition: 'all 0.2s ease',
              }}
            >
              {/* Badge Icon Pin */}
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  background: b.unlocked ? 'radial-gradient(circle at 35% 35%, rgba(63, 203, 189, 0.25), rgba(15, 111, 99, 0.1))' : 'rgba(0,0,0,0.05)',
                  border: b.unlocked ? '2px solid var(--primary-accent)' : '1.5px solid var(--border-color)',
                  boxShadow: b.unlocked ? '0 4px 12px rgba(15, 111, 99, 0.2)' : 'none',
                  flexShrink: 0,
                }}
              >
                {b.icon}
              </div>

              {/* Badge Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {b.title}
                  </span>
                  {b.unlocked ? (
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-success-text)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <IconCheck size={12} /> Unlocked
                    </span>
                  ) : (
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-family-mono)' }}>
                      {b.progressText}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.35 }}>
                  {b.subtitle}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
          <button
            type="button"
            className="primary-btn"
            style={{ width: '100%', padding: '10px' }}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
