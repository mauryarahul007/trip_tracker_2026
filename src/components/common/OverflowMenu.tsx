import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IconMoreVertical } from '../Icons';
import { triggerHaptic } from '../../utils/haptics';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  badge?: string | number;
  disabled?: boolean;
  divider?: boolean;
}

export interface OverflowMenuProps {
  items: MenuItem[];
  triggerIcon?: React.ReactNode;
  triggerAriaLabel?: string;
  className?: string;
  align?: 'left' | 'right';
}

export const OverflowMenu: React.FC<OverflowMenuProps> = ({
  items,
  triggerIcon,
  triggerAriaLabel = 'More options',
  className = '',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Outside click listener
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  return (
    <div ref={containerRef} className={`wa-overflow-container ${className}`}>
      <button
        type="button"
        className="wa-overflow-trigger-btn"
        onClick={toggle}
        aria-label={triggerAriaLabel}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {triggerIcon || <IconMoreVertical size={18} />}
      </button>

      {isOpen && (
        <div
          className={`wa-overflow-dropdown wa-menu-align-${align} wa-menu-enter`}
          role="menu"
          aria-orientation="vertical"
        >
          {items.map((item) => {
            if (item.divider) {
              return <div key={item.id} className="wa-overflow-divider" role="separator" />;
            }

            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={`wa-overflow-item ${item.destructive ? 'destructive' : ''}`}
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.disabled) return;
                  triggerHaptic('light');
                  close();
                  item.onClick();
                }}
              >
                {item.icon && <span className="wa-overflow-item-icon">{item.icon}</span>}
                <span className="wa-overflow-item-label">{item.label}</span>
                {item.badge && <span className="wa-overflow-item-badge">{item.badge}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
