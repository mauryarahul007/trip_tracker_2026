import type { SplitMode } from '../types';

const NUMBERED_MODES = new Set<SplitMode>(['custom', 'exact', 'percentage']);

/**
 * What to persist in `splitConfig`.
 * Shares (`custom`) must keep the weights. Dropping them made the next edit
 * resolve as an equal split.
 * When an edit arrives without weights, keep the previous Shares map.
 */
export function splitConfigForSave(
  splitMode: SplitMode | string,
  incoming: Record<string, number> | undefined,
  previous?: Record<string, number>,
): Record<string, number> | undefined {
  const hasIncoming = !!incoming && Object.keys(incoming).length > 0;
  if (NUMBERED_MODES.has(splitMode as SplitMode)) {
    if (hasIncoming) return incoming;
    if (splitMode === 'custom' && previous && Object.keys(previous).length > 0) return previous;
    return undefined;
  }
  return undefined;
}
