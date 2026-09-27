import React from 'react';
import { createPortal } from 'react-dom';
import { triggerHaptic } from '../../utils/haptics';
import { useHistoryBack } from '../../utils/useHistoryBack';
import { useEscapeKey } from '../../utils/useEscapeKey';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useDragToDismiss } from '../../hooks/useDragToDismiss';

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
  /** Optional content above the item list (e.g. emoji reaction row). */
  header?: React.ReactNode;
  items: ActionSheetItem[];
  showCancel?: boolean;
  cancelLabel?: string;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  header,
  items,
  showCancel = true,
  cancelLabel = 'Cancel',
}) => {
  // Drag down to dismiss (skip if touching buttons)
  const { ref: sheetRef, handlers: dragHandlers } = useDragToDismiss<HTMLDivElement>(onClose, {
    ignoreSelector: '.wa-action-sheet-item, .wa-action-sheet-cancel-btn, .wa-action-sheet-reactions',
  });

  useHistoryBack(isOpen, onClose);
  useEscapeKey(isOpen, onClose);
  useFocusTrap(sheetRef, isOpen, false, onClose);

  if (!isOpen) return null;

  // Portal to body so trip-sheet transform / stacking context cannot trap
  // this overlay under the chat-first floating FAB (z-index 55).
  return createPortal(
    <div
      className="wa-action-sheet-backdrop"
      onClick={() => {
        triggerHaptic('light');
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'action-sheet-title' : undefined}
      aria-describedby={description ? 'action-sheet-desc' : undefined}
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        className="wa-action-sheet-card wa-sheet-enter"
        style={{
          transform: undefined,
          transition: 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
        {...dragHandlers}
      >
        <div className="wa-action-sheet-handle-wrap" aria-hidden="true">
          <span className="wa-action-sheet-drag-pill" />
        </div>

        {(title || description) && (
          <div className="wa-action-sheet-header">
            {title && <h3 id="action-sheet-title" className="wa-action-sheet-title">{title}</h3>}
            {description && <p id="action-sheet-desc" className="wa-action-sheet-desc">{description}</p>}
          </div>
        )}

        {header}

        <div className="wa-action-sheet-list" role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
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
    </div>,
    document.body
  );
};
