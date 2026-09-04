import React, { useEffect, useRef, useState } from 'react';
import { triggerHaptic } from '../../utils/haptics';

export interface ActionSheetItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  subtitle?: string;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  items: ActionSheetItem[];
  showCancel?: boolean;
  cancelLabel?: string;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  items,
  showCancel = true,
  cancelLabel = 'Cancel',
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Touch / pointer drag down to dismiss (skip if touching buttons)
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.wa-action-sheet-item, .wa-action-sheet-cancel-btn')) {
      return;
    }
    dragStartY.current = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const diff = e.clientY - dragStartY.current;
    if (diff > 8) {
      setDragOffset(diff - 8);
    }
  };

  const handlePointerUp = () => {
    if (dragStartY.current === null) return;
    if (dragOffset > 70) {
      triggerHaptic('light');
      onClose();
    }
    dragStartY.current = null;
    setDragOffset(0);
  };

  if (!isOpen) return null;

  return (
    <div
      className="wa-action-sheet-backdrop"
      onClick={() => {
        triggerHaptic('light');
        onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={sheetRef}
        className="wa-action-sheet-card wa-sheet-enter"
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: dragStartY.current ? 'none' : 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Drag Pill Handle */}
        <div className="wa-action-sheet-handle-wrap">
          <span className="wa-action-sheet-drag-pill" />
        </div>

        {/* Header (Optional) */}
        {(title || description) && (
          <div className="wa-action-sheet-header">
            {title && <h3 className="wa-action-sheet-title">{title}</h3>}
            {description && <p className="wa-action-sheet-desc">{description}</p>}
          </div>
        )}

        {/* Action Items List */}
        <div className="wa-action-sheet-list">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`wa-action-sheet-item ${item.destructive ? 'destructive' : ''} ${item.disabled ? 'disabled' : ''}`}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                triggerHaptic(item.destructive ? 'medium' : 'light');
                onClose();
                window.setTimeout(() => {
                  item.onClick();
                }, 10);
              }}
            >
              {item.icon && <span className="wa-action-sheet-item-icon">{item.icon}</span>}
              <div className="wa-action-sheet-item-text">
                <span className="wa-action-sheet-item-label">{item.label}</span>
                {item.subtitle && (
                  <span className="wa-action-sheet-item-subtitle">{item.subtitle}</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Cancel Button */}
        {showCancel && (
          <div className="wa-action-sheet-cancel-wrap">
            <button
              type="button"
              className="wa-action-sheet-cancel-btn"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
            >
              {cancelLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
