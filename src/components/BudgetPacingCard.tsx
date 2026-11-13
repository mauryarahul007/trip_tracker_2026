import React, { useState } from 'react';
import type { Expense, Trip } from '../types';
import { calculateBudgetPacing } from '../utils/budgetPacing';
import { useTripStore } from '../store/tripStore';
import { triggerHaptic } from '../utils/haptics';
import { IconWallet, IconEdit, IconPlus, IconClose, IconCheck, IconAlertCircle } from './Icons';

interface BudgetPacingCardProps {
  trip: Trip;
  expenses: Expense[];
  className?: string;
  compact?: boolean;
}

export const BudgetPacingCard: React.FC<BudgetPacingCardProps> = ({
  trip,
  expenses,
  className = '',
  compact = false,
}) => {
  const setTripBudget = useTripStore((state) => state.setTripBudget);
  const currencySymbol = trip.baseCurrency || '₹';

  const pacing = calculateBudgetPacing(trip, expenses, { currencySymbol });

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(
    pacing.hasBudget ? String(Math.round(pacing.totalBudget)) : ''
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleOpenEdit = () => {
    triggerHaptic('light');
    setInputValue(pacing.hasBudget ? String(Math.round(pacing.totalBudget)) : '');
    setSaveError(null);
    setIsEditing(true);
  };

  const handleCloseEdit = () => {
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSaveBudget = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      await setTripBudget(trip.id, undefined);
      triggerHaptic('success');
      handleCloseEdit();
      return;
    }

    const num = parseFloat(trimmed);
    if (!Number.isFinite(num) || num < 0) {
      setSaveError('Please enter a valid positive budget amount');
      triggerHaptic('warning');
      return;
    }

    await setTripBudget(trip.id, num);
    triggerHaptic('success');
    handleCloseEdit();
  };

  const handleClearBudget = async () => {
    await setTripBudget(trip.id, undefined);
    triggerHaptic('light');
    handleCloseEdit();
  };

  const handleAddPreset = (amount: number) => {
    triggerHaptic('light');
    const curr = parseFloat(inputValue) || 0;
    setInputValue(String(Math.round(curr + amount)));
  };

  const statusColor =
    pacing.status === 'over_budget'
      ? 'var(--calm-danger, #B23A24)'
      : pacing.status === 'warning'
      ? 'var(--calm-budget-warn, #E8890C)'
      : 'var(--calm-success, #11733F)';

  const statusBg =
    pacing.status === 'over_budget'
      ? 'rgba(178, 58, 36, 0.12)'
      : pacing.status === 'warning'
      ? 'rgba(232, 137, 12, 0.14)'
      : 'rgba(17, 115, 63, 0.12)';

  const statusLabel =
    pacing.status === 'over_budget'
      ? 'Over Budget'
      : pacing.status === 'warning'
      ? 'Pacing Alert'
      : pacing.status === 'on_track'
      ? 'On Track'
      : 'No Budget';

  return (
    <div
      className={`budget-pacing-card ${className}`}
      style={{
        background: 'var(--bg-secondary, #FFFFFF)',
        border: '1px solid var(--border-color, #E3E3DA)',
        borderRadius: 'var(--border-radius-lg, 18px)',
        padding: compact ? '14px 16px' : '18px 20px',
        boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
        position: 'relative',
        overflow: 'hidden',
        margin: '10px 0 16px',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: pacing.hasBudget ? '12px' : '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--bg-primary, #F4F3EE)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-accent, #0E6B5E)',
            }}
          >
            <IconWallet size={17} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Daily Budget Pacing
            </div>
            {pacing.hasBudget && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                Day {pacing.elapsedDays} of {pacing.totalTripDays} • {pacing.remainingDays} days left
              </div>
            )}
          </div>
        </div>

        {pacing.hasBudget ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: statusColor,
                background: statusBg,
                padding: '3px 8px',
                borderRadius: 'var(--border-radius-pill, 9999px)',
                letterSpacing: '0.02em',
              }}
            >
              {statusLabel}
            </span>
            <button
              type="button"
              onClick={handleOpenEdit}
              aria-label="Edit trip budget"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '6px',
              }}
            >
              <IconEdit size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleOpenEdit}
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--primary-accent, #0E6B5E)',
              background: 'rgba(14, 107, 94, 0.08)',
              border: 'none',
              borderRadius: 'var(--border-radius-pill, 9999px)',
              padding: '5px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <IconPlus size={14} />
            Set Budget
          </button>
        )}
      </div>

      {/* Main Body */}
      {pacing.hasBudget ? (
        <>
          {/* Progress Bar & Today Burn Dial */}
          <div style={{ margin: '10px 0 12px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '6px',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Today's spend: </span>
                <strong style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 700 }}>
                  {currencySymbol}
                  {Math.round(pacing.todaySpent).toLocaleString()}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Daily target: </span>
                <strong style={{ fontSize: '13px', color: 'var(--primary-accent)', fontWeight: 600 }}>
                  {currencySymbol}
                  {Math.round(pacing.adjustedDailyAllowance).toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Linear pacing track */}
            <div
              style={{
                height: 8,
                background: 'var(--border-color, #E3E3DA)',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(0, pacing.budgetUsedPercent))}%`,
                  background: statusColor,
                  borderRadius: 4,
                  transition: 'width 0.4s var(--ease-spring)',
                }}
              />
            </div>
          </div>

          {/* Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '8px',
              padding: '10px 12px',
              background: 'var(--bg-primary, #F4F3EE)',
              borderRadius: 'var(--border-radius-md, 12px)',
              marginTop: '8px',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Spent
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {currencySymbol}{Math.round(pacing.totalSpent).toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                {pacing.budgetUsedPercent}% used
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Remaining
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: statusColor, marginTop: '2px' }}>
                {currencySymbol}{Math.round(pacing.remainingBudget).toLocaleString()}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                of {currencySymbol}{Math.round(pacing.totalBudget).toLocaleString()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Burn Rate
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {pacing.isOngoing && pacing.todayBurnRatio > 0 ? `${pacing.todayBurnRatio.toFixed(1)}x` : `${currencySymbol}${Math.round(pacing.plannedDailyBudget)}/d`}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                {pacing.isOngoing ? 'today pace' : 'planned'}
              </div>
            </div>
          </div>

          {/* Advice / Status Banner */}
          <div
            style={{
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: pacing.status === 'on_track' ? 'var(--text-secondary)' : statusColor,
              fontWeight: 500,
            }}
          >
            {pacing.status !== 'on_track' && <IconAlertCircle size={14} />}
            <span>{pacing.statusMessage}</span>
          </div>
        </>
      ) : (
        <div style={{ padding: '6px 0 2px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Set a planned spending budget for this trip to calculate your daily allowance and burn rate forecasts.
          </p>
        </div>
      )}

      {/* Edit Budget Modal / Dialog */}
      {isEditing && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={handleCloseEdit}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              background: 'var(--bg-secondary, #FFFFFF)',
              borderRadius: 'var(--border-radius-lg, 20px)',
              padding: '22px',
              boxShadow: 'var(--shadow-lg, 0 12px 36px rgba(0,0,0,0.2))',
              border: '1px solid var(--border-color, #E3E3DA)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconWallet size={19} className="icon" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Set Trip Budget
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseEdit}
                aria-label="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <IconClose size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Set your target spending budget for <strong>{trip.name}</strong> ({pacing.totalTripDays} days). Stored on this device only.
            </p>

            {/* Input with Currency Prefix */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--primary-accent, #0E6B5E)',
                }}
              >
                {currencySymbol}
              </span>
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                placeholder="0"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setSaveError(null);
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 36px',
                  fontSize: '18px',
                  fontWeight: 700,
                  borderRadius: 'var(--border-radius-md, 12px)',
                  border: saveError ? '1.5px solid var(--calm-danger, #B23A24)' : '1px solid var(--border-color, #E3E3DA)',
                  background: 'var(--bg-primary, #F4F3EE)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {saveError && (
              <div style={{ fontSize: '11px', color: 'var(--calm-danger, #B23A24)', marginBottom: '10px' }}>
                {saveError}
              </div>
            )}

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', alignSelf: 'center', marginRight: '4px' }}>
                Quick add:
              </span>
              <button
                type="button"
                onClick={() => handleAddPreset(5000)}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 'var(--border-radius-pill, 9999px)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                +{currencySymbol}5,000
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset(10000)}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 'var(--border-radius-pill, 9999px)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                +{currencySymbol}10,000
              </button>
              <button
                type="button"
                onClick={() => handleAddPreset(25000)}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 'var(--border-radius-pill, 9999px)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                +{currencySymbol}25,000
              </button>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              {pacing.hasBudget && (
                <button
                  type="button"
                  onClick={handleClearBudget}
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: 'var(--border-radius-md, 10px)',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--calm-danger, #B23A24)',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleCloseEdit}
                style={{
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: 'var(--border-radius-md, 10px)',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBudget}
                style={{
                  padding: '8px 18px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: 'var(--border-radius-md, 10px)',
                  border: 'none',
                  background: 'var(--primary-accent, #0E6B5E)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <IconCheck size={15} />
                Save Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
