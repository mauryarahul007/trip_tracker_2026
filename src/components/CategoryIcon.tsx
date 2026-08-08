import { IconCatFood, IconCatStay, IconCatTravel, IconCatActivities, IconCatShopping, IconCatMisc } from './Icons';

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

// Built-in categories get the app's line-icon set; custom categories keep
// whatever emoji the person picked for them in Settings — there's no way
// to auto-generate a matching line icon for an arbitrary custom category.
export function CategoryIcon({ categoryId, fallbackEmoji, size = 18, className }: Props) {
  const Icon = BUILT_IN_ICONS[categoryId];
  if (Icon) return <Icon size={size} className={className} />;
  return <span style={{ fontSize: size, lineHeight: 1 }}>{fallbackEmoji || '🏷️'}</span>;
}
