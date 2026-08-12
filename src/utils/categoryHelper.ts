export interface ParsedCategoryIcon {
  color: string;
  iconName: string;
  isEmoji: boolean;
}

export function parseCategoryIcon(iconString: string | undefined): ParsedCategoryIcon {
  if (!iconString) {
    return { color: 'var(--primary-accent)', iconName: 'Compass', isEmoji: false };
  }

  if (iconString.includes(':')) {
    const [color, iconName] = iconString.split(':');
    return {
      color: color || 'var(--primary-accent)',
      iconName: iconName || 'Compass',
      isEmoji: false
    };
  }

  // Check for emojis (non-ASCII characters)
  const isEmoji = /[^\x00-\x7F]/.test(iconString);
  if (isEmoji) {
    return {
      color: 'var(--border-color)',
      iconName: iconString,
      isEmoji: true
    };
  }

  return {
    color: 'var(--primary-accent)',
    iconName: iconString,
    isEmoji: false
  };
}

export function serializeCategoryIcon(color: string, iconName: string): string {
  return `${color}:${iconName}`;
}
