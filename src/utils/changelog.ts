export interface ChangelogEntry {
  version: string;
  date: string; // YYYY-MM-DD
  summary: string;
}

// Hand-maintained -- add one entry per release alongside the version bump
// (see the "Automated versioning" rule in CLAUDE.md). Newest first. Kept as
// a small static array rather than parsed from decisions.md/BUGS.md at
// runtime: those are prose files for humans, and shipping/parsing them to
// the client for a handful of lines would cost far more than it's worth.
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  { version: '3.29.1', date: '2026-09-18', summary: 'Fixed split rounding to respect each currency\'s decimal places and spread leftover remainders fairly across participants instead of one person absorbing them.' },
  { version: '3.29.0', date: '2026-09-17', summary: 'Multi-payer expenses, sticky ledger day headers, category color rings, and one-tap quick filter chips on the Expenses tab.' },
  { version: '3.28.0', date: '2026-09-16', summary: 'Settlement confirmation, read-only trip share links, contact invites, and weather-triggered itinerary nudges.' },
];
