/**
 * Extracts the primary single destination city for compact card badges
 * when a trip has multi-city stops or routes (e.g. "Manali → Shimla → Chandigarh" => "Manali").
 */
export function extractPrimaryCity(destination?: string, stops?: { name: string }[]): { primary: string; full: string } {
  const full = (destination || (stops && stops.length > 0 ? stops.map((s) => s.name).join(' → ') : '')).trim();
  if (!full) return { primary: '', full: '' };
  const segments = full
    .split(/\s*(?:→|->|=>|—|–|\||\/|,|;)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const primary = segments.length > 0 ? segments[0] : full;
  return { primary, full };
}
