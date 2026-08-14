type IconProps = {
  size?: number;
  className?: string;
};

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconExpenses({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V3z" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

export function IconMembers({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.3 14.2c2.6.4 4.5 2.7 4.5 5.8" />
    </svg>
  );
}

export function IconAnalytics({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <line x1="5" y1="20" x2="5" y2="12" />
      <line x1="10.5" y1="20" x2="10.5" y2="6" />
      <line x1="16" y1="20" x2="16" y2="14" />
      <line x1="21" y1="20" x2="21" y2="9" />
      <line x1="3" y1="20" x2="22" y2="20" />
    </svg>
  );
}

export function IconSettings({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.4M12 18.6V21M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M3 12h2.4M18.6 12H21M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" />
    </svg>
  );
}

export function IconPlus({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconEdit({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 20l1-4.5L16.5 4 20 7.5 8.5 19 4 20z" />
    </svg>
  );
}

export function IconTrash({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" />
    </svg>
  );
}

export function IconArchive({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <line x1="10" y1="12.5" x2="14" y2="12.5" />
    </svg>
  );
}

export function IconSearch({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="10.5" cy="10.5" r="6" />
      <line x1="19" y1="19" x2="15" y2="15" />
    </svg>
  );
}

export function IconDownload({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 4v11M8 11l4 4 4-4M4 19h16" />
    </svg>
  );
}

export function IconUpload({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 20V9M8 13l4-4 4 4M4 19h16" />
    </svg>
  );
}

export function IconCheck({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 12l4.5 4.5L19 7" />
    </svg>
  );
}

export function IconCheckCircle({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.3l2.4 2.4 4.6-5" />
    </svg>
  );
}

export function IconAlertCircle({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconChevronLeft({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function IconChevronRight({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function IconCalendar({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x="4" y="5.5" width="16" height="15" rx="1.5" />
      <path d="M4 10h16M8 3.5v4M16 3.5v4" />
    </svg>
  );
}

export function IconCatFood({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 2v6a1.5 1.5 0 003 0V2" />
      <path d="M7.5 2v20" />
      <path d="M17 2c-1.8 1-2.5 3-2.5 5.5S15.2 12 17 12v10" />
    </svg>
  );
}

export function IconCatStay({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 21V10l8-6 8 6v11" />
      <path d="M4 21h16" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

export function IconCatTravel({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3 11l18-8-8 18-2-8-8-2z" />
    </svg>
  );
}

export function IconCatActivities({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3 20l5-9 3.5 5L15 9l6 11H3z" />
    </svg>
  );
}

export function IconCatShopping({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6.5 8h11l-1 12h-9L6.5 8z" />
      <path d="M9 8V6.5a3 3 0 016 0V8" />
    </svg>
  );
}

export function IconCatMisc({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3 7.5l9-4 9 4-9 4-9-4z" />
      <path d="M3 7.5v9l9 4 9-4v-9" />
      <path d="M12 11.5v9" />
    </svg>
  );
}

export function IconArrowUpRight({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}

export function IconArrowDownRight({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M7 7l10 10M17 9v8h-8" />
    </svg>
  );
}

export function IconClose({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconShare({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <line x1="8.3" y1="10.7" x2="15.7" y2="6.3" />
      <line x1="8.3" y1="13.3" x2="15.7" y2="17.7" />
    </svg>
  );
}

export function IconCopy({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

export function IconSync({ size = 20, className = 'icon' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M21.5 2v6h-6M2.5 22v-6h6" />
      <path d="M20.5 13A9 9 0 0 1 5.7 18.3L2.5 16M3.5 11A9 9 0 0 1 18.3 5.7L21.5 8" />
    </svg>
  );
}

