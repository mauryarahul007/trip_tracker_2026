// "Alice", "Alice & Bob", "Alice, Bob & Charlie" -- first names only, comma
// separated with "&" before the last, so a group name stays skimmable at a
// glance no matter how many members are in it.
export function buildAutoGroupName(names: string[]): string {
  const firstNames = names.map((n) => n.trim().split(/\s+/)[0]);
  if (firstNames.length === 0) return '';
  if (firstNames.length === 1) return firstNames[0];
  if (firstNames.length === 2) return `${firstNames[0]} & ${firstNames[1]}`;
  return `${firstNames.slice(0, -1).join(', ')} & ${firstNames[firstNames.length - 1]}`;
}
