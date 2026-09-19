export const MAX_TAB_TRAIL = 5;

/** Records `from` as a back-step when the tab changes. Past the cap, further switches are not recorded. */
export function pushTab<T extends string>(trail: readonly T[], from: T, to: T, max = MAX_TAB_TRAIL): T[] {
  if (from === to || trail.length >= max) return [...trail];
  return [...trail, from];
}

export function popTab<T extends string>(trail: readonly T[]): { tab: T | undefined; trail: T[] } {
  return { tab: trail[trail.length - 1], trail: trail.slice(0, -1) };
}
