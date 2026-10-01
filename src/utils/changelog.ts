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
    version: '3.43.3',
    date: '2026-10-02',
    changes: [
      'The flipped Summary pass now leads with one clear number: what you owe or are owed. Tap it to jump straight to Who owes who.',
      'A settled-travelers progress bar, a one-tap join-code copy, and the trip’s travelers replace the old weather, route map, and status pill on the back of the pass.',
    ],
  },
  {
    version: '3.43.2',
    date: '2026-10-01',
    changes: [
      'On trip tiles, Upcoming, Past, or Active and the Spent amount stay on the photo while the cover changes.',
    ],
  },
  {
    version: '3.43.1',
    date: '2026-10-01',
    changes: [
      'A trip with several destinations rotates its cover on the home stack and the list, one photo per place, dissolving into the next about every 5–6 seconds.',
      'A trip with one destination stays on a single photo. The photo inside an open trip does not rotate.',
    ],
  },
  {
    version: '3.43.0',
    date: '2026-09-30',
    changes: [
      'Superadmin Ops Deck redesigned with Liquid Velvet OLED glassmorphic theme, warm ambient lighting, and high-density floating telemetry cards.',
      'Dynamic Fleet Financial Velocity waveform engine with Catmull-Rom cubic spline transitions and interactive time-interval filters (7D, 30D, 90D, YTD).',
      'Persistent floating glass dock across all Superadmin pages with live incident badges and quick telemetry sync.',
      'Adaptive navigation architecture: widescreen desktop rail transitions to a thumb-zone floating glass dock on mobile screens.',
      'Sleek single-row mobile glass header with live status dot, 1-tap telemetry sync, and an avatar profile drawer reclaiming 130px of vertical workspace.',
    ],
  },
  {
    version: '3.42.1',
    date: '2026-09-28',
    changes: [
      'The flipped Summary pass shows what your group still settles outside the couple, and what is still inside it, and those two figures add up to your own position.',
      'On a trip with no groups, the pass back shows what you receive or owe next to the cash you laid out and your share.',
      'Weather sits under the destination, and also under the departure when the trip has more than one stop. Refresh reloads both and keeps the pass flipped.',
    ],
  },
  {
    version: '3.42.0',
    date: '2026-09-28',
    changes: [
      'The flipped boarding pass in the Summary tab has a new flight vector banner showing your full route without truncation.',
      'Group and couple node balances are now cleanly separated from solo out-of-pocket fronted expenses on the pass flip side.',
      'The boarding pass login screen gate-code input has a balanced pill layout.',
    ],
  },
  {
    version: '3.41.0',
    date: '2026-09-27',
    changes: [
      'Dialogs, sheets and drawers now slide or fade away when closed instead of vanishing.',
      'Pull down on the split explainer, @tripbot confirm and UPI pay sheets to close them.',
      'Opening a trip grows its card into the trip header, and tabs slide in the direction you move.',
      'Buttons give a small press response, and settings switches have a springier knob.',
      'Shared trip and live-location links have a new boarding-pass look that follows dark mode.',
      'Small labels across the app are easier to read.',
      'Past and Archived trip filters now show their trip count, like All and Active.',
      'The add-expense screen is shorter: category, date, place and receipt sit under More details.',
      'A new trip shows a two-step start card, and Summary charts fold into a Spending breakdown row.',
      'Settling the last balance stamps the trip with a little celebration.',
      'Pull to sync flies a small plane, deleted expenses fold away, and you get a note when you are back online.',
      'Cleaner icons replace emoji across the trip header, ledger, expense form and currency tools.',
      'Small buttons are easier to tap, and dialogs show a placeholder instead of a blank pause while loading.',
      'Amounts look the same everywhere, with thousands separators and no .00 on yen or won.',
      'New trips start with "Where to?" and suggest a name and currency from it.',
      'Trips open faster: the destination photo shows first and the map fades in after.',
      'Haptics are calmer, iPhones get haptic feedback, and Settings has an All / Important / Off choice.',
      'Remind anyone who owes money straight from the Members tab.',
      'The notifications inbox folds bursts together and has a Money filter.',
      'Deleting a trip or member you can undo needs one tap instead of two.',
      'Leaving a trip and reloading keeps you on Journeys, and Summary no longer flashes ₹0.00 while loading.',
      'Destination suggestions while you type, and a one-tap "Did you mean…?" fix for misspelled places.',
      'Trip cards on Journeys show the right Spent total again (it doubled for trips you had opened).',
      'Ops Deck buttons are cleaner and consistent, and Refresh keeps its label while it spins.',
    ],
  },
  {
    version: '3.40.3',
    date: '2026-09-26',
    changes: [
      'The trip stack photo is the destination you entered when you created the trip.',
      'Light list view uses a soft tinted page, and the Journeys title stays readable.',
    ],
  },
  {
    version: '3.40.2',
    date: '2026-09-26',
    changes: [
      'Trip stack cards stay round and no longer warp when you swipe slowly.',
      'The page behind the stack is a blurred copy of the front trip photo.',
      'List view tiles keep a lightly frosted status bar on each trip photo.',
    ],
  },
  {
    version: '3.40.1',
    date: '2026-09-26',
    changes: [
      'Left and right swipe between trip tabs works again.',
      'Summary shows one settlement explanation.',
      'Settings opens as a shorter list: profile, this trip, notifications, appearance, data, help, and account.',
    ],
  },
  {
    version: '3.40.0',
    date: '2026-09-25',
    changes: [
      'Boarding Pass login screen (behind a Superadmin flag, off by default): the traveler login/home screen can now be switched to a ticket-styled design — perforated seam, gate-code quick-join, rotating destination-photo backdrop, barcode-style staff link.',
      'Landing Page Cover Gallery (Superadmin → Ops Deck) now supports selecting multiple destination photos, which the Boarding Pass screen rotates through automatically.',
    ],
  },
  {
    version: '3.39.2',
    date: '2026-09-25',
    changes: [
      'Card Edge Bleed Fix: Eliminated horizontal card clipping on narrow screens; rounded squircle borders and specular highlights are now fully visible.',
      'Multi-City Route Display: Replaced crowded top capsules with a dedicated frosted route chip on the card body (e.g. Manali ➔ Shimla ➔ Chandigarh).',
      'Refined Card Spacing: Anchored cards directly beneath the filter capsule and tightened micro-gaps to the pagination dots and slider launcher.',
      'Permanent Archived Filter: Restored the Archived option in the status filter capsule across all trip views.',
      'Frosted Glass Slider Launcher: Interactive slider launcher with glass transparency, smooth drag glider, and tap zones.',
    ],
  },
  {
    version: '3.39.1',
    date: '2026-09-25',
    changes: [
      'Journeys card styling: Unified both stacked and grid trip cards into a luxury dark obsidian aesthetic across Light and Dark modes.',
      'Contrast & visibility fix: Eliminated the solid white footer patch in Light mode and restored crystal-clear contrast for spent totals and status indicators.',
    ],
  },
  {
    version: '3.39.0',
    date: '2026-09-25',
    changes: [
      'Journeys luxury grid cards overhaul: Reorganized with top date range, dedicated title row, realtime destination weather capsule, and uncollapsible temporal status indicators.',
      'Destination photography badges: Relocated destination city directly onto the cover photograph with frosted glass styling and automatic primary city parsing for multi-city routes.',
      'Dynamic photo contrast: Date and weather capsules dynamically switch between dark and light frosted modes based on sampled image sky luminance for crystal-clear readability.',
      'Refined card footer: Borderless spent display and protected status labels with zero text truncation.',
      'Long-press and right-click context menus: Access trip options with a smooth 450ms long-press on mobile touch or right-click on desktop.',
      'Translucent floating action dock and floating frosted glass Join Journey popup.',
    ],
  },
  {
    version: '3.38.0',
    date: '2026-09-24',
    changes: [
      'Journeys home screen overhaul: Unified 2-row header with profile avatar, centered serif title, right-aligned search, and rock-solid view and filter switcher positioning.',
      'Stack & list view image population: Every tile is guaranteed to display rich travel photography pulled directly from the destination and route stops, with curated procedural landscape fallbacks.',
      'Fixed Wikimedia thumbnail sizing standards to prevent broken images.',
    ],
  },
  {
    version: '3.37.2',
    date: '2026-09-24',
    changes: [
      'The home screen no longer shows the "You are owed / You owe" strip and extra Add button under the greeting. Add expense stays on each trip card.',
    ],
  },
  {
    version: '3.37.1',
    date: '2026-09-23',
    changes: [
      'On iPhone, the home trip card fits the height you can see, and stack swipes and the trip sheet stay smooth. Android is unchanged.',
    ],
  },
  {
    version: '3.37.0',
    date: '2026-09-22',
    changes: [
      'The invite screen now says what you get before you sign in, and the read-only trip share page has a button for starting your own trip. Guests still never see expenses or balances.',
      'Settings shows a Traveler Passport: trips, destinations, settled trips and days away, worked out on your device.',
      'Superadmin can arm growth telemetry (retention and sync health) and lifecycle reminder pushes. Both stay off until Ops Deck arms them.',
    ],
  },
  {
    version: '3.36.0',
    date: '2026-09-21',
    changes: [
      'Ops Deck Flags can apply a named mix: Recommended, On the road, Flyer, or Power money — or a saved custom mix — after a confirm. This is not all flags on.',
    ],
  },
  {
    version: '3.35.1',
    date: '2026-09-21',
    changes: [
      'Ops Deck Flags now asks before restoring the recommended app: Core and Trip on, Travel capable, Pro and Labs off — not every flag.',
    ],
  },
  {
    version: '3.35.0',
    date: '2026-09-21',
    changes: [
      'Ops Deck Flags are grouped as consumer packs (Core, Trip, Travel, Pro, Labs, Ops) instead of engineering phases, so first-open and settle-out stay light unless Superadmin arms more.',
      'Superadmin Command Center and Analytics Growth show whether groups finish the money loop and come back: first expense, second member, settle, next trip — not daily login streaks.',
      'Landing headline and empty-state copy can be changed from Tools without a deploy. After lock, an optional one-tap “use this next trip?” question stays off until Superadmin arms it.',
    ],
  },
  {
    version: '3.34.0',
    date: '2026-09-21',
    changes: [
      'Superadmin can turn on a lighter money loop: home you-owe strip with Add, clone last expense, remembered splits, WhatsApp settle cards, UPI on settle rows, trip closeout, and a view-only share link.',
      'Notes can be labeled Talk / Pack / Pass, Next-Up can wait until a boarding pass exists, and locking a trip can open Trip Wrapped.',
      'Settle rows can show Why? for the suggested amount. All of this stays off until Ops Deck arms the flags.',
    ],
  },
  {
    version: '3.33.0',
    date: '2026-09-21',
    changes: [
      'Trip chat keeps money as one card per bill: delete, restore, and settlement confirm update that card in place instead of adding extra bubbles.',
      'Consecutive expense cards stack into a single bills row you can expand, and Hide bills tucks money cards out of the thread.',
      'Optional unread dot on Notes (or Chat) when there are new trip messages you have not opened.',
    ],
  },
  {
    version: '3.32.7',
    date: '2026-09-20',
    changes: [
      'Superadmin Ops Deck and Bug Ledger open faster: first paint no longer waits on every expense, audit log, user, and bug diagnostic.',
      'Home trip stack swipes stay on the finger through the gesture, without a hitch from live blur or a forced layout at the end.',
    ],
  },
  {
    version: '3.32.6',
    date: '2026-09-20',
    changes: [
      'Swiping a trip toward the previous one now shows that trip rising behind the card, instead of briefly showing the wrong trip and then swapping.',
      'Removed the blank white flash when the previous trip slides in.',
    ],
  },
  {
    version: '3.32.5',
    date: '2026-09-20',
    changes: [
      'Smoother trip stack swipes: the trip you swipe away no longer flashes back for a moment before the next one appears.',
      'The next trip now slides in with its photo already loaded, removing the blank white flash on some swipes.',
    ],
  },
  {
    version: '3.32.4',
    date: '2026-09-20',
    changes: [
      'Home trip stack now swipes in a predictable alphabetical loop: swipe left for the next trip, right for the previous one, and it wraps around.',
      'Pagination dots on the home screen now follow the same order as the trip stack.',
      'New optional Sort toggle (A–Z or Date) under the trip stack.',
    ],
  },
  {
    version: '3.32.3',
    date: '2026-09-20',
    changes: [
      'WhatsApp-inspired traveler profile card in Settings with companion QR code sharing and an interactive multi-segment offline storage visualizer.',
      'Linear-grade Bugs Ledger overhaul featuring geometric priority indicators, live device telemetry capsules (platform, sync, offline, screenshot), and 1-tap quick status transitions.',
      'Modernized Superadmin operations deck with clean index numbering and a responsive horizontal mobile navigation ribbon with live badge counters.',
    ],
  },
  {
    version: '3.32.2',
    date: '2026-09-20',
    changes: [
      'Eliminated duplicate legal links on the login screen by consolidating Terms of Service and Privacy Policy to the authoritative pre-consent disclosure.',
      'Streamlined landing footer to a minimal, focused pairing of the 256-bit encryption trust seal and Superadmin switch.',
    ],
  },
  {
    version: '3.32.1',
    date: '2026-09-20',
    changes: [
      'De-cluttered unified login screen: replaced bulky vertical feature cards with an ultra-sleek horizontal capsule pill strip.',
      'Refined login card hierarchy with a subtle divider and clean join-by-code input layout.',
      'Stacked centered security trust seal and legal footer links with safe-area bottom inset padding for mobile navigation bars.',
    ],
  },
  {
    version: '3.32.0',
    date: '2026-09-20',
    changes: [
      'Enhanced voice expense recognition with multi-alternative parse scoring, fuzzy member name matching (e.g. Raul -> Rahul), and spoken number slang (2k, 1.5k, grand, lakh).',
      'Unified cross-platform speech engine bridging native on-device speech on iOS/Android with continuous listening and natural pause debouncing.',
      'Live Alerts notifications panel overhaul with actionable permission unblocking guides and real-time status detection.',
      'Comprehensive legal and privacy updates: clear encryption descriptions, account deletion IndexedDB vault purging, and OpenStreetMap map attribution.',
    ],
  },
  {
    version: '3.31.0',
    date: '2026-09-20',
    changes: [
      'Back now closes the Trip Closeout, Settlement Algorithm and offline-queue sheets first, instead of leaving the screen behind them.',
      'On Android, press back twice to exit the app, so a stray swipe no longer closes it.',
      'Missing trip dates and biometric setup errors show inline instead of as popup alerts.',
      'Web: a warning before you reload or close the tab with an unsaved new expense.',
      'New, off by default: back walks through the tabs you visited, trip and tab in the address bar, a 24-hour expense draft that survives closing the app, a readable offline queue with Retry and Discard, and undo for member delete, archive and settlements.',
    ],
  },
  {
    version: '3.30.5',
    date: '2026-09-20',
    changes: [
      'Silky-smooth trip card swipe: restored 1:1 fluid tracking, eliminated card freezing on swipe cycles, and smoothed out background card escalations.',
    ],
  },
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
