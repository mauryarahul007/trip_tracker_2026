import React from 'react';
import { IconChevronRight } from '../Icons';
import { triggerHaptic } from '../../utils/haptics';

export type SquircleGlow =
  | 'emerald'
  | 'amber'
  | 'blue'
  | 'indigo'
  | 'teal'
  | 'orange'
  | 'purple'
  | 'slate'
  | 'rose'
  | 'red';

export interface SettingsCellProps {
  icon?: React.ReactNode;
  iconGlow?: SquircleGlow;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  badge?: React.ReactNode;
  rightElement?: React.ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  hasDivider?: boolean;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

export const SettingsCell: React.FC<SettingsCellProps> = ({
  icon,
  iconGlow = 'teal',
  title,
  subtitle,
  value,
  badge,
  rightElement,
  chevron = true,
  onClick,
  disabled = false,
  destructive = false,
  hasDivider = true,
  className = '',
  style,
  'aria-label': ariaLabel,
}) => {
  const isClickable = Boolean(onClick) && !disabled;

  const handleClick = () => {
    if (!isClickable) return;
    triggerHaptic('light');
    onClick?.();
  };

  const content = (
    <>
      <div className="settings-row-left">
        {icon && (
          <div
            className={`settings-squircle squircle-${iconGlow}-glow${destructive ? ' squircle-red-glow' : ''}`}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <div className="settings-row-texts">
          <span
            className="settings-row-title"
            style={destructive ? { color: 'var(--color-danger, #EF4444)' } : undefined}
          >
            {title}
          </span>
          {subtitle && <span className="settings-row-subtitle">{subtitle}</span>}
        </div>
      </div>

      <div className="settings-row-right">
        {value && <span className="settings-cell-value">{value}</span>}
        {badge && <span className="settings-badge-pill">{badge}</span>}
        {rightElement}
        {isClickable && !rightElement && chevron && (
          <IconChevronRight size={16} className="settings-cell-chevron" />
        )}
      </div>
    </>
  );

  const wrapperClass = `settings-row-item ${hasDivider ? 'with-inset-divider' : 'no-divider'} ${destructive ? 'destructive-cell' : ''} ${className}`;

  if (isClickable) {
    return (
      <button
        type="button"
        className={wrapperClass}
        onClick={handleClick}
        disabled={disabled}
        style={style}
        aria-label={ariaLabel || (typeof title === 'string' ? title : undefined)}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={wrapperClass}
      style={{ ...style, cursor: 'default' }}
      aria-label={ariaLabel}
    >
      {content}
    </div>
  );
};
