// Fixed colors for the built-in categories (keeps their charts/stripes
// consistent across sessions); anything else (custom categories) gets a
// deterministic hash-based hue so it's stable per id without needing a
// stored color field on Category.
const CATEGORY_COLORS: Record<string, string> = {
  'cat-food': '#6366f1', // Indigo
  'cat-stay': '#3b82f6', // Blue
  'cat-travel': '#db2777', // Pink — was cyan, too close to Stay's blue on the wheel
  'cat-activities': '#10b981', // Emerald
  'cat-shopping': '#f59e0b', // Amber
  'cat-misc': '#8b5cf6', // Violet
};

export function getCatColor(id: string, _idx: number): string {
  if (CATEGORY_COLORS[id]) return CATEGORY_COLORS[id];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}
