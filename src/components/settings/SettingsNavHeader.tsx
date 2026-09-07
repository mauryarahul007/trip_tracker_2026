import type { ReactNode } from 'react';
import { IconChevronLeft } from '../Icons';

type SettingsSubscreenFrameProps = {
  parentTitle: string;
  onBack: () => void;
  title: string;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
};

export function SettingsSubscreenFrame({
  parentTitle,
  onBack,
  title,
  subtitle,
  headerRight,
  children,
}: SettingsSubscreenFrameProps) {
  return (
    <div className="settings-container">
      <div className="settings-subscreen-nav-header">
        <button
          type="button"
          className="settings-subscreen-back-link"
          onClick={onBack}
          aria-label={`Back to ${parentTitle}`}
        >
          <IconChevronLeft size={18} />
          <span>{parentTitle}</span>
        </button>
        {headerRight}
      </div>
      <h3 className="settings-subscreen-main-title">{title}</h3>
      {subtitle ? <p className="settings-subscreen-subtitle">{subtitle}</p> : null}
      {children}
    </div>
  );
}
