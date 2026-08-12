import React from 'react';
import { IconCatFood, IconCatStay, IconCatTravel, IconCatActivities, IconCatShopping, IconCatMisc } from './Icons';
import { parseCategoryIcon } from '../utils/categoryHelper';
import * as LucideIcons from 'lucide-react';

const BUILT_IN_ICONS: Record<string, (props: { size?: number; className?: string }) => React.ReactElement> = {
  'cat-food': IconCatFood,
  'cat-stay': IconCatStay,
  'cat-travel': IconCatTravel,
  'cat-activities': IconCatActivities,
  'cat-shopping': IconCatShopping,
  'cat-misc': IconCatMisc,
};

type Props = {
  categoryId: string;
  fallbackEmoji?: string;
  size?: number;
  className?: string;
};

export function CategoryIcon({ categoryId, fallbackEmoji, size = 18, className }: Props) {
  // Built-in categories get the app's line-icon set
  const BuiltInIcon = BUILT_IN_ICONS[categoryId];
  if (BuiltInIcon) {
    return <BuiltInIcon size={size} className={className} />;
  }

  // Custom categories or fallback category icon strings
  const { color, iconName, isEmoji } = parseCategoryIcon(fallbackEmoji);

  if (isEmoji) {
    return <span className={className} style={{ fontSize: size, lineHeight: 1 }}>{iconName}</span>;
  }

  // Look up the Lucide icon dynamically
  const LucideIcon = (LucideIcons as any)[iconName];
  if (LucideIcon) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size + 8,
          height: size + 8,
          borderRadius: '50%',
          backgroundColor: color,
          color: '#FFFDF6', // warm white
          flexShrink: 0
        }}
      >
        <LucideIcon size={size - 4} strokeWidth={2.5} />
      </span>
    );
  }

  // Final fallback
  return <span className={className} style={{ fontSize: size, lineHeight: 1 }}>🏷️</span>;
}
