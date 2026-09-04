import React from 'react';

export interface SettingsSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  footerNote?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  footerNote,
  children,
  className = '',
  style,
}) => {
  return (
    <section className={`settings-group ${className}`} style={style}>
      {title && <h3 className="settings-group-title">{title}</h3>}
      {description && <p className="settings-group-desc">{description}</p>}
      <div className="settings-group-card">{children}</div>
      {footerNote && <div className="settings-scope-note">{footerNote}</div>}
    </section>
  );
};
