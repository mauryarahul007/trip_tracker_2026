import React from 'react';
import { IconCatFood, IconCatStay, IconCatTravel, IconCatActivities, IconCatShopping, IconCatMisc } from './Icons';
import { parseCategoryIcon } from '../utils/categoryHelper';
import {
  Compass,
  Tag,
  Sparkles,
  MapPin,
  Utensils,
  Plane,
  Bed,
  ShoppingBag,
  DollarSign,
  Coffee,
  Car,
  Fuel,
  Gift,
  Music,
  Heart,
  Camera,
  Ticket,
  FileText,
  MoreHorizontal,
  Film,
  Wine,
  Landmark,
  Building,
  Mountain,
  Bus,
  Train,
  Ship,
  Briefcase,
  GraduationCap,
  Stethoscope,
  Bike,
  Shield,
  Receipt,
  Palmtree,
  Trees,
  Footprints,
  Key,
  Sun,
  Moon,
  Tv,
  Dumbbell,
  Umbrella,
  Waves,
  Smartphone,
  Laptop,
  CreditCard,
  Luggage,
  Pizza,
  Beer,
  Tent,
} from 'lucide-react';

const BUILT_IN_ICONS: Record<string, (props: { size?: number; className?: string }) => React.ReactElement> = {
  'cat-food': IconCatFood,
  'cat-stay': IconCatStay,
  'cat-travel': IconCatTravel,
  'cat-activities': IconCatActivities,
  'cat-shopping': IconCatShopping,
  'cat-misc': IconCatMisc,
};

type LucideIconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const LUCIDE_ICON_MAP: Record<string, LucideIconComponent> = {
  Compass,
  Tag,
  Sparkles,
  MapPin,
  Utensils,
  Plane,
  Bed,
  ShoppingBag,
  DollarSign,
  Coffee,
  Car,
  Fuel,
  Gift,
  Music,
  Heart,
  Camera,
  Ticket,
  FileText,
  MoreHorizontal,
  Film,
  Wine,
  Landmark,
  Building,
  Mountain,
  Bus,
  Train,
  Ship,
  Briefcase,
  GraduationCap,
  Stethoscope,
  Bike,
  Shield,
  Receipt,
  Palmtree,
  Trees,
  Footprints,
  Key,
  Sun,
  Moon,
  Tv,
  Dumbbell,
  Umbrella,
  Waves,
  Smartphone,
  Laptop,
  CreditCard,
  Luggage,
  Pizza,
  Beer,
  Tent,
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

  // Look up the Lucide icon from the tree-shaken dictionary, fallback to Compass
  const LucideIcon =
    LUCIDE_ICON_MAP[iconName] ||
    LUCIDE_ICON_MAP[iconName.charAt(0).toUpperCase() + iconName.slice(1)] ||
    Compass;

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
          flexShrink: 0,
        }}
      >
        <LucideIcon size={size - 4} strokeWidth={2.5} />
      </span>
    );
  }

  // Final fallback
  return <span className={className} style={{ fontSize: size, lineHeight: 1 }}>🏷️</span>;
}
