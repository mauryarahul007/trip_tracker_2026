export interface ChangelogEntry {
  version: string;
  date: string; // YYYY-MM-DD
  changes: string[]; // customer-facing bullets
}

// Hand-maintained, newest first. Add an entry for every release (changelog.test.ts
// fails if the package.json version has none). Kept as a static array rather than
// parsed from decisions.md/BUGS.md: those are prose for developers, not client data.
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: '3.30.4',
    date: '2026-09-20',
    changes: [
      'The home “N Expeditions” count now picks dark or light text from the trip photo, so it stays readable on bright skies.',
      'iPhone trip-card swipe follows your finger more smoothly. Android’s 3D tilt is unchanged.',
    ],
  },
  {
    version: '3.30.3',
    date: '2026-09-19',
    changes: [
      'iPhone scrolling and swipes (trip stack, sheet, expense rows, tabs) feel closer to Android. Android glass look is unchanged.',
    ],
  },
  {
    version: '3.30.2',
    date: '2026-09-19',
    changes: [
      'Voice and quick-add expenses now default to whoever is signed in as the payer, not the trip creator. You can still name someone else, or pick from the list.',
    ],
  },
  {
    version: '3.30.1',
    date: '2026-09-19',
    changes: [
      "What's New now lives on the version screen: Settings → About → tap the version.",
    ],
  },
  {
    version: '3.30.0',
    date: '2026-09-19',
    changes: [
      'Data Saver: keeps the trip map hidden until you tap to load it, and skips celebration animations, to save mobile data and battery.',
      'Compact Ledger View: tighter expense rows so more fit on screen.',
      'Category Reorder: arrange your expense categories with up/down controls; the order syncs across devices.',
    ],
  },
  {
    version: '3.29.1',
    date: '2026-09-18',
    changes: [
      "Fixed split rounding: amounts now respect each currency's decimals (e.g. yen has none), and leftover cents are spread across people instead of one person absorbing them.",
    ],
  },
  {
    version: '3.29.0',
    date: '2026-09-17',
    changes: [
      'Multi-payer expenses: split who paid across several people.',
      'Sticky day headers and category color rings in the ledger.',
      'One-tap quick filter chips on the Expenses tab.',
    ],
  },
  {
    version: '3.28.0',
    date: '2026-09-16',
    changes: [
      'Two-sided settlement confirmation.',
      'Read-only trip share links and invites from your contacts.',
      'Weather-triggered itinerary nudges.',
    ],
  },
];
