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
    version: '3.84.2',
    date: '2026-10-29',
    changes: [
      'Fixed Flutter CI widget visibility and drawer initial position by respecting default map collapsed state.',
      'Restored instant trip switching from the header title in compass navigation mode.',
      'Squeezable header preserves trip member and expense metadata across all device font scales without layout overflow.',
      'Synchronized multi-platform test fixtures and formatting for 100% green CI runs.',
    ],
  },
  {
    version: '3.84.1',
    date: '2026-10-29',
    changes: [
      'Fixed Flutter CI formatting and synchronized golden fixtures across Flutter and web pipelines.',
      'Unblocked automated Android APK releases on main builds.',
    ],
  },
  {
    version: '3.84.0',
    date: '2026-10-29',
    changes: [
      'Flutter app brings Web-parity destination photo & OpenStreetMap route hero across all tabs.',
      'Squeezable sticky header and effortless single-swipe content sheet drawer with intelligent fling snapping.',
      'Guaranteed non-blank destination travel photography with travel noise word stripping and Wikivoyage support.',
    ],
  },
  {
    version: '3.83.0',
    date: '2026-10-28',
    changes: [
      'Activity feed supports multi-select clearing and direct navigation to expenses and refunds.',
      'Chat timeline includes refund transactions with streamlined styling.',
    ],
  },
  {
    version: '3.82.10',
    date: '2026-10-28',
    changes: [
      'Added an expense exclude-from-totals toggle, and transformed Hub into an icon tile grid.',
      'Refined navigation with a floating action button on Balances and Spend, edge-to-edge Activity feed, and destination blurred ambient background in Hub.',
    ],
  },
  {
    version: '3.82.4',
    date: '2026-10-28',
    changes: ['Fixed Google sign-in on the Android dev test build.'],
  },
  {
    version: '3.82.3',
    date: '2026-10-28',
    changes: [
      'Insights in the Hub got new charts: daily bars, a running total, ranked categories, paid vs share per person and your biggest expenses.',
      'The back of the settlement pass now shows how much of the trip is settled and your recent payments.',
    ],
  },
  {
    version: '3.82.2',
    date: '2026-10-28',
    changes: ['Refunds now read as a Refund with a minus amount in Spend, and day totals subtract them.'],
  },
  {
    version: '3.82.1',
    date: '2026-10-28',
    changes: ['Chat is back in the trip bar, and Plans (checklist, notes, passes) now opens from the Hub.'],
  },
  {
    version: '3.82.0',
    date: '2026-10-27',
    changes: [
      'Errors now say what happened in plain words, and sync reads the same everywhere: Saved, Syncing, Offline or Needs a look.',
      'A just-added expense shows an Added note with Undo and a soft highlight in the list, and the amount keypad can stay docked.',
      'Loading screens match the page shape, search finds places, payers and amounts, and half-filled forms ask before closing.',
      'Android predictive back, password autofill, and clearer screen reader labels for what you owe.',
    ],
  },
  {
    version: '3.78.0',
    date: '2026-10-23',
    changes: [
      'A failed sync now shows a red mark on the expense or message with a Retry button, and a Sync button sits in the home and trip headers.',
      'Half-typed expenses, notes and chat messages are kept if you close by accident, and are cleared when you sign out.',
      'Freeze, close and Settle all now apply at once with an Undo, and a quiet trip where you still owe shows a Settle up reminder.',
      'Smoother and clearer: aligned money columns, balances that count to their new value, fits large text, and respects Reduce motion.',
    ],
  },
  {
    version: '3.77.5',
    date: '2026-10-22',
    changes: [
      'Tap an Activity row to jump straight to that chat message or expense, and use See in Activity on an expense to see its history.',
    ],
  },
  {
    version: '3.77.4',
    date: '2026-10-22',
    changes: [
      'Trip Activity is now a full log: your own expenses, refunds, settlements, edits, recent deletions and chat messages all show up, not only what others did.',
    ],
  },
  {
    version: '3.77.3',
    date: '2026-10-23',
    changes: ['On the trips home, a closed or archived trip shows a greyed Add expense button that says why it is unavailable, instead of leaving a gap.'],
  },
  {
    version: '3.77.2',
    date: '2026-10-23',
    changes: ['Trip cards on the home stack are all the same size, and Add expense sits clear of the Join / New Trip slider (a closed trip no longer stretches its card over it).'],
  },
  {
    version: '3.77.1',
    date: '2026-10-23',
    changes: [
      'Per person view no longer tells you to pay someone while the pass says you are owed: when payments cross between two groups, Balances lists the one net payment.',
      'Clearer settlement pass: Spent / Settled / Pending on the front, and You owe / You are owed on the flip side with a note on how your group differs from you.',
    ],
  },
  {
    version: '3.77.0',
    date: '2026-10-23',
    changes: ['Record a refund on an expense: money returned to the payer is shared back across the original split, so balances and who pays whom drop by exactly that amount, and the expense shows its refund history.'],
  },
  {
    version: '3.76.1',
    date: '2026-10-23',
    changes: ['Balances no longer repeats You paid and Your share under the settlement pass; flip the pass to see them.'],
  },
  {
    version: '3.76.0',
    date: '2026-10-23',
    changes: [
      'Scan a receipt with your camera or a photo: the bill is read on your phone and fills the amount, date and title for you to confirm.',
      'Chat reactions: press and hold a message to react with 👍 ❤️ 😂 😮 🙏.',
      'Trip polls: ask the group a question from the chat box; everyone votes once and sees live results.',
      'Join an invite with just your name, no account needed.',
    ],
  },
  {
    version: '3.75.1',
    date: '2026-10-22',
    changes: ['The Trip tab has an All trips tile that takes you back to your trips home.'],
  },
  {
    version: '3.75.0',
    date: '2026-10-22',
    changes: [
      'Chat shows expenses and payments as small centered lines ("Ben paid Asha · UPI · ₹500"), with avatars and grouped messages.',
      'Notes are tidy preview cards: tap one to edit it. The Checklist folds finished items into a Done section.',
      'The settle sheet is simpler: who pays whom, one big amount you can edit, Mark settled, and extras under More options.',
      'Balances says "settled" once instead of repeating it in several cards.',
    ],
  },
  {
    version: '3.74.0',
    date: '2026-10-22',
    changes: [
      'Balances has a summary strip (Total spent, Per person, You paid, Your share) and a bar at the bottom, "You owe ₹X · Settle", that lists your payments to settle.',
      'The trip name now only switches trips, and Chat is no longer a separate Trip tile because it lives in Notes. Mute alerts moved to the Trip tab.',
      'Switching trips shows a "Switching to…" cover instead of flashing the home screen.',
      'Spend search also finds category, who paid and amount, and active filters show as chips you can remove.',
      'Activity rows offer Confirm received for payments and Reply for chat. People shows who owes or is owed, and Trip tiles show live facts.',
    ],
  },
  {
    version: '3.73.0',
    date: '2026-10-21',
    changes: [
      'Activity is a proper tab now: filter chips for All, Unread, Money, People and Chat, updates grouped by day, mark all read, and Delete all.',
      'The trip menu moved into the Trip tab: Edit trip, Route map, Live location, Invite, Trip settings and App settings. Chat is a tile there too.',
      'Switching trips from the trip name now opens the other trip completely: every tab and number is for the trip you picked, not a mix of both.',
      'Balances keeps the settlement pass and its flip, the yellow Close out card is gone, and Spend can fold and open all days again.',
    ],
  },
  {
    version: '3.72.0',
    date: '2026-10-21',
    changes: [
      'A trip with no expenses now opens on Get this trip rolling: share your invite link, copy it, or show the code and QR, then add your first expense. Balances and settlement appear once there is something to split.',
      'The trip bottom bar is now Spend, Balances, an orange + for Add expense, Chat and Trip. Trip opens People, Notes, Receipts, Insights, Invite, Live location, Tools and Trip settings.',
      'The Expenses tab starts with a Total spent card showing the total, per person and your biggest category, and each expense has a category colour ring.',
      'Balances always show who is up and who is down. Data and storage shows your total with a data and cache bar. On wide web windows, Expenses has a Settle up pane on the right.',
    ],
  },
  {
    version: '3.71.1',
    date: '2026-10-20',
    changes: [
      'The Add expense button under the top trip card is no longer hidden behind the Join / New Trip bar.',
      'Mistakes on the new-expense form now show right above the Save buttons, so you always see why a save did not happen. Save and add another on an empty form says: First add an expense.',
      'The Saved message after Save and add another no longer covers the button.',
    ],
  },
  {
    version: '3.71.0',
    date: '2026-10-20',
    changes: [
      'The Who pays whom section now starts with bars showing who is up and who is down, scaled so you can compare people at a glance.',
      'The Trips deck has an Add expense button under the top card, and the empty receipts screen has one too.',
      'The Insights back button and the UPI payment sheet close button now have screen-reader labels.',
    ],
  },
  {
    version: '3.70.0',
    date: '2026-10-20',
    changes: [
      'New expense form has Save and add another: it saves, clears the form and leaves you ready to type the next expense.',
      'The sync conflict sheet now shows exactly which fields differ (amount, date, title, category, payer, split) and the two Keep buttons look the same.',
    ],
  },
  {
    version: '3.69.3',
    date: '2026-10-20',
    changes: [
      'The back arrow inside a trip now retraces the tabs you visited before leaving the trip.',
      'Long destinations and trip names on passport cards are cut off with an ellipsis instead of colliding with the stamp.',
      'The Chat tab’s empty state matches the other tabs. Counters and confetti respect Reduce Motion.',
    ],
  },
  {
    version: '3.69.2',
    date: '2026-10-20',
    changes: [
      'If a screen fails, the app says your trips are still on this device and lets you try again. A failed sync names the change and offers Retry.',
      'Editing an expense that uses Shares keeps the weights. Closing a conflict no longer picks the other device’s version.',
    ],
  },
  {
    version: '3.69.1',
    date: '2026-10-20',
    changes: [
      'Scrolling down the Expenses tab to reach Settlements no longer triggers a pull-to-refresh. A refresh now needs a deliberate pull from the very top.',
    ],
  },
  {
    version: '3.69.0',
    date: '2026-10-19',
    changes: [
      'Behind the scenes: the Flutter app now lives on the main branch next to the web app. A push to main still deploys the website, and a green build of the Flutter app is published as an installable Android APK.',
    ],
  },
  {
    version: '3.68.5',
    date: '2026-10-19',
    changes: [
      'When a whole group has settled, the Members list no longer shows its members as owed or owing. This is fixed on the web and in the Flutter app.',
    ],
  },
  {
    version: '3.68.4',
    date: '2026-10-19',
    changes: [
      'When a whole group has settled, Per person now shows the trip as settled too, with no payments left to make for the people inside the group. This is fixed on the web and in the Flutter app.',
    ],
  },
  {
    version: '3.68.3',
    date: '2026-10-19',
    changes: [
      'After everyone has settled, the trip now shows as settled in both Fewest payments and Per person, and the amount outstanding is the same in both. This is fixed on the web and in the Flutter app.',
      'Behind the scenes (Flutter app): a clearer trip header line, the yellow close-out card disappears once the trip is settled, and a settlement paid to you has a Confirm received button in History.',
    ],
  },
  {
    version: '3.68.2',
    date: '2026-10-19',
    changes: [
      'Behind the scenes (Flutter app): Voice add expense uses the Google recognizer, understands spoken amounts like "five hundred" or "paanch sau", shows a listening panel and explains errors with Try again.',
      'Behind the scenes (Flutter app): Edit Trip takes one box per destination, with add and remove.',
    ],
  },
  {
    version: '3.68.1',
    date: '2026-10-19',
    changes: [
      'Settling with a group in two or more parts now works. The second payment used to fail with a permissions error when it was recorded under your groupmate. Fixed on the web and in the Flutter app.',
    ],
  },
  {
    version: '3.68.0',
    date: '2026-10-19',
    changes: [
      'Behind the scenes (Flutter app): a cleaner trip header (name, one line of dates, members and expenses), and Edit Trip Details is in the trip name menu and the top-bar menu.',
      'Behind the scenes (Flutter app): select and delete several passes at once, a filters page that matches the web, a pinned mini settlement pass on Summary, and the settlement pass flips to show You paid, Your share and the difference.',
      'Behind the scenes (Flutter app): a Voice button on Expenses that listens and fills in the expense for you to confirm.',
    ],
  },
  {
    version: '3.67.0',
    date: '2026-10-19',
    changes: [
      'Behind the scenes (Flutter app): Settings is one page of cards like the web, with Appearance and Haptics (All, Important, Off), Storage and Data, Archived Trips and Backups.',
      'Behind the scenes (Flutter app): long-press the trip name for Share, Mute, Edit Trip Details, Settings and Switch trip; the Summary gains attention chips, a close-out banner, Custom amount, Remind, How it works and an At a Glance grid.',
    ],
  },
  {
    version: '3.66.1',
    date: '2026-10-19',
    changes: [
      'Behind the scenes: the Flutter Notes and Checklist panes show one Add button (the floating one) instead of two, and each collapsed day on Expenses is a clear card with a large bold total and the number of expenses.',
    ],
  },
  {
    version: '3.66.0',
    date: '2026-10-19',
    changes: [
      'Behind the scenes: the Flutter app has cleaner Expenses rows and day headers, Notes cards you can pin or delete (with Undo) and a count on the tab, Members tiles with role and balance chips and a search box on bigger trips, and a menu to edit or delete travel passes. The Groups / People switch under Who paid now only changes that card, not Who pays whom.',
    ],
  },
  {
    version: '3.65.0',
    date: '2026-10-19',
    changes: [
      'Behind the scenes: the Flutter Balances tab replaces the To receive / To pay tiles with one You paid / Your share / Difference strip (tap it to see which expenses move your balance), and saving an expense offline now says it is saved on your phone and will sync later.',
    ],
  },
  {
    version: '3.63.0',
    date: '2026-10-18',
    changes: [
      'Behind the scenes: the Flutter app drops the banner and status row under the trip name and gathers Share, Route map and settings into one More menu (sync shows as a small icon only when needed), adds quick Add item / Add note / Add member buttons, folds Trip numbers away on the Summary until opened, shows a Jump to today chip, recent-amount chips on the expense form, friendlier empty Notes and checklist, skeleton loaders, a High contrast option, a Haptics setting and consistent bottom sheets. The Who paid list now says Their part instead of Share. No change to the web app.',
    ],
  },
  {
    version: '3.62.0',
    date: '2026-10-18',
    changes: [
      'Behind the scenes: the Flutter app can keep a personal expense out of the trip totals and settlement (a Just for me switch on the form, a Count in trip totals switch on an expense, swipe right on a row, and a Personal filter), switches trips from the trip name in the top bar instead of arrows on the status strip, offers UNDO after recording a payment, and lets you save expense filters as one-tap chips. No change to the web app.',
    ],
  },
  {
    version: '3.61.0',
    date: '2026-10-18',
    changes: [
      'Behind the scenes: the Flutter app has a tidier Trip numbers section (a headline strip and Categories / People / Days / Details tabs), a celebration when a trip is fully settled, a round-amount option when settling, app icon shortcuts (Add expense, Latest trip), an added/edited line on each expense, a pending-sync dot on trips, trip templates, a two-pane Summary on wide screens, a shareable invite picture, expense quick-filter chips, and bug reports and suggestions that are saved offline and sent when you are back online. Accessibility fixes: labelled trip arrows, larger tap targets, better contrast and no overflow at large text. No change to the web app.',
    ],
  },
  {
    version: '3.60.0',
    date: '2026-10-18',
    changes: [
      'Behind the scenes: the Flutter app shows trips as destination-photo tiles (with a Grid / List switch and pinned trips), a cover photo band and saved/syncing line inside a trip, arrows to jump between trips, a Today card and a wrap-up prompt on the Summary, a Plan and suggestions card, a spend-by-person ring, a receipt gallery, search that also finds expenses and notes, a Confirm button on notifications, smart expense defaults and an amount keypad, odometer-style rolling numbers on the hero amount, photos kept on the device, an Updated caption with pull to refresh, a first-run tour with a sample trip, sound feedback, a Reduce motion setting, Collapse Trip numbers, and a back gesture that returns to the page you came from. No change to the web app.',
    ],
  },
  {
    version: '3.59.0',
    date: '2026-10-18',
    changes: [
      'Behind the scenes: the Flutter app has a compact Trips list (cover thumbnails, a status pill and your money on every row, a hero card for the trip happening now, pinned Happening now / Upcoming / Past headers and a summary line across all trips), a Plan and suggestions card at the top of Trip numbers with budget pace and tips, one Groups / People switch that drives both Who pays whom and Who paid, and the back gesture now returns to the page you came from instead of the Trips home. No change to the web app.',
    ],
  },
  {
    version: '3.58.0',
    date: '2026-10-17',
    changes: [
      'Behind the scenes: the Flutter app shows member avatars and your money position on each trip, groups trips under Happening now / Upcoming / Past, adds a trip header strip, an Add expense choice (Quick add or Full form), a "Pay Ben" next-action banner on Summary, a Notes quick-capture box, one-time tips, and a Group view / Person view switch for settlement that every member can use. No change to the web app.',
    ],
  },
  {
    version: '3.57.0',
    date: '2026-10-17',
    changes: [
      'Behind the scenes: the Flutter app has a WhatsApp-style Settings list with search, a cleaner Summary and Settlement Pass (your payments first, Settle all, share a summary picture, day-by-day spend, a device-only trip budget), group spend by Paid and Share, editable groups with a 2-member minimum, a title-and-note popup for new notes, a clearer checklist progress card with category bars, and a quicker offline start. No change to the web app.',
    ],
  },
  {
    version: '3.56.0',
    date: '2026-10-10',
    changes: [
      'Behind the scenes: the Flutter app has a boarding-gate sign-in screen, a redesigned "Departures" card stack with an airport runway slider for New Trip and Join, and a Create Trip form that starts with the destination and suggests the trip name. Superadmin sessions are never restored automatically. No change to the web app.',
    ],
  },
  {
    version: '3.55.0',
    date: '2026-10-09',
    changes: [
      'Behind the scenes: the Flutter app has a native Superadmin portal (overview, bug ledger, users, trips, flags, analytics, audit, controls and tools) and a card-stack view for the Trips home screen with destination photos. No change to the web app.',
    ],
  },
  {
    version: '3.54.0',
    date: '2026-10-09',
    changes: [
      'Behind the scenes: the Flutter app has a boarding-pass look for Summary, Expenses and Passes, and the Fewest / Per person switch now updates right away instead of snapping back. No change to the web app.',
    ],
  },
  {
    version: '3.53.0',
    date: '2026-10-09',
    changes: [
      'Trip Members: Adding a person now requires a mandatory Gmail ID (@gmail.com) with smart auto-completion, real-time Google account preview, and automatic member claiming across Flutter and Web.',
    ],
  },
  {
    version: '3.52.0',
    date: '2026-10-09',
    changes: [
      'Behind the scenes: Flutter app features Summary-first tabs, boarding pass summary hero, live Notes checklist with live editing, and realtime trip chat sync.',
    ],
  },
  {
    version: '3.51.0',
    date: '2026-10-09',
    changes: [
      'Behind the scenes: the Flutter app has a new Bento look with pastel tiles, new fonts and a floating bottom bar, in light, dark and black themes. No change to the web app.',
    ],
  },
  {
    version: '3.50.1',
    date: '2026-10-09',
    changes: [
      'Behind the scenes: Flutter Superadmin login now opens a Superadmin screen whose Ops Deck button signs you straight into the web portal, and web links open correctly on Android. No change to the web app.',
    ],
  },
  {
    version: '3.50.0',
    date: '2026-10-09',
    changes: [
      'Behind the scenes: Flutter app now uses the web app colours (teal and orange), passes show as cards, and Superadmin login opens a Superadmin screen. No change to the web app.',
    ],
  },
  {
    version: '3.49.0',
    date: '2026-10-09',
    changes: [
      'Behind the scenes: Flutter Notes tab no longer overflows on trips with many passes, and passes can be sorted by time, flight leg, or traveler name. No change to the web app.',
    ],
  },
  {
    version: '3.48.2',
    date: '2026-10-08',
    changes: [
      'Behind the scenes: Flutter app now shows trips right after sign-in, suggests destinations while typing, and the Horizon navigation and Spend Insights are on by default. No change to the web app.',
    ],
  },
  {
    version: '3.48.1',
    date: '2026-10-08',
    changes: [
      'Behind the scenes: fixed the Flutter CI fixtures-drift check. No change to the web app.',
    ],
  },
  {
    version: '3.48.0',
    date: '2026-10-08',
    changes: [
      'Behind the scenes: Flutter Horizon redesign across all screens, desktop layouts, Balances and Spend Insights behind new flags. No change to the web app.',
    ],
  },
  {
    version: '3.47.0',
    date: '2026-10-08',
    changes: [
      'Behind the scenes: Flutter migration Horizon redesign, Web platform compilation with Wasm SQLite, and Google-only + Superadmin authentication gate. No change to the web app.',
    ],
  },
  {
    version: '3.46.1',
    date: '2026-10-07',
    changes: [
      'Behind the scenes: fixed the Flutter Android build (core library desugaring for local notifications). No change to the web app.',
    ],
  },
  {
    version: '3.46.0',
    date: '2026-10-07',
    changes: [
      'Behind the scenes: Flutter migration Phases 10-12 (notifications, settings, push and reminders, feedback, version gate, accessibility fixes, release hardening, cutover and rollout plans). No change to the web app.',
    ],
  },
  {
    version: '3.45.0',
    date: '2026-10-06',
    changes: [
      'Behind the scenes: Flutter migration Phase 9 (maps, live location, receipts OCR, weather, Trip Wrapped, squad badges, traveler passport, ICS calendar export, Next Up capsule & gate scanner). No change to the web app.',
    ],
  },
  {
    version: '3.44.3',
    date: '2026-10-06',
    changes: [
      'Behind the scenes: groundwork for Flutter migration Phase 8 (members, notes, chat, boarding passes). No change to the web app.',
    ],
  },
  {
    version: '3.44.2',
    date: '2026-10-06',
    changes: [
      'Behind the scenes: groundwork for Flutter migration Phase 7 slices E-G (ledger loop, UPI, share card, close-out). No change to the web app.',
    ],
  },
  {
    version: '3.44.1',
    date: '2026-10-06',
    changes: [
      'Behind the scenes: groundwork for the upcoming native mobile app (expense form and balances screens). No change to the web app.',
    ],
  },
  {
    version: '3.43.11',
    date: '2026-10-05',
    changes: [
      'The Amount box in Add Expense now sits immediately below its label for faster entry, with currency suggestions underneath.',
      'Split presets, quick amount additions, stepper dots, and currency toggles now have enlarged 44px tap targets for easier mobile tapping.',
      'Restored draft notices are calmer, and the bottom save bar has subtle elevation above scrolling form content.',
    ],
  },
  {
    version: '3.43.10',
    date: '2026-10-02',
    changes: [
      'The Members list and live packing updates from the previous release now reach the site. That build had stopped on a type error.',
    ],
  },
  {
    version: '3.43.9',
    date: '2026-10-02',
    changes: [
      'Packing, notes, and passes now show up for everyone immediately, the same way a Talk message does.',
      'The Members tab is a simple list: one role per person, the balance on the right, and groups in the same quiet style.',
    ],
  },
  {
    version: '3.43.8',
    date: '2026-10-02',
    changes: [
      'Packing lists, notes, and passes now stay in sync for everyone on the trip. An add, edit, or delete by one member shows up for the others without a reload.',
      'Expenses, members, and the summary refresh the same way while the trip is open.',
    ],
  },
  {
    version: '3.43.7',
    date: '2026-10-02',
    changes: [
      'Small labels and captions across the app are now at least 11px, so they are easier to read.',
      'Small icon buttons are easier to tap, and screen readers now announce more pop-ups as dialogs.',
      'Marking a payment as settled now shows a clear card with who pays whom and how much.',
      'New: the Summary pass shows a one-time hint that it flips to your own balance.',
    ],
  },
  {
    version: '3.43.6',
    date: '2026-10-02',
    changes: [
      'Summary now labels your own balance and the group total separately, so the two numbers are no longer confused.',
      'If you are in a couple or group, the flipped pass shows how your balance splits inside and outside the group.',
      'The bottom bar is more solid, so cards no longer show through it, and the top chips are easier to tap.',
      'The "You\u2019re owed" chip says "see who" instead of promising a reminder it did not send.',
    ],
  },
  {
    version: '3.43.5',
    date: '2026-10-02',
    changes: [
      'The Summary pass is shorter. The flipped side fits its join code, last-updated time, and travelers on one row.',
      'With the new pass back on, the duplicate settled-up bar under Who owes who is gone. The pass shows it once.',
    ],
  },
  {
    version: '3.43.4',
    date: '2026-10-02',
    changes: [
      'The flipped Summary pass no longer cuts off its bottom row. The join code, last-updated time, and traveler avatars are fully visible, and the layout is tidier.',
    ],
  },
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
