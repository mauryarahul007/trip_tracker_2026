import type { ReactNode } from 'react';

type SwitchProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
};

export function SettingsSwitch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <label className="settings-switch">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="settings-switch-track" aria-hidden="true" />
    </label>
  );
}

type RowProps = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  children?: ReactNode;
};

export function SettingsToggleRow({
  icon,
  title,
  subtitle,
  checked,
  onChange,
  label,
  disabled,
  children,
}: RowProps) {
  return (
    <div className={`settings-row-item${children ? ' settings-row-item-stack' : ''}`}>
      <div className="settings-toggle-line">
        <div className="settings-row-left">
          <div className="settings-squircle" aria-hidden="true">{icon}</div>
          <div className="settings-row-texts">
            <span className="settings-row-title">{title}</span>
            {subtitle ? <span className="settings-row-subtitle">{subtitle}</span> : null}
          </div>
        </div>
        <SettingsSwitch checked={checked} onChange={onChange} label={label} disabled={disabled} />
      </div>
      {children}
    </div>
  );
}
