# Feature test steps (living document)

Manual QA checklist for **customer-facing features**. Append a new dated section whenever a feature or customer-visible bug-fix ships. Do not replace older sections — keep history.

**Related:** math/automated QA lives in [`qa-testing-report.md`](./qa-testing-report.md). Feature flags live in Superadmin **Ops Deck → Flags**.

---

## How to maintain this file (agents + humans)

After implementing any **customer-facing** feature or UX fix that needs manual verification:

1. Add a new `##` section under **Changelog of test guides** (newest first is OK, or chronological — prefer chronological by ship date).
2. Include: version / commit / FEAT or BUG id, required flags (default OFF?), prep, numbered steps, negative checks (flag OFF), pass criteria.
3. Link the section from the **Index** table at the top.
4. Do this in the same PR/commit as the feature when practical; otherwise in the immediate follow-up commit before asking the user to test.

---

## Index

| Shipped | Version | Id | Section |
|--------|---------|-----|---------|
| 2026-10-21 | unreleased | TRIP-GET-STARTED | [Get this trip rolling: start card on a blank trip](#trip-get-started--get-this-trip-rolling-start-card-on-a-blank-trip) |
| 2026-10-21 | unreleased | COMPASS | [Compass: trip dock + Trip hub, Spend header, balance bars, storage card, web Settle-up pane](#compass--trip-dock--trip-hub-spend-header-balance-bars-storage-card-web-settle-up-pane) |
| 2026-10-20 | unreleased | UX-BATCH-4 | [Balance bars, deck quick add, receipt empty action, icon labels](#ux-batch-4--balance-bars-deck-quick-add-receipt-empty-action-icon-labels) |
| 2026-10-20 | unreleased | SAVE-ADD-ANOTHER | [Save and add another on the new-expense form](#save-add-another--save-and-add-another-on-the-new-expense-form) |
| 2026-10-20 | unreleased | CONFLICT-DIFF | [Sync conflict sheet shows what changed](#conflict-diff--sync-conflict-sheet-shows-what-changed) |
| 2026-10-20 | 3.69.2 | STABILITY-POLISH | [Failure copy, sync status, Shares weights](#stability-polish--failure-copy-sync-status-and-shares-weights) |
| 2026-10-20 | 3.69.1 | PTR-SCROLL | [Scrolling no longer triggers pull-to-refresh](#ptr-scroll--scrolling-no-longer-triggers-pull-to-refresh) |
| 2026-10-19 | 3.68.1 | SETTLE-GROUP-RLS | [Second partial group settlement no longer fails](#settle-group-rls--second-partial-group-settlement-no-longer-fails) |
| 2026-10-08 | flutter 3.48.2 | FLUTTER-FIRSTSYNC | [Flutter: first sync, destination autocomplete, Horizon defaults](#flutter-firstsync--trips-after-sign-in-destination-autocomplete-horizon-defaults-v3482) |
| 2026-10-08 | flutter 3.48 | FLUTTER-HORIZON | [Flutter: Horizon nav and spend insights](#flutter-horizon--horizon-nav-and-spend-insights-v3480) |
| 2026-10-09 | flutter 3.52 | FLUTTER-SUMMARY | [Flutter: Summary tab, Add expense on Summary, map panel, live Notes](#flutter-summary--flutter-summary-tab-add-expense-on-summary-map-panel-live-notes) |
| 2026-10-09 | flutter (unreleased) | FLUTTER-BENTO | [Flutter: Bento redesign (P0 to P5)](#flutter-bento--flutter-bento-redesign-p0-to-p5) |
| 2026-10-09 | flutter 3.54 | FLUTTER-BOARDING | [Flutter: boarding-pass Summary, receipt Expenses, pass wallet, live-stream fix](#flutter-boarding--flutter-boarding-pass-ui-and-live-stream-fix-v3540) |
| 2026-10-09 | flutter 3.55 | FLUTTER-SUPERADMIN | [Flutter: native Superadmin portal and analytics](#flutter-superadmin--flutter-native-superadmin-portal-and-analytics-v3550) |
| 2026-10-09 | flutter 3.55 | FLUTTER-CARDSTACK | [Flutter: Trips card-stack view](#flutter-cardstack--flutter-trips-card-stack-view-v3550) |
| 2026-10-10 | flutter 3.56 | FLUTTER-DEPARTURES | [Flutter: boarding-gate login, Departures stack, runway slider, destination-first Create Trip](#flutter-departures--flutter-boarding-gate-login-departures-stack-runway-slider-v3560) |
| 2026-10-17 | flutter | FLUTTER-NOTE-POPUP | [Flutter: New note opens a title + body popup](#flutter-note-popup--new-note-opens-a-title--body-popup) |
| 2026-10-17 | flutter | FLUTTER-GROUP-SPEND | [Flutter: group-wise spend (paid + share) on the Summary](#flutter-group-spend--group-wise-spend-paid--share-on-the-summary) |
| 2026-10-17 | flutter | FLUTTER-GROUP-EDIT | [Flutter: group popup, edit members, 2-member minimum](#flutter-group-edit--flutter-group-popup-edit-members-2-member-minimum) |
| 2026-10-17 | flutter | FLUTTER-CHECKLIST-RING | [Flutter: checklist progress card](#flutter-checklist-ring--flutter-checklist-progress-card) |
| 2026-10-17 | flutter | FLUTTER-SETTINGS-LIST | [Flutter: WhatsApp-style settings](#flutter-settings-list--flutter-whatsapp-style-settings) |
| 2026-10-17 | flutter | FLUTTER-SUMMARY-POLISH | [Flutter: Summary and Settlement Pass polish](#flutter-summary-polish--flutter-summary-and-settlement-pass-polish) |
| 2026-10-17 | flutter | FLUTTER-SETTLE-ALL | [Flutter: settle all I owe](#flutter-settle-all--flutter-settle-all-i-owe) |
| 2026-10-17 | flutter | FLUTTER-SHARE-SUMMARY | [Flutter: share trip summary as an image](#flutter-share-summary--flutter-share-trip-summary-as-an-image) |
| 2026-10-17 | flutter | FLUTTER-DAY-BY-DAY | [Flutter: day-by-day spend](#flutter-day-by-day--flutter-day-by-day-spend) |
| 2026-10-17 | flutter | FLUTTER-CHECKLIST-CATEGORIES | [Flutter: checklist category progress](#flutter-checklist-categories--flutter-checklist-category-progress) |
| 2026-10-17 | flutter | FLUTTER-SETTINGS-SEARCH | [Flutter: settings search](#flutter-settings-search--flutter-settings-search) |
| 2026-10-17 | flutter | FLUTTER-TRIP-BUDGET | [Flutter: trip budget (this device only)](#flutter-trip-budget--flutter-trip-budget-this-device-only) |
| 2026-10-17 | flutter | FLUTTER-TRIP-LIST-MONEY | [Flutter: trip cards show people and your money](#flutter-trip-list-money--flutter-trip-cards-show-people-and-your-money) |
| 2026-10-17 | flutter | FLUTTER-TRIP-LIST-SECTIONS | [Flutter: trips grouped by Happening now / Upcoming / Past](#flutter-trip-list-sections--flutter-trips-grouped-by-happening-now--upcoming--past) |
| 2026-10-17 | flutter | FLUTTER-TRIP-STRIP | [Flutter: trip header strip](#flutter-trip-strip--flutter-trip-header-strip) |
| 2026-10-17 | flutter | FLUTTER-ADD-SPEED-DIAL | [Flutter: Add expense speed dial](#flutter-add-speed-dial--flutter-add-expense-speed-dial) |
| 2026-10-17 | flutter | FLUTTER-SUMMARY-NEXT-ACTION | [Flutter: Summary next action](#flutter-summary-next-action--flutter-summary-next-action) |
| 2026-10-17 | flutter | FLUTTER-NOTES-QUICK-CAPTURE | [Flutter: Notes quick capture](#flutter-notes-quick-capture--flutter-notes-quick-capture) |
| 2026-10-17 | flutter | FLUTTER-COACH-HINTS | [Flutter: one-time coach hints](#flutter-coach-hints--flutter-one-time-coach-hints) |
| 2026-10-17 | flutter | FLUTTER-SETTLE-VIEW-SWITCH | [Flutter: settlement Group view / Person view](#flutter-settle-view-switch--flutter-settlement-group-view--person-view) |
| 2026-10-17 | flutter | FLUTTER-PLAN-SUGGESTIONS | [Flutter: Plan and suggestions in Trip numbers](#flutter-plan-suggestions--flutter-plan-and-suggestions-in-trip-numbers) |
| 2026-10-17 | flutter | FLUTTER-BACK-NAVIGATION | [Flutter: back goes to the previous page](#flutter-back-navigation--flutter-back-goes-to-the-previous-page) |
| 2026-10-17 | flutter | FLUTTER-TRIP-LIST-REDESIGN | [Flutter: compact trips list](#flutter-trip-list-redesign--flutter-compact-trips-list) |
| 2026-10-18 | flutter | FLUTTER-TRIP-GRID-TILES | [Flutter: Trips as photo tiles](#flutter-trip-grid-tiles--flutter-trips-as-photo-tiles) |
| 2026-10-18 | flutter | FLUTTER-TRIP-COVER-SYNC | [Flutter: cover photo band and saved/syncing line](#flutter-trip-cover-sync--flutter-cover-photo-band-and-savedsyncing-line) |
| 2026-10-18 | flutter | FLUTTER-TODAY-CLOSEOUT | [Flutter: Today card and trip-over prompt](#flutter-today-closeout--flutter-today-card-and-trip-over-prompt) |
| 2026-10-18 | flutter | FLUTTER-GLOBAL-SEARCH | [Flutter: search inside trips](#flutter-global-search--flutter-search-inside-trips) |
| 2026-10-18 | flutter | FLUTTER-SMART-EXPENSE-DEFAULTS | [Flutter: smart expense defaults](#flutter-smart-expense-defaults--flutter-smart-expense-defaults) |
| 2026-10-18 | flutter | FLUTTER-NOTIFICATION-DAYS | [Flutter: notifications by day and back navigation](#flutter-notification-days--flutter-notifications-by-day-and-back-navigation) |
| 2026-10-18 | flutter | FLUTTER-REDUCE-MOTION-ROLLING | [Flutter: rolling hero numbers and reduce motion](#flutter-reduce-motion-rolling--flutter-rolling-hero-numbers-and-reduce-motion) |
| 2026-10-18 | flutter | FLUTTER-NOTIFICATION-ACTIONS | [Flutter: Confirm button on notifications](#flutter-notification-actions--flutter-confirm-button-on-notifications) |
| 2026-10-18 | flutter | FLUTTER-PHOTO-CACHE | [Flutter: photos kept on the device](#flutter-photo-cache--flutter-photos-kept-on-the-device) |
| 2026-10-18 | flutter | FLUTTER-LAST-SYNCED | [Flutter: Updated caption and pull to refresh](#flutter-last-synced--flutter-updated-caption-and-pull-to-refresh) |
| 2026-10-18 | flutter | FLUTTER-TRIP-SWITCHER | [Flutter: switch between trips](#flutter-trip-switcher--flutter-switch-between-trips) |
| 2026-10-18 | flutter | FLUTTER-TRIP-PINS | [Flutter: pinned trips](#flutter-trip-pins--flutter-pinned-trips) |
| 2026-10-18 | flutter | FLUTTER-RECEIPT-GALLERY | [Flutter: receipt gallery](#flutter-receipt-gallery--flutter-receipt-gallery) |
| 2026-10-18 | flutter | FLUTTER-SPEND-RING | [Flutter: spend by person ring](#flutter-spend-ring--flutter-spend-by-person-ring) |
| 2026-10-18 | flutter | FLUTTER-FIRST-RUN-TOUR | [Flutter: first-run tour and sample trip](#flutter-first-run-tour--flutter-first-run-tour-and-sample-trip) |
| 2026-10-18 | flutter | FLUTTER-FEEDBACK-PACK | [Flutter: sound and haptic feedback](#flutter-feedback-pack--flutter-sound-and-haptic-feedback) |
| 2026-10-18 | flutter | FLUTTER-AMOUNT-KEYPAD | [Flutter: amount keypad](#flutter-amount-keypad--flutter-amount-keypad) |
| 2026-10-18 | flutter | FLUTTER-TRIP-ACCENT | [Flutter: trip accent colour](#flutter-trip-accent--flutter-trip-accent-colour) |
| 2026-10-18 | flutter | FLUTTER-SUMMARY-COLLAPSE | [Flutter: collapse Trip numbers](#flutter-summary-collapse--flutter-collapse-trip-numbers) |
| 2026-10-18 | flutter | FLUTTER-NUMBERS-TABS | [Flutter: Trip numbers with tabs](#flutter-numbers-tabs--flutter-trip-numbers-with-tabs) |
| 2026-10-18 | flutter | FLUTTER-OFFLINE-FEEDBACK | [Flutter: bug reports and suggestions offline](#flutter-offline-feedback--flutter-bug-reports-and-suggestions-offline) |
| 2026-10-18 | flutter | FLUTTER-SETTLED-CELEBRATION | [Flutter: settled celebration](#flutter-settled-celebration--flutter-settled-celebration) |
| 2026-10-18 | flutter | FLUTTER-SETTLE-ROUNDING | [Flutter: round down when settling](#flutter-settle-rounding--flutter-round-down-when-settling) |
| 2026-10-18 | flutter | FLUTTER-APP-SHORTCUTS | [Flutter: app icon shortcuts](#flutter-app-shortcuts--flutter-app-icon-shortcuts) |
| 2026-10-18 | flutter | FLUTTER-EXPENSE-HISTORY | [Flutter: expense history line](#flutter-expense-history--flutter-expense-history-line) |
| 2026-10-18 | flutter | FLUTTER-PENDING-DOTS | [Flutter: pending sync dot on trips](#flutter-pending-dots--flutter-pending-sync-dot-on-trips) |
| 2026-10-18 | flutter | FLUTTER-TRIP-TEMPLATES | [Flutter: trip templates](#flutter-trip-templates--flutter-trip-templates) |
| 2026-10-18 | flutter | FLUTTER-SUMMARY-TWO-PANE | [Flutter: Summary two panes](#flutter-summary-two-pane--flutter-summary-two-panes) |
| 2026-10-18 | flutter | FLUTTER-INVITE-CARD | [Flutter: invite picture](#flutter-invite-card--flutter-invite-picture) |
| 2026-10-18 | flutter | FLUTTER-QUICK-CHIPS | [Flutter: Expenses quick filter chips](#flutter-quick-chips--flutter-expenses-quick-filter-chips) |
| 2026-10-18 | flutter | FLUTTER-A11Y-AUDIT | [Flutter: accessibility audit](#flutter-a11y-audit--flutter-accessibility-audit) |
| 2026-10-18 | flutter | FLUTTER-PERSONAL-EXPENSES | [Flutter: personal expenses, left out of totals](#flutter-personal-expenses--flutter-personal-expenses-left-out-of-totals) |
| 2026-10-18 | flutter | FLUTTER-UNDO-SETTLEMENT | [Flutter: undo a recorded payment](#flutter-undo-settlement--flutter-undo-a-recorded-payment) |
| 2026-10-18 | flutter | FLUTTER-SAVED-FILTERS | [Flutter: saved expense filters](#flutter-saved-filters--flutter-saved-expense-filters) |
| 2026-10-18 | flutter | FLUTTER-CLEAN-TOPBAR | [Flutter: clean trip top bar, no banner](#flutter-clean-topbar--flutter-clean-trip-top-bar-no-banner) |
| 2026-10-18 | flutter | FLUTTER-CONTEXT-FAB | [Flutter: quick action buttons on Notes and Members](#flutter-context-fab--flutter-quick-action-buttons-on-notes-and-members) |
| 2026-10-18 | flutter | FLUTTER-SUMMARY-FOCUS | [Flutter: Summary focus mode](#flutter-summary-focus--flutter-summary-focus-mode) |
| 2026-10-18 | flutter | FLUTTER-JUMP-TODAY | [Flutter: jump to today](#flutter-jump-today--flutter-jump-to-today) |
| 2026-10-18 | flutter | FLUTTER-QUICK-AMOUNTS | [Flutter: quick amount chips](#flutter-quick-amounts--flutter-quick-amount-chips) |
| 2026-10-18 | flutter | FLUTTER-COACH-EMPTY | [Flutter: friendly empty states](#flutter-coach-empty--flutter-friendly-empty-states) |
| 2026-10-18 | flutter | FLUTTER-SKELETONS | [Flutter: skeleton loaders](#flutter-skeletons--flutter-skeleton-loaders) |
| 2026-10-18 | flutter | FLUTTER-HIGH-CONTRAST | [Flutter: high contrast and haptics setting](#flutter-high-contrast--flutter-high-contrast-and-haptics-setting) |
| 2026-10-18 | flutter | FLUTTER-SHEET-HANDLES | [Flutter: consistent bottom sheets](#flutter-sheet-handles--flutter-consistent-bottom-sheets) |
| 2026-10-18 | flutter | FLUTTER-PAID-LEGEND | [Flutter: Who paid labels](#flutter-paid-legend--flutter-who-paid-labels) |
| 2026-10-19 | flutter | FLUTTER-PAID-VS-SHARE | [Flutter: You paid vs your share, balance explainer, saved-offline toast](#flutter-paid-vs-share--flutter-you-paid-vs-your-share-balance-explainer-saved-offline-toast) |
| 2026-10-19 | flutter | FLUTTER-TIDY-TABS | [Flutter: tidy Expenses, Notes and Members, edit and delete passes, analytics switch](#flutter-tidy-tabs--flutter-tidy-expenses-notes-and-members-edit-and-delete-passes-analytics-switch) |
| 2026-10-19 | flutter (unreleased) | FLUTTER-SETTINGS-PAGE | [Flutter: one-page Settings like the web](#flutter-settings-page--flutter-one-page-settings-like-the-web) |
| 2026-10-19 | flutter (unreleased) | FLUTTER-HEADER-SUMMARY | [Flutter: trip header actions, edit trip, Summary upgrades](#flutter-header-summary--flutter-trip-header-actions-edit-trip-summary-upgrades) |
| 2026-10-19 | flutter (unreleased) | FLUTTER-UI-ROUND3 | [Flutter: clean header, pass multi-select, filters page, mini pass, voice](#flutter-ui-round3--flutter-clean-header-pass-multi-select-filters-page-mini-pass-voice) |
| 2026-10-19 | 3.69.0 | CI-ANDROID-APK | [Automatic Android APK from main](#ci-android-apk--automatic-android-apk-from-main) |
| 2026-10-09 | flutter 3.49 | FLUTTER-WEBTHEME | [Flutter: web palette, pass cards, Superadmin redirect, sign-in diagnostics](#flutter-webtheme--flutter-web-palette-pass-cards-superadmin-redirect-sign-in-diagnostics) |
| 2026-10-09 | flutter 3.49 | FLUTTER-PASS-SORT | [Flutter: pass list sorting (Time / Leg / Name)](#flutter-pass-sort--flutter-pass-list-sorting-time--leg--name) |
| 2026-10-09 | flutter 3.49 | FLUTTER-NOTES-OVERFLOW | [Flutter: Notes tab many-passes overflow fix](#flutter-notes-overflow--flutter-notes-tab-many-passes-overflow-fix) |
| 2026-10-07 | flutter 3.45 | FLUTTER-P12 | [Flutter: accessibility, hardening, release checks](#flutter-p12--flutter-accessibility-hardening-release-checks) |
| 2026-10-06 | flutter 3.45 | FLUTTER-P10E | [Flutter: push, tap routing, pass reminders](#flutter-p10e--flutter-push-tap-routing-pass-reminders) |
| 2026-10-06 | flutter 3.45 | FLUTTER-P10D | [Flutter: feedback, diagnostics, legal, telemetry](#flutter-p10d--flutter-feedback-diagnostics-legal-telemetry) |
| 2026-10-06 | flutter 3.45 | FLUTTER-P10C | [Flutter: notification preferences, version gate, flags](#flutter-p10c--flutter-notification-preferences-version-gate-flags) |
| 2026-10-06 | flutter 3.45 | FLUTTER-P10B | [Flutter: settings and trip settings](#flutter-p10b--flutter-settings-and-trip-settings) |
| 2026-10-06 | flutter 3.45 | FLUTTER-P10A | [Flutter: in-app notifications](#flutter-p10a--flutter-in-app-notifications) |
| 2026-10-06 | flutter 3.44 | FLUTTER-P8 | [Flutter: members, notes, text chat, manual passes](#flutter-p8--flutter-members-notes-text-chat-manual-passes) |
| 2026-10-06 | flutter 3.44 | FLUTTER-P7-LOOP | [Flutter: ledger loop, files, and exit bar](#flutter-p7-loop--flutter-ledger-loop-files-and-exit-bar) |
| 2026-10-06 | flutter 3.44 | FLUTTER-P7-FORM-LEDGER | [Flutter: expense form and balances tab](#flutter-p7-form-ledger--flutter-expense-form-and-balances-tab) |
| 2026-10-06 | flutter 3.44 | FLUTTER-P7-EXPENSES | [Flutter: Expenses tab (list, filters, recycle bin)](#flutter-p7-expenses--flutter-expenses-tab-list-filters-recycle-bin) |
| 2026-10-06 | flutter 3.44 | FLUTTER-P6 | [Flutter app: auth, trips list, trip shell, join & share](#flutter-p6--flutter-app-auth-trips-list-trip-shell-join--share) |
| 2026-10-19 | 3.43.13 | SETTLE-GROUP-RLS | [Second partial group settlement no longer fails](#settle-group-rls--second-partial-group-settlement-no-longer-fails) |
| 2026-10-02 | 3.43.9 | MEMBERS-ROSTER | [Members roster](#members-roster--members-roster) |
| 2026-10-02 | 3.43.8 | COLLAB-SYNC | [Shared packing, notes, and passes](#collab-sync--shared-packing-notes-and-passes) |
| 2026-10-02 | unreleased | PASS-STUB-SIMPLIFY | [Simplified pass back (balance hero)](#pass-stub-simplify--simplified-pass-back-balance-hero) |
| 2026-10-02 | 3.43.4 | PASS-BACK-POLISH | [Pass back layout polish (no clipping)](#pass-back-polish--pass-back-layout-polish-no-clipping) |
| 2026-10-02 | unreleased | SUMMARY-CLARITY | [Summary clarity: labeled totals, solid nav, honest chip](#summary-clarity--summary-clarity-labeled-totals-solid-nav-honest-chip) |
| 2026-10-02 | 3.43.7 | UX-POLISH-2 | [UX polish: readable text, tap targets, dialog roles, settle confirm, flip cue](#ux-polish-2--ux-polish-readable-text-tap-targets-dialog-roles-settle-confirm-flip-cue) |
| 2026-10-01 | v3.43.1 | FEAT-COVER-CYCLE | [Cycling destination photos](#feat-cover-cycle--cycling-destination-photos) |
| 2026-09-28 | v3.42.1 | PASS-STUB | [Pass back seat and gate](#pass-stub--pass-back-seat-and-gate) |
| 2026-09-27 | v3.41.0 | DEST-SUGGEST | [Destination suggestions & did-you-mean](#dest-suggest--destination-suggestions--did-you-mean) |
| 2026-09-27 | v3.41.0 | QA-0927 | [QA fixes: map handoff, stale trip URL, ₹0 flash, inbox empty state, photo lookups](#qa-0927--qa-fixes) |
| 2026-09-27 | v3.41.0 | UX-POLISH3 | [Money format, quick trip, calm haptics, reminders, inbox](#ux-polish3--money-format-quick-trip-calm-haptics-reminders-inbox) |
| 2026-09-27 | v3.41.0 | UX-POLISH2 | [Short expense form, focused Summary, touch & loading polish](#ux-polish2--short-expense-form-focused-summary-touch--loading-polish) |
| 2026-09-27 | v3.41.0 | UX-MOTION | [App-wide motion polish, share pages, Ops Deck polish](#ux-motion--app-wide-motion-polish-share-pages-ops-deck-polish) |
| 2026-09-26 | v3.40.2 | UX-TRIPS-VIEWS | [Trip stack corners, swipe, list glass](#ux-trips-views--stack-corners-smooth-swipe-list-glass) |
| 2026-09-26 | v3.40.3 | UX-TRIPS-COVER | [Stack destination photo, light list tint](#ux-trips-cover--stack-destination-photo-light-list-tint) |
| 2026-09-26 | v3.40.1 | SETTINGS-IA | [Settings root screen](#settings-ia--settings-root-screen) |
| 2026-09-26 | v3.40.1 | TAB-SWIPE | [Tab swipe between bottom-nav screens](#tab-swipe--left-right-between-bottom-nav-screens) |
| 2026-09-26 | v3.40.1 | BUG-246 | [Summary settlement explainer once](#bug-246--summary-settlement-explainer-once) |
| 2026-09-25 | unreleased | FEAT-BOARDINGPASS | [Boarding Pass login screen + rotating backdrop gallery](#feat-boardingpass--boarding-pass-login-screen--rotating-backdrop-gallery) |
| 2026-09-24 | v3.37.2 | BUG-245 | [Remove home cross-trip IOU strip](#bug-245--remove-home-cross-trip-iou-strip) |
| 2026-09-23 | v3.37.1 | BUG-244 | [iOS visible height and compositor](#ios-visible-height-and-compositor) |
| 2026-09-22 | v3.37.0 | FEAT-GROWTH2 | [Growth: invite conversion, telemetry, passport, nudges](#feat-growth2--invite-conversion-telemetry-passport-nudges) |
| 2026-09-21 | v3.36.0 | FEAT-093 | [Flag recipes and saved mixes](#feat-presets--flag-recipes-and-saved-mixes) |
| 2026-09-21 | v3.35.1 | FEAT-092 | [Restore recommended app confirm](#feat-092--restore-recommended-app-confirm) |
| 2026-09-21 | v3.35.0 | FEAT-GROWTH | [Superadmin loop health & growth](#feat-growth--superadmin-loop-health--growth) |
| 2026-09-21 | v3.35.0 | FEAT-PACKS | [Consumer packs in Ops Deck](#feat-packs--consumer-packs-replace-phases) |
| 2026-09-21 | v3.34.0 | FEAT-LIGHTLOOP2 | [Money-loop finish](#feat-lightloop2--money-loop-finish) |
| 2026-09-21 | v3.34.0 | FEAT-LIGHTLOOP | [Light money loop](#feat-lightloop--light-money-loop) |
| 2026-09-21 | v3.33.0 | FEAT-088 | [Chat money cards stay quiet](#feat-chatlife--chat-money-cards-stay-quiet) |
| 2026-09-16 | v3.25.1 | BUG-221 | [Chat overlay & live-location CTA](#bug-221--chat-overlay--live-location-cta-v3251) |
| 2026-09-17 | v3.26.0 / v3.26.1 | FEAT-076 | [Expense cards, location heartbeat, Summary polish](#feat-076--expense-cards-location-heartbeat-summary-polish-v3260) |
| 2026-09-17 | v3.27.0 | FEAT-077 | [Chat depth: media, voice, typing, reads, tripbot](#feat-077--chat-depth-media-voice-typing-reads-tripbot-v3270) |
| 2026-09-17 | v3.27.1 | BUG-222 | [Chat placement + Notes/Chat crash](#chat-placement-flags--notes-vs-tab-1) |
| 2026-09-17 | v3.27.2 | BUG-223 | [Chat max update depth](#bug-223--chat-max-update-depth-v3272) |
| 2026-09-17 | v3.27.3 | BUG-224 | [Settlement Algorithm info modal opacity](#bug-224--settlement-algorithm-info-modal-opacity-v3273) |
| 2026-09-17 | v3.28.0 | FEAT-078 | [Settlement confirmation, share link, contact invite, weather nudges, expense approval](#feat-078--settlement-confirmation-share-link-contact-invite-weather-nudges-expense-approval-v3280) |
| 2026-09-18 | v3.29.0 | FEAT-079 | [Multi-payer single expense, ledger UI enhancements, quick filter chips](#feat-079--multi-payer-single-expense-ledger-ui-enhancements-quick-filter-chips-v3290) |
| 2026-09-19 | v3.30.0 | FEAT-080 | [Data Saver, Compact Ledger View, Category Reorder, What's New Hub](#feat-080--data-saver-compact-ledger-view-category-reorder-whats-new-hub-v3300) |
| 2026-09-19 | v3.30.2 | BUG-227 | [Voice expense payer is the signed-in member](#bug-227--voice-expense-payer-is-the-signed-in-member) |
| 2026-09-19 | v3.30.3 | BUG-228 | [iOS WebKit compositor feel](#ios-webkit-compositor-feel) |
| 2026-09-20 | v3.30.4 | BUG-229 / BUG-230 | [Expeditions chip contrast + iOS stack swipe](#expeditions-chip-contrast--ios-stack-swipe) |
| 2026-09-20 | v3.31.0 | BUG-232..236 / FEAT-083..087 | [Navigation, dialogs & sync UX pass](#navigation-dialogs--sync-ux-pass-v3310) |
| 2026-09-20 | unreleased | FEAT-TRIPSORT | [Trip stack alphabetical swipe + sort toggle](#feat-tripsort--trip-stack-alphabetical-swipe--sort-toggle) |
| 2026-09-20 | v3.32.7 | BUG-240 / BUG-241 | [Ops Deck load + home stack smoothness](#perf-ops-stack--ops-deck-load--home-stack-smoothness) |

---

## Shared prep

1. Hard-refresh or pull latest `main` so the version badge matches the section you are testing.
2. Sign in as a **linked trip member** (chat needs a member row tied to your user).
3. Prefer **two browsers / accounts** on the same trip for realtime checks (A = you, B = peer).
4. Open **Superadmin → Ops Deck → Flags**. Prefer **trip overrides** for safe testing.
5. For each feature: confirm **flag OFF → feature absent**, then arm the flag and retest.

---

## FEAT-PRESETS — Flag recipes and saved mixes

**Commit:** 2a704e0 (v3.36.0). **ADR:** 217. **Tracker:** FEAT-093. No new traveler flag.

**Point:** Superadmin Flags can apply a named global mix. Built-in recipes are Recommended, On the road, Flyer, Power money. Save current mix stores up to 5 named custom mixes. This is not all flags on. Packs still Arm/Safe one group.

### Flags
None new. Recipes write `DEFAULT_FEATURE_FLAGS` variants.

### Prep
1. Superadmin → Ops Deck → Flags. Hard-refresh so the **Recipes** card is under the page title.

### Steps
1. Recipes shows Recommended, On the road, Flyer, Power money, and **Save current mix**.
2. **Recommended** confirm: Core + Trip on, Travel capable, Pro/Labs off. Cancel writes nothing. Apply → Core/Trip Armed, Travel Partial, Pro/Labs/Ops Safe.
3. **On the road** → Travel pack Safe (passes/radar off). Core+Trip still Armed.
4. **Flyer** → same pack states as Recommended.
5. **Power money** → Pro Armed, Labs still Safe. Itemized/OCR available; Chat-first still absent.
6. Toggle a Pro flag extra, **Save current mix** as “Goa weekend”. Chip appears. Apply it after changing flags — mix returns. Delete mix → flags unchanged.
7. Seventh save is blocked (max 5).

### Negative checks
- Built-in recipes never turn Labs on.
- Arm Pack on Travel still turns route stops on (different from Flyer/Recommended).
- Cancel on confirm leaves flags unchanged.

### Pass
- One confirm per apply. Custom mix round-trips. Packs below still work.

---

## FEAT-092 — Restore recommended app confirm

**Commit:** aee182f (v3.35.1). **Tracker:** FEAT-092. Reuses pack defaults from FEAT-PACKS / ADR 215. No new traveler flag.

**Point:** Superadmin Flags no longer silently resets. **Recommended** (Recipes) confirms Core + Trip on, Travel capable, Pro/Labs/Ops off. This is not all flags on. See FEAT-PRESETS for On the road / Flyer / Power money / saved mixes.

### Flags
None new. Same `DEFAULT_FEATURE_FLAGS` as FEAT-PACKS.

### Prep
1. Superadmin → Ops Deck → Flags. Hard-refresh so **Recipes** includes **Recommended**.

### Steps
1. **Recommended** recipe chip, not a silent Reset to Defaults.
2. Click it. Dialog lists Core/Trip on, Travel capable (route stops off), Pro/Labs/Ops off.
3. **Cancel** — pack chips and toggles unchanged.
4. Click again → **Restore recommended**. Toast: Core and Trip on, Pro and Labs off. Core/Trip Armed, Travel Partial, Pro/Labs/Ops Safe.

### Negative checks
- Confirm does not arm Pro, Labs, or route stops.
- Arm Pack on Travel still turns route stops on (different from Restore).

### Pass
- One confirm, copy matches pack intent, Cancel writes nothing.

---

## FEAT-GROWTH — Superadmin loop health & growth

**Commit:** dca5349 (v3.35.0). **Migrations:** `0107_growth_ops_attribution.sql` (pulse, Splitwise count, share views, signup UTM). **ADR:** 216. **Tracker:** FEAT-091.

**Point:** Ops Deck measures the trip loop (first expense, second member, settle, next trip), not 30-day login. Travelers get no new tab. Optional one-tap closeout pulse is Labs, default OFF.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| One-tap “use this next trip?” after lock | `enableCloseoutPulse` | OFF (Labs) |

Landing headline / tagline / invite blurb / empty-state copy are **Tools → app_config**, not flags.

### Prep
1. Superadmin account. Hard-refresh so Command Center and Analytics load this build.
2. Prefer a fleet that already has trips, expenses, and at least one claimed member.
3. Dummy local Supabase with no trips will show 0s — that is expected.

### Steps
1. Superadmin → **Command Center**. A **Loop health** strip shows five percentages: first expense ≤ 10 min, second member, settlement, locked, same-squad next trip ≤ 90d. Ghost-trip count may appear under the strip.
2. Tap **Open Growth** (or Analytics). Default sub-tab is **Growth**.
3. Confirm sections: activation funnel, ghost queue, flag used vs armed (proxies labeled), invite/share attribution, trip-type slices, closeout pulse, Splitwise imports, win-back list, signup UTM.
4. **Tools → Landing & empty-state copy.** Change headline and tagline, Save. Sign out and open `/login` — copy matches. Home empty state uses the empty-trip blurb when you have no trips.
5. Arm `enableCloseoutPulse` on a trip override. End-date in the past → Close out → Lock. After lock, Yes / Not this group / Skip appear. Answer Yes. Growth closeout pulse increments (or after refresh). Flag OFF: lock still two buttons, no question.
6. (Optional, needs migration 0107) Open a view-only share link in a private window. Share views on Growth increment. Import a Splitwise CSV on a Pro-armed trip — trips imported / rows imported increment.

### Negative checks
- Flag `enableCloseoutPulse` OFF → no pulse question after lock.
- Non-superadmin never sees Command Center / Growth.
- No DAU, streak, chat transcript, or email-blast UI.

### Pass
- Loop health is visible without scrolling past spend.
- Growth tab is derived from trips/expenses/members (proxies are labeled).
- Landing copy changes without a deploy.
- Pulse is one tap and absent when the flag is off.

---

## FEAT-PACKS — Consumer packs replace phases

**Commit:** dca5349 (v3.35.0). **ADR:** 215. **Tracker:** FEAT-090.

**Point:** Ops Deck groups flags by who should see them (Core / Trip / Travel / Pro / Labs / Ops), not by engineering Phase 1–7. Core money loop defaults ON in code. Production DB rows still win until **Restore recommended app** or Arm Pack.

### Flags / packs

| Pack | Default in code | What travelers feel |
|------|-----------------|---------------------|
| Core (18) | ON | First 60s + last 5 min: add, invite, settle, share, lock, same squad next trip |
| Trip (11) | ON | Voice, receipt, Notes + quiet chat, packing, FX, map collapsed |
| Travel (8) | Partial | Passes / Next-Up / scanner / radar ON; route stops / tiles / data-saver OFF. Next-Up chrome hidden until a pass exists |
| Pro (28) | OFF | Itemized, OCR, analytics, biometric, Splitwise import |
| Labs (18) | OFF | Chat-first, Tripbot, live location, achievements, closeout pulse |
| Ops (4) | OFF | Demo seed, snapshot, suggestions, sync inspector |

### Prep

1. Hard-refresh so Ops Deck loads this build.
2. Superadmin → Ops Deck → Flags. Tab is **Consumer Packs** (not Release Phases).
3. If production already stored flags, click **Restore recommended app** on a staging env only — confirm lists Core + Trip on, Travel capable, Pro/Labs/Ops off. That writes pack defaults to `resolved.global`. Cancel leaves flags unchanged. This is not “all flags on.”

### Steps

1. Command Center shows six pack chips (CORE, TRIP, TRAVEL, PRO, LABS, OPS) with Armed / Partial / Safe.
2. Flags page: six summary cards. Core is expanded. Arm Pack / Safe Pack toggles every flag in that pack.
3. Search "Why This Amount" — it sits under Core, not Phase 1.
4. As a traveler after Restore recommended app: home can show You owe / You are owed; settle rows can show WhatsApp / UPI / Why?; ended trip can offer New trip with this group.
5. Expenses tab without a pass: no Next-Up capsule (progressive Next-Up is Core ON).
6. Itemized split / OCR / analytics / achievements absent until Pro or Labs is armed.

### Flag-OFF / negative

1. Safe Pack on Core → home IOU, clone last, closeout, UPI, share link gone (old first-session).
2. Arm Pack on Labs → Chat-first and Tripbot appear. Do not leave Labs armed on production.
3. Safe Pack on Trip → voice / Notes hub / chat under Notes disappear.

### Pass

- No "Phase 1–7" copy in Flags or Command Center.
- Core + Trip armed by default after Restore recommended app.
- Labs and Pro stay safed.
- Traveler first-open is not a radar/scanner cockpit. Last 5 min can settle and clone squad without a Pro pack.

---

## FEAT-LIGHTLOOP — Light money loop

**Commit:** v3.34.0. **ADR:** 214.

**Point:** Faster add, clearer home IOU, settle without leaving chat-you-already-use, next trip with the same people. No Chat-first, Tripbot, or itinerary builder.

**Defaults note:** This section recorded v3.34.0 as all-OFF. From ADR 215 / FEAT-PACKS, these flags sit in **Core** and default **ON** in code. Production stored rows still win until Reset / Arm Pack.

### Flags

All default **OFF**. Arm in Superadmin → Ops Deck → Flags (or Release Phases). Nothing in this feature is reachable until its flag is ON.

| Behavior | Flag | Default |
|----------|------|---------|
| Clone last expense | `enableCloneLastExpense` | OFF |
| Remember split | `enableRememberDefaultSplit` | OFF |
| Expense draft 24h | `enablePersistentExpenseDraft` | OFF |
| WhatsApp settle card | `enableWhatsAppSettlementShare` | OFF |
| UPI on settlement row | `enableUpiPayments` | OFF |
| Trip closeout | `enableTripCloseout` | OFF |
| View-only share link | `enableTripShareLink` | OFF |
| Home You are owed / You owe | `enableHomeNetBalance` | OFF |
| New trip with this group (copy names) | `enableCloneTripSquad` | OFF |
| Notes Talk / Pack / Pass labels | `enableNotesTalkPackPass` | OFF |
| Hide Next-Up until a pass exists | `enableProgressiveNextUp` | OFF |
| Chat-first / Tripbot / in-chat cards | Phase 6 flags | stay OFF |

If production Ops Deck already stored a flag as ON, that stored value still wins — turn it OFF there to hide the surface.

### A. Fast add
**Flags ON:** `enableCloneLastExpense`, `enableRememberDefaultSplit`, `enablePersistentExpenseDraft`.

1. Open a trip with at least one expense. Add expense → **Clone last** (or long-press +). Date is today; split matches last.
2. Change split participants, save. Next new expense reuses that split.
3. Start a new expense, type a title, leave. Reopen add: draft is still there.

### B. Settle out
**Flags ON:** `enableUpiPayments`, `enableWhatsAppSettlementShare`, `enableTripCloseout`, `enableTripShareLink`.

1. Balances with an open transfer → **UPI Pay** on that row (not a new tab). **Share** produces a WhatsApp/system card.
2. Trip end date in the past → closeout reminder. Complete closeout → trip locks.
3. Share trip → generate read-only link. Open in a logged-out browser: summary, no edit.

### C. Home IOU and next trip
**Flags ON:** `enableHomeNetBalance`, `enableCloneTripSquad`.

1. Home (no trip open), online, you have a non-zero net in some currency → strip **You are owed** / **You owe** above the stack.
2. Trip action sheet → **New trip with this group**. New trip has the same people (names, not their logins) and no expenses.

### D. Notes IA and progressive travel
**Flags ON:** `enableNotesTalkPackPass`, `enableProgressiveNextUp` (plus existing `enableTravelPasses` / `enableNextUpCapsule`).

1. Notes hub segments: **Talk / Pack / Pass / Notes** (Talk only if trip chat is on and chat-first is off).
2. Expenses tab: Next-Up capsule is absent until the trip has a pass. Radar / scanner stay on pass cards only.

### Negative checks
- **All light-loop flags OFF:** no Clone last, no remembered split, no 24h draft, no UPI chip, no WhatsApp settle share, no closeout, no share link, no home IOU strip, Duplicate Trip copies only you (not the squad), Notes labels stay Passes / Notes / Checklist / Chat, Next-Up can still show without a pass (existing Next-Up flag).
- Phase 6 chat-first / Tripbot / in-chat cards still OFF → no Chat tab-1, no tripbot, no extra money bubbles.
- Splitwise import and contact invite still OFF.
- Toggle any one flag OFF in Ops Deck → that surface disappears; others stay.

### Pass
- With flags ON: second expense is fast; home shows money; settle is a row action; next trip reuses the squad; Notes is three jobs plus notes; travel extras wait for a pass.
- With flags OFF: none of those surfaces appear.

---

## FEAT-LIGHTLOOP2 — Money-loop finish

**Commit:** v3.34.0. **ADR:** 214.

**Point:** Finish the five leftover edges from the light money-loop analysis: home Add, copy split on squad clone, closeout → Wrapped, view-only share first, Why? on settle rows. No new flags — each reuses an existing Superadmin flag, default OFF except Wrapped (already ON).

### Flags

| Behavior | Flag | Default |
|----------|------|---------|
| Home IOU strip + **Add** | `enableHomeNetBalance` | OFF |
| Copy squad + remembered split | `enableCloneTripSquad` + `enableRememberDefaultSplit` | OFF |
| Closeout then Wrapped recap | `enableTripCloseout` (+ `enableTripWrapped`) | Closeout OFF, Wrapped ON |
| View-only link first in Invite | `enableTripShareLink` | OFF |
| **Why?** on settle rows | `enableExplainThisNumber` | OFF |

### A. Home Add
1. Flags: `enableHomeNetBalance` ON. Home, online, non-zero net → strip shows You are owed / You owe **and** **Add**.
2. Tap **Add** → opens the trip whose dates include today (else last-updated open trip) with the add-expense form.
3. Flag OFF → no strip, no Add.

### B. Split habits on next trip
1. Flags: `enableCloneTripSquad` and `enableRememberDefaultSplit` ON. On a trip, save an expense with a non-default split.
2. Action sheet → **New trip with this group**. Add expense on the copy: split mode/people match (mapped by name).
3. Either flag OFF → Duplicate Trip does not copy split storage.

### C. Closeout → Wrapped
1. Flags: `enableTripCloseout` ON, `enableTripWrapped` ON. Finish closeout → **Lock trip**. Trip Wrapped opens immediately (closeout sheet closes).
2. Wrapped OFF → lock stays on the “Trip locked / Done” sheet. No recap.

### D. View-only share first
1. Flag: `enableTripShareLink` ON. Settings → Invite & Share. **View-only link (no account)** is first; a link is generated if none exists. Join code is under **Invite to join**.
2. Open the `/share/…` URL logged out: summary only, no edit.
3. Flag OFF → join link/code first; no view-only block.

### E. Why this amount?
1. Flag: `enableExplainThisNumber` ON. Balances → a suggested transfer shows **ⓘ Why?**
2. Tap → bill titles that make up that amount. Flag OFF → no Why? control.

### Negative checks
- Home Add never appears without the IOU strip / flag.
- Duplicate without both clone-squad and remember-split does not write `tt-default-split` for the new trip.
- Share modal does not auto-generate a view-only token when `enableTripShareLink` is OFF.

### Pass
- Home is money + one tap to add; next trip keeps split habits; lock becomes a recap; auntie gets a view-only link first; settle rows can explain the number.

---

## FEAT-CHATLIFE — Chat money cards stay quiet

**Commit:** v3.33.0 (FEAT-088). **Migration:** `0106` applied (kinds allowed; delete/confirm are **in-place overlays**, not extra bubbles).  
**Point:** Chat stays a conversation. Money events are one card each; status updates on that card.

### Flags

| Behavior | Flag | Default |
|----------|------|---------|
| Trip chat | `enableTripChat` | (existing) |
| Expense event cards | `enableInChatEventCards` | OFF |
| Settlement confirm overlay | `enableSettlementConfirmation` | OFF |
| Reply on expense cards | `enableChatReactionsAndReplies` | OFF |
| Unread on Notes / Chat tab | `enableChatUnreadOnNotes` | OFF |

### A. In-place delete / settle (no extra bubbles)

1. Cards ON. Add an expense → one **added** card.
2. Delete it → **same** card strikes through with **Deleted**. No second “deleted” bubble. Tap does not open review.
3. Restore from Recycle Bin → original card is live again (**Tap to view**). No “restored” bubble.
4. Record a settlement from Balances → one **settlement** card.
5. Peer confirms (`enableSettlementConfirmation` ON) → that settlement card shows **Confirmed**. No extra confirm bubble.

### B. Stack consecutive bills

1. Add 2+ expenses in a row with no chat in between → one **N bills** row.
2. Tap **Show** → cards expand. **Hide** collapses.
3. A normal text message between bills breaks the stack.

### C. Hide bills

1. Cards ON → **Hide bills** in the chat header.
2. Money cards disappear; human messages stay.
3. **Show bills** brings them back. Preference survives reload on this trip.

### D. Reply on an expense card

1. `enableChatReactionsAndReplies` ON.
2. Long-press an expense card → **Reply** is in the sheet.
3. Send a reply → quote of that bill sits on the human message.

### E. Unread on Notes

1. `enableChatUnreadOnNotes` ON. Stay on Summary (or Notes → Checklist).
2. Peer sends a chat message → **dot on Notes** (or Chat tab if Chat-first is on). Chat segment also dots when Notes is open on another sub-tab.
3. Open Chat → dot clears.
4. Flag OFF → no unread dots.

### Negative checks

- `enableInChatEventCards` OFF → no add cards, no Hide bills, no stacks.
- Unread flag OFF → no Notes/Chat unread dots (chat still works).
- Reply flag OFF → no Reply on expense cards.

### Pass

- Delete/settle visible without extra bubbles; stacks and Hide bills keep talk readable; unread is a dot only.

---

## BUG-221 — Chat overlay & live-location CTA (v3.25.1)

**Commit:** chat overlay fix + Chat share CTA (see `decisions.md` ADR #187).  
**Flags:** no new flag. Live-location CTA reuses `enableLiveLocationShare`. Chat reactions UI needs `enableChatReactionsAndReplies` if testing long-press sheet.

### Steps

1. Open a trip → **Chat** with messages.
2. Long-press a message → ActionSheet opens with reactions in the **sheet header** (not a floating bar covering Reply/Pin).
3. Confirm **Reply** / **Pin** (if admin + social flag) are tappable, not covered.
4. With `enableChatFirstNav` ON: open Chat tab → floating **+** FAB must **not** sit on the composer; FAB hidden on Chat.
5. With `enableLiveLocationShare` ON: in Chat, use **Share my location** / **Share mine** on the live-location banner → `LiveLocationShareModal` opens.
6. Start sharing from that modal; stop sharing works.

### Pass

- No emoji pill overlapping sheet actions; no FAB over composer on Chat; location share reachable from Chat.

---

## FEAT-076 — Expense cards, location heartbeat, Summary polish (v3.26.0)

**Commits:** `b4eb125` (feature), `a4549d3` (TS build fix v3.26.1).  
**Migration:** `0094` (`trip_messages.kind` / `payload`) — required for cards.  
**ADR:** #188.

### Flags

| Behavior | Flag | Default |
|----------|------|---------|
| Trip chat | `enableTripChat` | (existing) |
| Expense event cards | `enableInChatEventCards` | OFF |
| Live location | `enableLiveLocationShare` | (existing) |

### A. In-chat expense cards

1. `enableInChatEventCards` **OFF** → add expense → Chat has **no** expense card (push may still fire).
2. Flag **ON** (+ trip chat ON) → add expense → compact card (title, amount, tap to view).
3. Tap card → expense review opens.
4. Peer B sees card via realtime without refresh.
5. Long-press card → View expense / Delete; **no text Edit**.

### B. Live-location session heartbeat

1. `enableLiveLocationShare` ON → start sharing from Chat CTA or Settings.
2. Modal copy: keep the **app open** while sharing (foreground session, not phone-locked GPS).
3. **Close the share sheet** without stopping → stay in the app; after ~60s peer map/banner still updates.
4. Background the tab briefly, return → heartbeat resumes on visibility.
5. **Stop sharing** → updates stop; changing trip / logout stops heartbeat.

### C. Summary polish

1. **Pinned carousel:** pin 2+ chat messages → swipe horizontally across pins; tap jumps to message.
2. **Offline readiness:** with pending `syncQueue` items, open **Summary** → compact sync-ready line (not a duplicate of the global offline banner).
3. **Needs you chips:** when you owe/are owed, have disputes (if that flag on), pending invites, or closeout available → chips above balances; tap routes to the relevant section.

### Pass

- Cards only when flag on; heartbeat survives modal close; Summary strip/chips behave as above.

---

## FEAT-077 — Chat depth: media, voice, typing, reads, tripbot (v3.27.0)

**Commits:** `fbe5c7a`, feature log `6c1fab3`.  
**Migrations:** `0095`–`0097` (kinds, `chat-media` bucket, `trip_chat_read_cursors`) — already applied on remote.  
**ADR:** #189.  
**Storage:** private bucket `chat-media` (`{tripId}/{messageId}.ext`), max **5 MB**/object; voice max **60s**.

### Flags (all default OFF unless noted)

| Feature | Flag(s) |
|---------|---------|
| Base chat | `enableTripChat` |
| Expense / settlement / dispute cards | `enableInChatEventCards` (+ `enableExpenseDisputes` for dispute posts) |
| Why this split? | `enableExplainThisNumber` (+ cards) |
| Attachments | `enableChatAttachments` |
| Voice notes | `enableChatVoiceNotes` |
| Typing | `enableChatTypingIndicators` |
| Read receipts | `enableChatReadReceipts` |
| @tripbot | `enableTripbotNlExpenses` |

### 1. Settlement / dispute cards

1. Cards flag ON → add normal expense → expense card.
2. Add **Settlement:** expense → **settlement** card.
3. Dispute an expense (`enableExpenseDisputes` ON) → **disputed** card for B.
4. Resolve dispute → **resolved** card.
5. Flag OFF → no new event cards.

### 2. Why this split?

1. Cards + `enableExplainThisNumber` ON.
2. Long-press expense card → **Why this split?** → share list with amounts.
3. Explain flag OFF → action hidden.

### 3. Attachment tray

1. `enableChatAttachments` ON → composer **+** appears; OFF → no +.
2. **+ → Camera** → image bubble; B sees realtime; image loads.
3. **+ → Gallery** → same.
4. **+ → Attach expense** → pick bill → link card; tap opens expense.
5. Soft-delete own image → gone for both (optional: Storage → `chat-media`).

### 4. Voice notes

1. `enableChatVoiceNotes` ON → hold mic control; grant mic if prompted.
2. Release before 60s → playable bubble with duration for B.
3. Hold to ~60s → auto-stop at cap.
4. Deny mic → error, no corrupt message.
5. Flag OFF → no voice control.

### 5. Typing indicators

1. Flag ON; A and B on Chat.
2. A types (don’t send) → B sees “{Name} is typing…”.
3. A stops → clears after timeout.
4. Flag OFF → no typing line.

### 6. Read receipts

1. Flag ON; A sends text.
2. B opens Chat / catches up.
3. A sees read/caught-up state on own message (cursor-based, not outbox ticks).
4. If B never opens Chat → A should not see read.
5. Flag OFF → no read UI.

### 7. @tripbot

1. `enableTripbotNlExpenses` ON.
2. Send `@tripbot Dinner 450 food` → **confirm sheet** (no expense yet).
3. Cancel → no expense.
4. Confirm → expense in ledger; if cards ON → expense card in chat.
5. Bad parse `@tripbot hello` → parse error; no silent write.
6. Flag OFF → sends as normal text.

### Pass

- Each flag gates its UI/writes; media lands in `chat-media`; tripbot never auto-writes without confirm.

---

## Chat placement flags — Notes vs Tab 1

**Version:** v3.27.1 · **BUG-222** (Notes hub blanked when opening Chat).  
**Context:** `enableTripChat` = capability; `enableChatFirstNav` = placement only. Chat must not disappear when Chat-first is OFF.

### Flags

| Behavior | Flag | Default |
|----------|------|---------|
| Chat available | `enableTripChat` | ON |
| Elevate Chat to bottom Tab 1 | `enableChatFirstNav` | OFF |
| Notes / Checklist hub | `enableNotesAndChecklist` | ON |
| Passes in hub | `enableTravelPasses` | ON |

### Matrix

| Trip Chat | Chat-first | Expected |
|-----------|------------|----------|
| OFF | * | No Chat anywhere |
| ON | OFF | Chat under **Notes** hub (segment “Chat”) |
| ON | ON | Chat as **bottom Tab 1**; no Chat segment in Notes |

### Steps

1. Trip Chat ON, Chat-first **OFF**, Notes hub available → open **Notes** → tap **Chat** → thread loads (send a message). A Chat crash must show “Chat … error / Try again” (plus a short error detail line), not wipe the whole Notes hub forever. If you previously saw “Notes & Checklist … error”, hard-refresh once (MapLibre was pulled into Notes; that path is now lazy).
2. Trip Chat ON, Chat-first **ON** → bottom bar shows **Chat** first; Notes has no Chat segment; open Tab-1 Chat and send.
3. Trip Chat ON, Chat-first OFF, **Notes + Passes both OFF** → bottom bar still shows a Notes-style hub that opens Chat (fallback so Chat is not homeless).
4. Trip Chat **OFF** → no Chat tab and no Chat segment in Notes.
5. Ops Deck: `enableChatFirstNav` description mentions it **moves** Chat and requires Trip Group Chat.

### Negative checks

- Chat-first ON → Chat must not appear twice (Tab 1 and Notes).
- Trip Chat OFF → Chat-first ON alone must not invent a working chat without `enableTripChat` (panel may mount empty only if misconfigured; capability flag must gate).

### Pass

- Placement matches the matrix; homeless-Chat gap closed; Chat errors isolated from Notes.

---

## BUG-223 — Chat max update depth (v3.27.2)

**Commit:** pending in this release. **ADR:** #191.

### Flags
No new flag. `enableInChatEventCards` unchanged (not the crash cause).

### Steps
1. Trip with expenses; Trip Chat ON; Chat-first OFF.
2. Notes → Chat → thread loads (no error boundary).
3. Send a message; optional: toggle `enableInChatEventCards` and add an expense → card still works when ON.

### Negative checks
- Chat-first ON → Tab-1 Chat also loads without max-update-depth error.

### Pass
- No “Maximum update depth exceeded”; Chat usable.

---

## BUG-224 — Settlement Algorithm info modal opacity (v3.27.3)

**Commit:** `5e907a6`. **ADR:** #192.

### Flags
No new flag. Summary / Who owes who available when balances exist.

### Steps
1. Open a trip with unsettled balances → **Summary** → **Who owes who**.
2. Tap the **ⓘ** info control next to Simplified / Direct.
3. Confirm the **Settlement Algorithm** dialog has a solid opaque card (page text behind does not show through title or body copy).
4. Scrim dims the page; **Got it** / ✕ / tap outside closes the dialog.
5. Toggle Simplified ↔ Direct; reopen ⓘ — Active badge and copy stay readable in light and dark theme.

### Negative checks
- N/A (no feature flag).

### Pass
- Dialog text is fully readable; no bleed-through of “Who owes who” / amounts through the card.

---

## FEAT-078 — Settlement confirmation, share link, contact invite, weather nudges, expense approval (v3.28.0)

**Migrations:** `0098` (trip share link), `0099` (settlement confirmation), `0100` (expense approval threshold), `0101` (weather nudges). `0102` (Google Calendar sync) and its edge functions were shipped, then fully removed by `0103` before any user connected — see decisions.md #194. Not covered below.
**New edge functions:** `send-weather-nudge`.
**Manual setup required** (server-side, one-time, not code): Vault secret `weather_nudge_cron_secret` (see migration 0101 header) — already set for this project; until set, weather nudges silently no-op on schedule instead of erroring.

### Flags

| Behavior | Flag | Default |
|----------|------|---------|
| Two-sided settlement confirmation | `enableSettlementConfirmation` | OFF |
| Read-only trip share link | `enableTripShareLink` | OFF |
| Invite from phone contacts | `enableContactInvite` | OFF |
| Weather-triggered itinerary nudges | `enableWeatherItineraryNudges` | OFF |
| Big-expense mutual approval | `enableExpenseApprovalThreshold` | OFF |

### A. Settlement confirmation

1. `enableSettlementConfirmation` OFF → record a settlement (A pays B) → open it from the expense list → no confirm button, no status banner.
2. Flag ON → A records the settlement → as **B**, open the settlement from the list → "Confirm Receipt" button visible; A does not see it on their own copy.
3. B taps Confirm → banner switches to "✓ Confirmed received by B"; A's view updates on refresh.
4. B gets a push/in-app notification ("...confirm you received it") when the settlement is recorded.
5. Confirming twice (retry) is rejected server-side (`already confirmed`).

### B. Read-only trip share link

1. `enableTripShareLink` OFF → Share & Export modal → no "Read-only summary link" section.
2. Flag ON → open **Share & Export** → **Generate Share Link** → link appears, copy works.
3. Open the link in a private/incognito window (logged out) → trip name, dates, destination, traveler/expense counts, and total spend by currency render — **no** member names, no individual expenses, no balances.
4. **Revoke Link** → reloading the same URL shows "This link has ended or expired."
5. Regenerating issues a new token; the old link stops resolving.

### C. Invite from phone contacts

1. `enableContactInvite` OFF → Share & Export modal → no "Invite From Contacts" button.
2. Flag ON, **native app only** (button hidden on web) → tap **Invite From Contacts** → OS contact picker opens.
3. Grant permission, pick a contact → OS share sheet opens prefilled with a message containing the join link.
4. Deny contacts permission → inline error shown, no crash.

### D. Weather-triggered itinerary nudges

1. `enableWeatherItineraryNudges` OFF for all trips → no nudge pushes/notifications appear regardless of forecast.
2. Flag ON (global or trip override) for a trip with a route stop that has coordinates, ending in the future → after the daily cron fires (18:00 UTC) and Open-Meteo reports ≥60% precip probability or a stormy code for tomorrow at that stop, all linked participants get a push + in-app notification ("Rain looks likely tomorrow...").
3. A trip already nudged today is not nudged again even if the job re-runs (`weather_nudge_log` dedupe).
4. A trip with no stop coordinates and no `destination` text is skipped, not errored.

### E. Big-expense mutual approval

1. `enableExpenseApprovalThreshold` OFF → **Balances** tab has no "Require 2nd approval above" field; expenses of any size post normally.
2. Flag ON → trip admin sets a threshold (e.g. 5000) in **Balances** → an expense at/above that amount saves with a ⏳ badge in the list and doesn't move balances (Balances tab total unaffected).
3. Open the pending expense → "Pending approval" banner + **Approve** button visible to anyone **except** its creator.
4. A second member taps Approve → badge/banner clear, balances update to include it.
5. The creator does not see an Approve button on their own pending expense (self-approval blocked server-side too).
6. A settlement above the threshold is **not** gated (settlement confirmation, section A, covers that trust path instead).
7. Clearing the threshold field (empty) turns the gate off for that trip; expenses of any size post normally again.

### Negative checks

- All five flags OFF → none of the new UI (share link section, contacts button, approval field/badges) renders anywhere, and no new push/notification types fire.

### Pass

- Each flag independently gates its feature with no bleed into the others; balances/analytics never include a pending-approval expense; the share link never exposes member-level data.

---

## FEAT-079 — Multi-payer single expense, ledger UI enhancements, quick filter chips (v3.29.0)

**Migrations:** `0104_multi_payer_expenses.sql`. **ADR:** #195.

### Flags
| Behavior | Flag | Default | Phase |
|----------|------|---------|-------|
| Multi-payer contributions per expense | `enableMultiPayerExpenses` | OFF | Phase 4 |
| Sticky glassmorphic day-total headers | `enableStickyDayHeaders` | OFF | Phase 1 |
| Category icon ambient glow rings | `enableCategoryColorRings` | OFF | Phase 1 |
| OLED Pure Black theme in Settings | `enableAmoledTheme` | OFF | Phase 4 |
| Quick filter chip bar on Expenses tab | `enableExpenseQuickFilterChips` | OFF | Phase 5 |

### A. Multi-Payer Single Expense

1. `enableMultiPayerExpenses` OFF → Add Expense form shows standard single "Paid By" member dropdown.
2. Flag ON → Add Expense form shows a segmented toggle: **Single Payer** vs **Multiple Payers**.
3. Select **Multiple Payers** → Member list appears with input fields for each member's contribution amount.
4. Tap **Split Equally** → Total expense amount is divided equally among members with cents rounded and balanced.
5. Manually edit shares → The allocation counter displays "Allocated: $X / $Y" with green checkmark when balanced, or warning badge if sum does not match total expense.
6. Attempt to submit with mismatched allocation → Form displays validation message preventing save.
7. Save balanced expense → On the Expenses ledger, expense row displays an avatar stack of all contributing payers and the count of contributors.
8. Balances & Settlements → Verify in Balances tab that each contributing payer is credited their exact paid portion, and debts are minimized correctly.

### B. Sticky Day-Total Headers

1. `enableStickyDayHeaders` OFF → Date headers scroll away naturally with standard static styling.
2. Flag ON → Date group headers become sticky at the top of the viewport when scrolling down the expenses ledger.
3. Verify sticky header displays the day's formatted date, expense item count pill, and total sum of actual expenses spent that day.
4. Verify smooth background blur (`backdrop-filter: blur(12px)`) with crisp contrast in light, dark, and OLED themes.

### C. Category Ambient Color Glow Rings & Tabular Numerals

1. `enableCategoryColorRings` OFF → Category icons render standard circular badges.
2. Flag ON → Category icons on expense rows render with a vibrant duo-tone ambient glow ring matching the category accent palette.
3. Tabular numerals check: Amounts across ledger rows and day headers maintain uniform character width and digit alignment (`font-variant-numeric: tabular-nums`).

### D. OLED Pure Black Theme

1. `enableAmoledTheme` OFF → Settings → Appearance only shows "System", "Day flight", "Night flight".
2. Flag ON → Settings → Appearance shows "OLED" pure black theme option.
3. Switch to OLED → Page background flips to true `#000000`, card borders have clean high-contrast edges, saving power on AMOLED screens.

### E. Quick Filter Chip Bar

1. `enableExpenseQuickFilterChips` OFF → Quick filter chip bar above expenses list is hidden.
2. Flag ON → Horizontally scrollable chip bar renders right above the ledger with:
   - **All** (active default with count)
   - **My Expenses** (filters expenses involving current member)
   - **Paid by Me** (filters expenses where current member is the primary or joint payer)
   - **Pending ⏳** (filters expenses awaiting threshold approval)
   - Top category chips (e.g. Food, Stay, Travel)
   - Spending thresholds (e.g. `> 1000`)
3. Tap **Paid by Me** → Ledger immediately filters without page reload or network request.
4. Tap **All** → Ledger resets to full list instantly.

### Negative checks
- All five flags OFF → The app looks and behaves exactly as v3.28.1 with single-payer dropdown, classic date headers, standard category badges, and no quick filter bar.

### Pass
- Each of the 5 flags functions completely independently with zero regressions, settlements balance to exact zero, and build/tests pass 100%.

---

## FEAT-080 — Data Saver, Compact Ledger View, Category Reorder, What's New Hub (v3.30.0)

**Migrations:** `0105_category_order.sql`. **ADR:** #197.

### Flags
| Behavior | Flag | Default | Phase |
|----------|------|---------|-------|
| Data Saver mode (map stays collapsed, no celebration animations) | `enableDataSaverMode` | OFF | Phase 3 |
| Compact/dense expense ledger rows | `enableCompactLedgerView` | OFF | Phase 1 |
| Manual up/down category reorder | `enableCategoryReorder` | OFF | Phase 1 |
| Tappable version → "What's New" screen (Settings → About) | `enableWhatsNewHub` | OFF | Phase 1 |

### A. Data Saver Mode

1. `enableDataSaverMode` OFF → Settings → Preferences shows no Data Saver row; trip dashboard map loads normally on open.
2. Flag ON → Settings → Preferences shows a **Data Saver** toggle (OFF by default).
3. Turn it ON → reopen a trip → the map area shows a **"🗺️ Map hidden to save data · Tap to load"** placeholder instead of the live map; the content sheet starts fully expanded over it.
4. Tap the placeholder → the real map (MapLibre) loads immediately for the rest of this session.
5. Reload the page (fresh session) with Data Saver still ON → map is hidden again (placeholder, not auto-revealed) — confirms the reveal is per-session, not permanent.
6. With Data Saver ON, trigger a settlement / UPI "Mark as Settled" / checklist-100%-complete celebration → no confetti plays (compare to Data Saver OFF, where confetti plays normally).
7. Slow-connection nudge: in DevTools → Network → set throttling to "Slow 3G" (or set `navigator.connection.saveData` via a quick console call if throttling doesn't expose it), reload with Data Saver OFF → a dismissible banner appears suggesting Data Saver; tapping **Enable** turns the toggle on and hides the banner; tapping the ✕ dismisses without enabling and doesn't reappear on next reload.

### B. Compact Ledger View

1. `enableCompactLedgerView` OFF → Settings → Preferences shows no Compact Ledger row; Expenses tab rows render at normal size.
2. Flag ON → toggle appears in Settings; turning it ON immediately shrinks row padding, category icon box, and icon size on the Expenses tab ledger.
3. Turn OFF again → rows return to normal size.

### C. Manual Category Reorder

1. `enableCategoryReorder` OFF → Settings → Categories & Tags shows no up/down arrows next to each category.
2. Flag ON → up/down chevron buttons appear next to every category row; the first row's up-arrow and the last row's down-arrow are disabled.
3. Move a category down, then reopen Settings → Categories & Tags → new order persists (same device).
4. Open the Add Expense form's Category picker → the same reordered sequence appears there too.
5. On a second device/browser signed into the same trip, refresh → the reordered sequence syncs (confirms the Supabase `category_order` write, not just local state).
6. Add a brand-new custom category after reordering → it appears at the end of the list (unlisted categories render last), not inserted into the middle.

### D. "What's New" on the Version Screen (reworked in v3.30.1)

1. `enableWhatsNewHub` OFF → Settings → Help & About → About & Legal: the version cell reads "Version X · Web Edition" and is not tappable; there is no separate "What's New" row anywhere in Settings.
2. Flag ON → the version cell reads "Version X · See what's new" and shows a chevron.
3. Tap it → iOS-style "What's New" screen: subtitle "Version X · date", a bullet list of this release's changes, and an "Earlier versions" section below.
4. Back → returns to About & Legal (not the Settings root).
5. Search Settings for "new" → no standalone What's New result appears.

### Negative checks
- All four flags OFF → app behaves exactly as v3.29.1: map always loads immediately, ledger rows at normal size, no reorder controls, no What's New entry.

### Pass
- Each of the 4 flags functions independently with zero regressions; Data Saver measurably stops the map from mounting (verify via DevTools Network tab — no `tiles.openfreemap.org` requests until the placeholder is tapped); category order syncs across devices; What's New badge correctly reflects only genuinely new flag activity, never the initial baseline.

---

## BUG-227 — Voice expense payer is the signed-in member

**Why:** Voice Quick-Add used `visibleMembers[0]` (usually the trip creator, e.g. Rahul) whenever speech did not name a payer, then hid that default in the preview. Auto-save in 3s wrote the wrong person.

**Flags:** `enableVoiceInput` (existing). No new flag.

### Prep
1. Use a trip with at least two linked members (A = trip creator, B = someone else).
2. Sign in as **member B**. Confirm B is a linked trip member (not just a guest viewer).
3. Superadmin → Ops Deck → Flags: `enableVoiceInput` **ON** for this trip.

### Steps
1. Open the trip as B → Voice Quick-Add (mic / command palette “Voice quick-add”).
2. Speak or type **`500 coffee`** (no name). Parsed preview must show **Paid by B (you)**, not A.
3. Let the 3s auto-save complete (or tap Save). Expense ledger: **Paid by B**.
4. Speak **`I paid 200 for cab`**. Payer is B.
5. Speak **`Lunch 1200 paid by` + A's name**. Payer is A (explicit name still wins).
6. Change the Paid-by dropdown to A before save → auto-save pauses; saving stores A.
7. If B is not a linked member, preview asks **Who paid?** and does **not** auto-save until a member is picked.
8. Add Expense form (not voice): new expense Paid-by defaults to **B**, not the first member.

### Negative checks
- `enableVoiceInput` OFF → Voice Quick-Add is hidden; Add Expense form still defaults Paid-by to the signed-in member.
- Explicit "paid by [other member]" must never be overwritten with the speaker.

### Pass
- Whoever is signed in is the default payer for unnamed voice/NL expenses; the preview always shows who paid; named payers still win.

---

## Expeditions chip contrast + iOS stack swipe

**Commit:** v3.30.4 / BUG-229 + BUG-230 (see `decisions.md` ADR 201). **Migrations:** none.  
**Flags:** none.

### Steps
1. Home (trips list) with a **bright** cover photo behind the header (sky, snow, beach). The `N Expeditions` chip is **dark text on a light pill**, readable against the photo. Greeting text stays readable.
2. Swipe the stack to a **dark** cover photo. The chip becomes **light text on a dark pill**. It never stays sky-blue on a blue sky.
3. With no cover photo (or before the image loads), the chip uses theme text/`--bg-surface` and is still readable in light and dark theme.
4. On **iPhone Safari / Capacitor**: swipe the trip stack left/right. The front card tracks the finger without hitching at drag start; peek cards rise; release still browses. Swipe up still archives. Long-press still opens edit/delete.
5. Repeat stack swipes several times in a row. No stutter when the next card becomes front.

### Negative checks
- **Android Chrome**: stack cards still have the 3D tilt while dragging. Glass/blur on Android home chrome is unchanged.
- Flag N/A.

### Pass
- Expeditions count is readable on bright and dark trip photos.
- iOS stack swipe tracks the finger without the post-v3.30.3 hitch; Android look/feel is unchanged aside from the chip contrast.

---

## iOS WebKit compositor feel

**Commit:** v3.30.3 / BUG-228 (see `decisions.md` ADR 200). **Migrations:** none.  
**Flags:** none — always-on WebKit compositor fallback. Android Chrome must keep existing glass.

### Steps
1. On **iPhone Safari** (and Capacitor if installed): open login. Glass cards are solid/opaque, not heavy blur. Screen does not hitch on first paint.
2. Home trip stack: swipe left/right/up. Front card tracks the finger; peek cards scale without live `filter: blur`. Release commits browse/archive as before.
3. Open a trip: drag the content sheet. Sheet follows the finger; map does not pan during the drag. Snap is a transform spring (no jump when it settles).
4. Expense list: swipe a row to Edit/Delete. Row tracks the finger; action reveal fades in.
5. Swipe between tabs (from the screen edge). Panes follow the finger, then settle.
6. Open a modal / action sheet. Overlay is a darker solid, not frosted glass. Drag-to-dismiss still works.
7. Keyboard on Add Expense: sheet still clears the keyboard; layout does not jump every scroll frame.

### Negative checks
- **Android Chrome** (or desktop Chrome): login glass, stack pills, and modal overlays still use `backdrop-filter` blur. Gestures still commit the same actions.
- Flag N/A — there is no Superadmin flag for this UX fix.

### Pass
- iOS scroll/drag feels within a small gap of Android (no 15–30fps sheet/stack hitch). Android visuals are unchanged.

---

## Navigation, dialogs & sync UX pass (v3.31.0)

**Ids:** BUG-232 (F1), BUG-233 (F2), BUG-234 (F4), BUG-235 (F5), BUG-236 (F6); FEAT-083 (A), FEAT-084 (B), FEAT-085 (C), FEAT-086 (D), FEAT-087 (E). **Migrations:** none. **ADR:** #203.

### Flags
| Behavior | Flag | Default | Phase |
|----------|------|---------|-------|
| Back walks the tabs you visited (up to 5) | `enableTabBackHistory` | OFF | Phase 1 |
| `?trip=&tab=` mirrors the open screen; refresh / shared link restores it | `enableDeepLinkedTabs` | OFF | Phase 1 |
| Undo toast for member delete, member archive, recorded settlement | `enableExtendedUndo` | OFF | Phase 1 |
| New-expense draft survives app close (24h), covers payers / currency / location / itemized receipt | `enablePersistentExpenseDraft` | OFF | Phase 2 |
| Offline queue shows readable items, errors, per-item Retry / Discard | `enableSyncQueueInspector` | OFF | Phase 5 |

Arm each in Superadmin **Ops Deck → Flags** (arm the whole phase, or use **Tune Individual Flags**).

### Fixes (no flag — verify with all flags OFF)

**F1. Back closes the three overlays that used to ignore it**
1. (needs `enableSimplifyDebtsToggle`) Open a trip → Balances → tap the info icon next to "simplify" → the **Settlement Algorithm** sheet opens. Press browser Back / Android back / swipe-back → only the sheet closes; you stay on the same trip and tab. Repeat with **Esc** on desktop.
2. (needs `enableTripCloseout`) Settings → **Close out trip** → the closeout modal opens. Press Back → only the modal closes.
3. Go offline (DevTools → Network → Offline) and make any edit → tap the **In-Flight** pill → the queue drawer opens. Press Back → only the drawer closes.
4. In each case, with the overlay closed, one more Back leaves the trip as before (no extra history entry left behind).

**F2. Android: press back again to exit** (native Android build only)
1. From the trips list (root screen), press the back button once → a **"Press back again to exit"** pill appears and the app stays open.
2. Press back again within 2 seconds → the app exits.
3. Press once, wait 3 seconds, press again → the hint shows again (no exit).
4. Inside a trip / any sheet, back still steps out one level as before (no hint).

**F4. Web: reload warning on an unsaved new expense** (flag `enablePersistentExpenseDraft` OFF)
1. Add Expense → type a title or amount → reload or close the tab → the browser shows its "Leave site?" prompt.
2. Empty form, or editing an existing expense → no prompt.
3. Save the expense → no prompt afterwards.
4. Native app: no prompt at all (not applicable).

**F5. No more native `alert()` popups**
1. New Trip → enter a name, leave dates empty → **Save Trip** → a red inline message *"Please choose a start and end date for the trip."* appears under **Dates**; no browser alert. Pick both dates → message clears; trip saves.
2. Biometric enroll prompt (needs `enableBiometricAuth`, device with a passkey): cancel the system prompt / cause a failure → the error appears inside the prompt card in red. No alert; tapping ✕ clears it.

**F6. Focus is trapped and restored in the overlays** — open the simplify sheet or the queue drawer with the keyboard (Tab/Enter): Tab cycles inside the dialog; Esc closes it; focus returns to the button that opened it.

### A. `enableTabBackHistory`
1. Flag OFF → open a trip, go Summary → Expenses → Members, press Back → jumps straight to **Summary** (old behavior).
2. Flag ON → repeat: Back goes **Members → Expenses → Summary**, one step at a time; one more Back leaves the trip.
3. Switch to the same tab you're already on → no extra Back step.
4. Switch tabs more than 5 times → the last 5 steps are walkable; Back never breaks or skips the trip exit.
5. Swipe between tabs (edge swipe) → those switches are recorded too.
6. Leave the trip with the on-screen back arrow while on the Members tab → trips list shows; press Back once → you are **not** dropped into a stale tab of the old trip.
**Pass:** Back always retraces tabs in reverse order; leaving the trip is always the last step.

### B. `enableDeepLinkedTabs`
1. Flag ON → open a trip and switch tabs → the address bar shows `?trip=<id>&tab=<tab>` (Expenses tab = `ledger`, Summary = `expenses`). The Back stack is unchanged (no new entries).
2. Reload → you land on the same trip and tab.
3. Paste that URL into a new browser tab (signed in) → same trip and tab. Signed out → login, then you land on it afterwards.
4. Edit the URL to a trip id you don't belong to, or a tab that doesn't exist (`tab=nope`) → the app opens normally, no error, and the URL is rewritten to the real state.
5. Leave the trip → `trip` / `tab` are removed from the URL; other query params stay.
6. With `enableTabBackHistory` also ON: open a URL with `tab=members` → Back returns to Summary before leaving the trip.
7. Flag OFF → URL never gets `trip` / `tab`; existing `?trip=` in the URL is ignored.

### C. `enablePersistentExpenseDraft`
1. Flag OFF → type into Add Expense, hard-reload → reopening shows the draft only within the same browser tab session (old behavior); closing the tab loses it. Nothing stored in `localStorage` under `tt_draft_expense_*`.
2. Flag ON → Add Expense → title `Beach shack lunch`, amount `450`; wait 1s → DevTools → Application → Local Storage → `tt_draft_expense_<tripId>` exists with `savedAt`.
3. Close the tab / kill the app and reopen → Add Expense shows **"Restored unsaved draft"**, with title, amount, category, date, payer, split, multi-payer shares, currency, location, and itemized items restored.
4. Tap **Discard** on the banner → fields reset and the storage key is gone.
5. Save the expense → draft is removed; reopening Add Expense is blank.
6. Edit `savedAt` in DevTools to more than 24h ago → reopening shows a blank form and the key is deleted.
7. Background the app right after typing (switch tab / app) → the draft is still saved (flushed on hide).
8. With the flag ON, the browser "Leave site?" prompt (F4) is **not** shown.

### D. `enableSyncQueueInspector`
1. Flag OFF → go offline, make 2 edits → pill shows "2 staged offline"; drawer rows show a raw type name and "Staged locally", no buttons.
2. Flag ON → drawer rows read like **"Add expense: Dinner"**, **"Delete member: Asha"**, **"Create trip: Goa"**, each with **Retry** (online only) and **Discard**.
3. Go online with a change the server rejects (permission / policy error) → the row stays in the drawer with a red border, **"Needs attention: <error>"**, and is **not** dropped silently. It is skipped by automatic sync until you tap **Retry**.
4. A network failure shows **"Retrying (attempt N): <error>"** and keeps retrying automatically.
5. **Discard** → first tap changes the button to **Confirm?**, second tap removes the row. Discarding a queued *Add expense* also removes that expense from the ledger and anything queued against it.
6. Discarding the last item closes the drawer (banner disappears when online); pressing Back afterwards leaves the trip, not a ghost drawer.
7. Reload with items queued → rows, errors and "Needs attention" markers persist.

### E. `enableExtendedUndo`
1. Flag OFF → Members tab → delete a member (confirm) → member is deleted immediately, no undo toast.
2. Flag ON → delete a member (confirm) → member disappears from the list at once and a toast **"Member 'X' deleted · Undo"** shows for about 2 seconds.
   - Tap **Undo** → member is back, with balances and groups intact. Do nothing → member is deleted for good when the toast ends (offline queue shows "Delete member: X").
   - Delete member A, then quickly member B → A is deleted for good (committed), B gets the toast.
3. Archive a member → toast **"Member 'X' archived · Undo archive"**; Undo restores them. Restore an archived member → toast **"restored · Undo restore"**.
4. Record a settlement (Balances → Settle → confirm) → toast **"Settlement recorded · Undo settlement"**; Undo removes the settlement expense and the balance returns.
5. Leave the trip / close the app mid-toast on a member delete → the delete is committed, not lost.

### Negative checks
- With **all five flags OFF**: tab Back jumps to Summary, no URL params, no draft in `localStorage`, drawer rows show raw type names with no buttons, no undo toast for members or settlements. Fixes F1–F6 still apply.
- Superadmin **Traveler Preview** follows the same flags as real users.

### Pass
- Back always closes the top-most overlay first, then retraces tabs (flag ON), then leaves the trip; nothing is left in the history stack afterwards.
- A failed offline change is never lost without the user choosing **Discard**.
- Drafts survive an app kill for up to 24h and vanish after save, Discard or expiry.

## FEAT-TRIPSORT — Trip stack alphabetical swipe + sort toggle

**Commit:** `40d0d01`. **Migrations:** none.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Sort: A–Z / Date toggle under the stack | `enableTripStackSort` (Phase 1 Core) | OFF |
| Alphabetical ring + directional swipe | none (fix to existing behavior) | always on |

### Prep
Account with 4+ trips, e.g. Bali, agra, Goa, Coorg (mixed case, different start dates). Phone width (<900px).

### Steps
1. Open Home. Front card is **agra** (first A–Z, case-insensitive), not the newest trip.
2. Swipe **left** repeatedly: agra → Bali → Coorg → Goa → back to agra (wraps).
3. Swipe **right** repeatedly: agra → Goa → Coorg → Bali → agra.
4. Watch the pagination dots: the active dot moves in the same order; tap a dot to jump to that trip; scrub across the dots.
5. Enable `enableTripStackSort` in Ops Deck, reload. A `Sort: A–Z` pill appears beside "View all trips".
6. Tap it → `Sort: Date`; front card becomes the newest trip; left = next older, right = newer. Reload: choice persists.
7. Swipe up to archive a trip: stack advances without errors.
8. (v3.32.5, BUG-238) With 4+ trips, swipe left and right repeatedly, also fast flicks: the swiped-away card must not flash back at the front, and no blank white card should appear before the photo.
9. (v3.32.6, BUG-239) Drag slowly to the right without releasing: the trip rising behind the front card must be the *previous* trip (alphabetical/date), not the next one. Release: that same trip becomes the front with no swap. Drag left: the next trip rises.

### Negative checks
- Flag OFF → no Sort pill; order is always A–Z; left/right still step next/previous.
- 1 trip → no pill, swipe rubber-bands.

### Pass
- Left/right are exact opposites and wrap; dots match the stack; toggle persists.

---

## PERF-OPS-STACK — Ops Deck load + home stack smoothness

**Commit:** `432b854` (v3.32.7, BUG-240 / BUG-241). **Migrations:** none. **Flags:** none.

Two related performance fixes: Ops Deck / Bug Ledger no longer download the whole fleet on first paint, and the home trip stack drops live blur + forced reflow during swipe.

### Prep
- Superadmin account with a real Supabase project (not dummy env).
- Traveler account with 4+ trips that have cover photos.

### Steps

#### Superadmin portal / Bug Ledger
1. Sign in as superadmin. Default landing is Command Center (or Bugs if you used `#/bugs`).
2. Command Center should show the shell (rail, clock, health pill) quickly. Spend / settlement widgets may fill in a moment later — they wait on expenses, not on Bugs/Audit/Users.
3. Open **Bugs**. The table/kanban appears without a second full-ledger download. Expand a row or open the drawer: diagnostics / screenshot load then, not on first list paint.
4. Open **Analytics** or **Trips** after sitting on Bugs: expenses load on that tab, not retroactively while you were on Bugs.
5. Tap **Refresh** on a page: that page's data reloads. Jump search still finds trips from the already-loaded trip graph.

#### Home card stack
1. Open Home on a phone-width viewport with 4+ photo cards.
2. Drag slowly left and right: the front card tracks the finger without stutter; peek cards rise in the swipe direction (left = next, right = previous).
3. Flick left/right repeatedly: no blank white card, no flash of the old trip back to the front, no clunk at the end of the swipe.
4. Swipe up to archive: still works; confirm remains.
5. Data Saver ON: stack still swipes; no regression.

### Negative checks
- Non-superadmin never sees Ops Deck.
- Flag `enableTripStackSort` OFF: no Sort pill (existing). Stack smoothness does not depend on the flag.

### Pass
- Opening Ops Deck or Bugs no longer waits on every expense, audit log, user, and bug diagnostic before the first useful screen.
- Home stack swipe stays on the finger through the gesture and the commit, with no flash or hitch.

---

## FEAT-GROWTH2 — Invite conversion, telemetry, passport, nudges (v3.37.0)

**Commit:** `09e8785`. **Migrations:** `0108_growth_telemetry_and_lifecycle.sql` (applied to the live project on 2026-09-22; it had never run against a database before that, so verify on the first arm). **Edge function:** `send-lifecycle-nudge` (deploy, then one-time Vault secret `lifecycle_nudge_cron_secret` and env `LIFECYCLE_NUDGE_CRON_SECRET`, see migration header).

### Flags
| Behavior | Flag | Pack | Default |
|----------|------|------|---------|
| Invite preview value block + invite signup tag; share-page signup button | `enableInviteConversion` | Core | ON |
| Traveler Passport card in Settings | `enableTravelerPassport` | Trip | ON |
| App-open / sync-health events, join-preview counter, Retention + Reliability cards | `enableGrowthTelemetry` | Ops | OFF |
| Daily lifecycle push job | `enableLifecycleNudges` | Travel | OFF |

### A. Invite & share conversion (`enableInviteConversion`)
1. Ops Deck → Flags: confirm the flag is ON. Signed out (private window), open a real `/join/<code>`.
2. Preview shows the trip name, dates, who is on it, a three-line "what you get" block, then Continue with Google. Sign in and claim a name.
3. Ops Deck → Analytics → Growth → Signup source: `invite` increases by 1 for a **new** account. Known limit: an older account with no stored signup source that signs in through an invite link is also tagged `invite`.
4. Signed out, open `/share/<token>` from a trip with Share link on: a green "Splitting a trip with friends? Track it free" button shows under the totals. Tap it: lands on `/login`, and after a fresh Google signup the source shows as `trip_share`.
5. Guests still see no expenses, balances or member list on either page.

**Negative checks:** flag OFF → preview is the plain Google-only screen, share page has no button, no `invite` / `trip_share` source is recorded. An RPC failure also renders the original UI.

### B. Growth telemetry (`enableGrowthTelemetry`)
1. Flag OFF (default): open the app, then in the DB `select count(*) from app_events` stays 0; Growth cards show "No events yet".
2. Arm the flag globally. Reload as a normal user: one `app_open` row for today. Reload again: still one.
3. Go offline, add an expense, stay online-but-blocked (or leave the queue non-empty) for 10+ minutes: one `queue_stuck` row. Force a failing sync: one `sync_fail`. Let a queue drain: one `flush_ok`. Each appears at most once per session.
4. Open a signed-out `/join/<code>`: that trip's `join_preview_count` goes up by 1. Invalid code: nothing changes and no error is shown.
5. Ops Deck → Analytics → Growth: Retention table, Trip 1 → trip 2 tile, Sync reliability table and the "Signed-out invite previews" bar all render. Non-superadmin calling the `admin_*` RPCs gets "Superadmin access required".
6. `props` never contains expense, member or search text (inspect a few rows).

**Negative checks:** flag OFF again → new inserts are rejected by RLS and nothing is sent; join previews stop counting.

### C. Traveler Passport (`enableTravelerPassport`)
1. Settings shows a "Traveler Passport" card above "This Trip" with Trips, Destinations, Settled, Days away.
2. Two trips with destination "Goa" and " goa " count as 1 destination. A closed trip adds to Settled. A future trip adds no days.
3. No currency amounts appear anywhere on the card.

**Negative checks:** flag OFF → no card. No trips → no card.

### D. Lifecycle nudges (`enableLifecycleNudges`)
1. Flag OFF (default): invoke the function manually with the secret header: response `{"nudged":0,"candidates":0}` and nothing is sent.
2. Arm globally (or on one test trip). Create a trip older than 24h with no expenses and nobody else joined: the next run sends the organizer "Nobody has joined yet… code XXXXXX" (push if a token is registered, always an in-app "Trip Tip" notification).
3. Trip starting in 2 days with an empty checklist: packing nudge. A closed trip that ended 30 days ago: next-trip nudge.
4. Run again: no duplicate for the same trip + kind. A second eligible trip for the same user within 3 days: not sent.
5. User with Quiet hours active, or Digest mode ON: gets the in-app notification but no push.

**Negative checks:** flag OFF → nothing selected, nothing sent. Settlement reminders are unaffected either way.

### Pass
- With the two default-OFF flags left OFF, no new data is collected and no push is sent.
- Every new surface disappears when its flag is turned OFF.

---

## iOS visible height and compositor

**Commit:** v3.37.1. **Migrations:** none. **Flags:** none — WebKit-only. Android Chrome keeps the current height, glass, and 3D stack.

### Steps
1. On **iPhone Safari** (or the installed home-screen web app), open the trips home with at least two trips. The front card stays a portrait 3:4. The slide-to-join launcher sits above the browser toolbar and the home indicator. Nothing is clipped and there is no large empty band under the card.
2. Show and hide the Safari toolbar (scroll is locked, so rotate the phone, or switch apps and come back). The card rescales to the height you can see. It does not stay sized for the taller layout behind the toolbar.
3. Swipe the stack left and right. The front card tracks the finger. The home photo behind it does not blur or hitch while the card moves.
4. Open a trip and drag the content sheet up, then release. The sheet follows the finger and snaps. The map stays still until the snap finishes, then panning works again.
5. Focus the trip chat field so the keyboard opens. The sheet and header stay on screen. The map does not jump up and fill the view.

### Negative checks
- **Android Chrome**: home cards keep their current size. Login and home chrome still use blur. Dragging a stack card still tilts in 3D. Dragging the trip sheet still pauses the map only while the finger is down.
- No Superadmin flag. There is nothing to turn off.

### Pass
- iPhone home fits the visible height, and sheet snaps do not wake the map mid-animation.
- Android look and motion are unchanged.

---

## FEAT-BOARDINGPASS — Boarding Pass login screen + rotating backdrop gallery

**Commit:** unreleased (local testing, not yet pushed). **Migrations:** none (`app_config.value` is already `jsonb`).

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Traveler login/home screen becomes a ticket-styled boarding pass (perforated stub, gate-code join, barcode-style staff link, rotating destination photo) | `boardingPassLogin` | **OFF** — staged-rollout exception to Core's normal default-ON, since this replaces the entry screen for every traveler. Arm deliberately in Ops Deck → Flags. |

Superadmin credentials screen (`Superadmin` link on the login page) is unchanged either way.

### Prep
1. Superadmin → Ops Deck → **Visuals & Branding** → Landing Page Cover Gallery: select 2–3 presets (or add a custom URL / upload a photo) and **Apply Background**. Confirm the chip row shows "N selected · rotating on the login screen."
2. Superadmin → Ops Deck → **Flags**: locate `Boarding Pass Login` (Core pack) and arm it.

### Steps
1. Sign out, load `/login`. Confirm the ticket layout: "PASSENGER / You / Not signed in" header, dashed perforation, **Board with Google** button, Terms of Service + Privacy Policy links directly under it, a second perforation, a **GATE CODE** join field + Join button, and a 256-bit encryption seal + Superadmin link at the bottom.
2. If 2+ photos were selected in prep, confirm small rotation dots appear under the tagline, and the backdrop photo crossfades to the next one every ~5s (dot moves with it). With only 1 photo selected, no dots should render and the backdrop stays static.
3. Confirm **Terms of Service** and **Privacy Policy** links navigate correctly and are reachable before any sign-in action.
4. Tap **Board with Google** and confirm the normal Google OAuth flow still starts (unchanged handler).
5. Enter a valid 6-digit trip code in the gate-code field and confirm **Join** still routes to `/join/:code` (unchanged handler).
6. Tap **Superadmin** and confirm the existing staff credentials screen still loads normally (this screen is not reskinned).
7. Resize to desktop width and confirm the ticket stays centered and readable (no horizontal scroll).

### Negative checks
- Flag OFF → login screen is pixel-identical to the pre-existing glass-card design (no ticket, no perforation, no rotation dots); no extra network call for `landing_backdrop_urls` is made (check Network tab).
- Removing photos down to 1 in the Cover Gallery removes the rotation dots and crossfade on next load; the gallery UI itself refuses to go below 1 selected photo (✕ button disables at the last one).
- Old installs that only ever set the legacy single `landing_backdrop_url` (never the array) still show that one photo correctly, on both flag states.

### Pass
- Flag OFF: zero visual or behavioral change from before this change.
- Flag ON: boarding-pass ticket renders correctly, legal links are visible pre-auth, Google sign-in and gate-code join both work unchanged, and multi-photo rotation crossfades smoothly with no console errors.

---

## BUG-245 — Remove home cross-trip IOU strip

**Commit:** v3.37.2. **Migrations:** none. **Flag removed:** `enableHomeNetBalance` (deregistered from `FeatureFlagKey`, `FEATURE_FLAGS_META`, `DEFAULT_FEATURE_FLAGS`, and the Core pack's `flagKeys` in `src/utils/featureFlags.ts` / `src/types/admin.ts`). It no longer appears in Ops Deck → Flags or Packs.

**Point:** The "You are owed / You owe" strip and its inline **Add** button, shown just below the greeting on the trips home screen, duplicated the per-card add-expense action and cluttered the header. Removed. The Settings → cross-trip balances view is unaffected (separate surface, unrelated code path).

### Steps
1. Open the app to the trips home screen (no trip open), signed in with a non-zero cross-trip balance in some currency.
2. Below the "Good morning/afternoon/evening" greeting, confirm there is **no** balance chip and **no** inline **Add** button — only the greeting/expedition-count line, then straight to **Your Trips**.
3. Open any trip and confirm **Add Expense** still works normally from the trip card / expenses tab (unchanged).
4. Superadmin → Ops Deck → Flags: confirm `enableHomeNetBalance` (a.k.a. "Home Cross-Trip You Owe / Are Owed") is no longer listed.
5. Settings → Profile & Settings: confirm the cross-trip You owe / You are owed summary there (if present) is unaffected.

### Negative checks
- No leftover flag toggle in Ops Deck for this surface.
- No console errors on the trips home screen from the removed `crossTripBalances`/`quickAddTrip` wiring.

### Pass
- Home screen shows greeting → expedition count → Your Trips, with no IOU strip or extra Add button in between.
- Settings cross-trip balance view still works.

---

## BUG-246 — Summary settlement explainer once

**Commit:** v3.40.1. **Migrations:** none. **Flags:** `enableSimplifyDebtsToggle` (Pro, default OFF) still controls the Simplified / Direct Debts switch. No new flag.

**Point:** On Trip Summary → Who owes who, “Minimizes transfers” and the “Simplified Settlements” card both opened the same Settlement Algorithm dialog. The extra link is gone. The card’s **How it works** is the only explainer.

### Steps
1. Open a trip with unsettled balances. Summary → Who owes who.
2. With `enableSimplifyDebtsToggle` armed, confirm the Simplified / Direct Debts switch is still there, and there is no “Minimizes transfers” or “Exact pairwise” link beside it.
3. Confirm the “Simplified Settlements” (or “Direct Settlements”) card is still shown, with a payment count and **How it works**.
4. Tap **How it works**. The Settlement Algorithm dialog opens once. Close it.

### Negative checks
- Flag OFF: the mode switch is absent, and there is still no second explainer link. **How it works** on the card still opens the dialog when transfers exist.
- Fully settled, or zero transfers: the card is absent.

### Pass
- One explainer entry on Summary. The mode switch still changes simplified vs direct debts.

---

## TAB-SWIPE — Left/right between bottom-nav screens

**Commit:** v3.40.1. **Migrations:** none. **Flags:** none new. Notes/Passes/Chat tabs still follow their existing flags. Settings stays a header screen and is not in the swipe.

**Point:** A horizontal swipe on the trip screen moves Summary, Expenses, Members, and Notes (and Chat when that nav is on) with the finger. The gesture attaches when the trip screen mounts, and a tall scrolling list does not cancel it.

### Steps
1. Open a trip on a phone-width touch session (device toolbar, touch emulation). Mouse drag does not count.
2. On Summary, swipe left. Expenses slides in. Swipe left again to Members, then to Notes if that tab is on the bar. Swipe right back through the same screens.
3. The incoming screen is filled in during the drag, not a blank pane that pops in at the end.
4. The bottom bar highlight matches the screen you landed on.
5. Start a swipe on the map: the tab does not change. Start one on a filter-chip strip: the tab does not change. Start one in the middle of a swipe-to-delete row: the row moves, the tab does not. Start one within a thumb of the left or right edge of that row: the tab changes.
6. Close-trip copy in Settings uses the same outstanding total as Summary → Who owes who.

### Negative checks
- No second “Minimizes transfers” explainer. How it works on the settlement card is unchanged.
- Settings is not reached by swiping past the last bottom-nav tab.

### Pass
- Touch swipe moves only between the tabs shown in the bottom bar, in that order, and does not fight the map, chip strips, or row gestures.

---

## SETTINGS-IA — Settings root screen

**Commit:** v3.40.1. **Migrations:** none.

Cleanup of the existing Settings list. No new feature flag. Existing flags still hide their rows.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Compact ledger row | `enableCompactLedgerView` | OFF |
| Data saver row | `enableDataSaverMode` | OFF |
| Daily digest | `enableDigestNotifications` | see registry |
| Quiet hours | `enableQuietHours` | see registry |
| Geotag | `enableGeotagging` | see registry |
| Passport line under your name | `enableTravelerPassport` | ON |
| Trip tools children | their existing flags | unchanged |

### Steps
1. Open Settings from the header (in a trip, and again from the global drawer).
2. The first screen shows your name and email, then This trip (Invite, Trip tools, Close trip), Notifications, Appearance, Data, Help, and Account with Sign out last.
3. Close trip appears once. There is no trip status chip and no unsettled / members / expenses strip.
4. Open Notifications. Mute, daily digest, quiet hours, and pass reminders are on that screen. Mute is not inside Trip tools.
5. With those flags on, search “quiet”, “digest”, “mute”, and “geotag”. Each match shows on the list without opening a screen first. With the flag off, that search stays empty.
6. With `enableTravelerPassport` ON, one line under your name shows trip and destination counts. With it OFF, that line is gone.
7. Switches have no ON/OFF pill beside them. Status labels have no emoji.

### Negative checks
- Flag OFF for digest, quiet hours, geotag, data saver, or compact ledger: that control is absent.
- No second Close trip control on the first screen.

### Pass
- The first screen is the six groups above, search still finds moved controls, and flagged rows stay hidden when their flags are off.

---

## UX-TRIPS-VIEWS — Stack corners, smooth swipe, list glass

**Commit:** v3.40.2. **Migrations:** none.

Polish of the existing trips stack and list. No new feature flag.

### Flags
None new. The trips list is the home screen.

### Steps
1. Open Trips on a phone-width window with at least two trips. Stay on stack view.
2. Look at the front card corners. The photo follows the curve. No square fill shows in the corner cutouts, including the cards peeking behind.
3. Drag the front card slowly left, then slowly right, and release before it commits. The card stays flat (a slight tilt only). It does not bow, shear, or flash square corners while your finger is down. Releasing snaps it back smoothly.
4. Fling left and right. The next card rises in place without a twist at the start of the drag.
5. Switch to list view. Each trip tile’s photo reads clearly, and the status/spend bar is a frosted strip over the photo rather than a solid block. The page behind the tiles is the plain app background.
6. Switch back to stack view. The page behind the card is a blurred copy of that card’s photo. Swipe to another trip: the page background changes to that trip’s photo.

### Negative checks
- One trip only: the card still has round corners and a slow drag does not warp it.
- Reduced motion: the card still tracks the finger and the corners stay round.

### Pass
- Stack corners stay round at rest and during a slow swipe, the page behind the stack is that card’s photo blurred, and the list tiles look glassy on the plain page background.

---

## UX-TRIPS-COVER — Stack destination photo, light list tint

**Commit:** v3.40.3. **Migrations:** none. **ADR:** 234.

The stack photo (and the blurred page behind it) uses the destination typed when the trip was created. Light list view keeps a soft tinted page behind the tiles, not a flat white sheet and not one shared photo.

### Flags
None new. The trips list is the home screen.

### Steps
1. Create a trip with a destination such as Goa, and a different stop or trip name. Open Trips in stack view.
2. The front card photo is that destination. The blurred page behind the stack is the same photo. A stop or the trip name does not replace it.
3. Switch the app to the light color scheme, then open list view.
4. The page behind the tiles is a soft gray-green tint, not solid white. The “Journeys” title and the header icons are dark and readable. Each tile still shows its own photo. There is no single destination photo filling the page.

### Negative checks
- A trip with no destination still shows a photo from its stops or name.
- Dark scheme list view stays on the dark app background.
- Stack view still uses the blurred front-card photo as the page background.

### Pass
- Stack and its page blur show the created destination, and light list view is tinted rather than white.

---

## DEST-SUGGEST — Destination suggestions & did-you-mean

**Commit:** v3.41.0. **Migrations:** none. **ADR:** 238.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Suggestion list, "Did you mean" chip, currency from the picked country | `enableDestinationAutocomplete` (Core) | ON |

### Steps
1. Journeys → Create. In "Where to?", type `Rish`: a list shows "Rishikesh · Uttarakhand, India" straight away. Keep typing `Rishikesh` and online matches may be added under it.
2. Type `Kyotto`: "Kyoto · Japan" is listed. Tap it: the field reads `Kyoto`, the name becomes "Kyoto trip", and the currency becomes "JPY (suggested)".
3. Keyboard (desktop): type `Gangtk`, press ↓ then Enter. The field becomes `Gangtok` and the form is **not** submitted.
4. Type `Swtizerland` and tap the Trip name field. A chip reads "Did you mean **Switzerland** · Europe?". Tap **Use it**: the field becomes `Switzerland`. Repeat, and tap × instead: your spelling stays.
5. Type `Goa, Gokrana`, then leave the field. The chip offers Gokarna, and Use it changes only that part: `Goa, Gokarna`.
6. Type `Goa Beach`: no chip appears (it's a real place, not a typo).
6a. Type `Gangtk, Darjeling & Goa` and leave the field. The box reads "Fix 2 spellings?" with pills ~~Gangtk~~ → **Gangtok** and ~~Darjeling~~ → **Darjeeling**. Tap one pill: only that place changes and the other pill stays. Tap **Fix all**: `Gangtok, Darjeeling & Goa`. Goa is never touched.
7. Edit an existing trip saved as "Swtizerland" (trip long-press → Edit). The chip appears as soon as the form opens. Use it, then Update Trip: the card's photo, map and weather follow the corrected name.
8. Go offline (DevTools → Network → Offline) and type `Munar`: "Munnar · Kerala, India" is still suggested, from the built-in list.

### Negative checks
- `enableDestinationAutocomplete` OFF: a plain text field with no list, no chip, and no Photon requests while typing (check DevTools Network).
- Past destinations: a place you used before (e.g. "Tirthan Valley") shows as "Used before". A past typo ("Swtizerland") is never suggested.

### Pass
- Correct destination names are one tap away, typos are caught before saving, and nothing changes without the traveler tapping.

---

## QA-0927 — QA fixes

**Commit:** v3.41.0. **Migrations:** none. **Report:** `.gstack/qa-reports/qa-report-localhost-2026-09-27.md`.

### Flags
None new. The map handoff rides on the deferred map (always on); the inbox empty state on `enableNotificationGrouping`.

### Steps
1. Open a trip you haven't opened this session. The destination photo shows, and the real map replaces it without a blank map frame in between.
2. Open a trip, tap back to Journeys, then reload the page. You stay on Journeys and the URL is `/`. Opening `/?trip=<id>&tab=ledger` still lands on that trip's Expenses tab.
3. Open any trip with expenses on a slow network. Summary shows the skeleton, then the real outstanding total. It never shows "₹0.00" first.
4. Inbox → All Trips → Money, with no settlement notifications: you see "No money updates… You have N other notifications. Show everything", and the link brings them back.
5. DevTools Network: reload Journeys with a trip whose destination has no wiki article. Each lookup URL is requested once, not repeatedly.
6. Settings → Appearance → Haptics with "Important" selected: the subtitle reads "Key actions only" in full, not cut off.
7. Add expense (`enableCompactExpenseForm` ON): there's no "+ Add Receipt" under Split Mode. The receipt is only under More details. On the Android or iOS app, More details shows "Take or Choose Photo" (camera or gallery). On mobile web, "Attach Photo / Bill" offers the gallery as well as the camera. With the flag OFF, the old "+ Add Receipt" control is back.
8. Open a trip that already has expenses: no floating "Add expense" coachmark over Summary. On a new trip with no expenses it still appears until dismissed, and on Members it still says "Add member".
9. Open the notifications inbox on a phone: the white sheet reaches the bottom of the screen, with no grey band.
10. Journeys: open two or three trips, go back, and reload. Each card's "Spent" equals that trip's Summary total, not double.
11. Ops Deck → Audit → Inspect → Copy JSON: the toast appears **below** the top bar (Preview Traveler View and Lock & Logout stay visible), it's opaque, and the page doesn't shift.
12. Ops Deck → Bugs on a phone (or a window under 640px) with a case expanded: the case is one tinted card, "TRANSITION:" isn't broken mid-word, and there's no sideways scrollbar.
13. **Ops Deck buttons.** On every page head, Refresh and Export show the icon and label on one line, never the icon stacked above the text. Buttons are 36px tall with a 10px radius. Hover tints the button without lifting it, pressing shrinks it slightly, and Tab shows a violet focus ring. Primary buttons (New case, Save) are solid violet, Delete buttons are outlined in red, and row actions (Inspect, Mark in progress) are 28px with 12px text. Check both light and dark theme.
14. **Refresh while loading.** Click Refresh on any Ops Deck page: the label stays "Refresh", the icon spins, the button doesn't change width, and a second click does nothing until it finishes.
15. **Dev crashes no longer reach the ledger.** On `npm run dev`, break a file on purpose (e.g. use an undefined name) and save: the error shows in Vite's overlay, but no new "Critical" case appears in Ops Deck → Bugs. A production build (`npm run build && npm run preview`) still files real crashes.

### Pass
- No blank map frame, no stale trip URL after leaving, no ₹0 flash, and honest empty states.

---

## UX-POLISH3 — Money format, quick trip, calm haptics, reminders, inbox

**Commit:** v3.41.0. **Migrations:** none. **ADR:** 237.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| "Where to?" first, suggested name + currency | `enableQuickTripCreate` (Core) | ON |
| Important-only haptics, iPhone haptics, Settings → Haptics | `enableCalmHaptics` (Core) | ON |
| Remind button on the Members tab | `enableMemberMoneyRow` (Trip) | ON |
| Folded notification bursts + Money filter | `enableNotificationGrouping` (Trip) | ON |
| Money formatting, single-tap undoable deletes, deferred map, contrast, chart text | none | — |

### Steps
1. **Money format.** Add an expense of 12500 in an INR trip. The UPI pay sheet, the settle button ("Settle ₹12,500.00"), the split explainer in chat, the expense review dialog, the recycle bin row and the notification body all show `12,500.00`, not `12500.00`. Amounts of a lakh or more follow the phone's locale (for example `1,25,000.00` on an Indian locale), the same as the rest of the app. In a JPY trip, amounts show no `.00`.
2. **Undoable delete.** Delete a trip: the confirm button deletes on the first tap, and the note under it reads "You can undo this for a few seconds afterwards". The Undo toast then appears. Clear All Data and Empty Recycle Bin still need two taps.
3. **Quick trip.** Tap New Trip. The cursor is in "Where to?". Type `Bali, Indonesia`: the name becomes "Bali trip" and the currency "IDR (suggested)". Type your own name, then change the destination: your name stays. Pick USD, then change the destination: USD stays. Type `Manali`: the currency goes back to INR. Leaving the dates empty still shows the date error.
4. **Deferred map.** Open a trip: the destination photo fills the background straight away, and the map fades in about a second later. Data saver still shows its "Map hidden" button.
5. **Haptics (Android phone).** Switching tabs or opening menus no longer buzzes. Saving an expense, settling and deleting still do. Settings → Appearance → Haptics: choose All and taps buzz again; choose Off and nothing buzzes; the choice survives a reload. On the iOS app build, saving and settling give a Taptic tap.
6. **Remind (Members tab).** Anyone who owes money (not you) has an orange Remind button next to "owes ₹X". Tapping it opens the share sheet with "Hey Riya, a quick reminder: you owe ₹450.00 on our trip…". On desktop, the text is copied and WhatsApp opens. People who are settled or owed money have no button.
7. **Inbox.** Have someone add three expenses within an hour. The inbox shows one row with "+2 more like this" and a count of unread items; tapping it expands the other two. Chat messages never fold. Tap Money: only settlement and reminder notifications remain. Tap Everything: all return.
8. **Accessibility.** With VoiceOver or TalkBack on Summary → Spending breakdown, the daily trend is read as a list of days and amounts, and the donut is skipped because its legend is read instead. Title quick-chips on the expense form announce as selected or not.

### Negative checks
- `enableQuickTripCreate` OFF: the old form, name first, with nothing auto-filled.
- `enableCalmHaptics` OFF: every tap vibrates on Android, iOS has no haptics, and Settings has no Haptics row.
- `enableMemberMoneyRow` OFF: no Remind buttons on Members.
- `enableNotificationGrouping` OFF: one row per notification and no Everything / Money chips.

### Pass
- Every amount reads the same way, new trips take one field to start, trips open to a photo instantly, haptics mean something, and money nudges and notices are one tap away.

---

## UX-POLISH2 — Short expense form, focused Summary, touch & loading polish

**Commit:** v3.41.0. **Migrations:** none. **ADR:** 236.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| "More details" section on the add/edit expense form | `enableCompactExpenseForm` (Core) | ON |
| Spending breakdown row and new-trip start card on Summary | `enableCompactSummary` (Core) | ON |
| Settle stamp, folding deleted rows, pull-to-refresh plane, "Back online" note | `enableMotionPolish` (Core) | ON |
| Dialog loading skeletons, Ops Deck skeletons, Bug Ledger keys, focus rings, touch hit areas, icons, utility classes | none | — |

### Steps
1. **Short form.** Tap + in a trip. Top to bottom you should see: amount, title, Paid By, then the split section. At the bottom, "More details" shows a preview such as `Food · Today`. Open it: Category, Date, Location (if geotagging is on) and Receipt are all there. Change the category and close it: the preview updates. Save, and the expense has the category you chose.
2. **Form auto-open.** Edit an expense that has a receipt or place: More details is already open. On a new expense, attach a receipt: More details opens by itself.
3. **Start card.** Create a new trip. Summary shows "Get this trip rolling" with 1 Invite and 2 Add. Tap Invite: Share opens. Tap Add: the expense form opens. After a friend joins, step 1 shows a green check and "1 joined so far". After the first expense, the normal Summary returns.
4. **Spending breakdown.** In a trip that has expenses, the charts are gone from under the balances and a "Spending breakdown" row appears instead. Tap it: the charts open with a rise-in, and the chevron flips. Leave the trip and come back: it stays open. Close it and reload: it stays closed.
5. **Settle stamp.** Record settlements until everyone is settled. The moment the last one is recorded, the stamp on the Summary hero slams in with confetti and a success haptic. Reopening an already-settled trip does not replay it.
6. **Folding delete.** In Expenses, swipe a row and delete it: it folds shut smoothly. Tap Undo: it unfolds again.
7. **Plane.** On the Journeys list, pull down: a small plane is level in the pill. Pull past the threshold and it climbs. Release, and it bobs while "Syncing…" shows.
8. **Back online.** Go offline (DevTools → Network → Offline), add an expense, then go back online. "Back online · 1 change synced" drops in at the top and disappears after about 3 seconds. Reloading while online never shows it.
9. **Dialog skeletons.** On a slow network (DevTools → Slow 4G), with a fresh reload, open the FX rates or Trip Route dialog. A shimmering card appears right away, then the real dialog replaces it without a double fade.
10. **Icons.** The trip header shows people and receipt icons, not 👥 🧾. Ledger rows show camera, flag, clock, alert, sync and pin icons. The form shows pencil, sparkles and pin icons. The Summary settle-mode info, the FX dialog and Share → Offline Snapshot all show icons. Member role options read "Organizer", "Contributor" and "Viewer" without emoji.
11. **Touch targets (phone).** Tap just outside the edge of the notification close X, the note dialog X or a header circle button: it still triggers.
12. **Keyboard focus (desktop).** Tab to the + button, a filter chip and a settings QR action: each shows a teal focus ring.
13. **Ops Deck loading.** Reload the Ops Deck on Slow 4G and open Analytics. Skeleton blocks show until the data arrives, with no flash of zeros or "No events yet". Refresh keeps the page and just spins the button.
14. **Bug Ledger keys (desktop).** In list view, a "J K move · ↵ open · E resolve" hint shows. J and K move a highlighted row, Enter expands it, and E opens the resolve drawer. Typing J into a search box does not move the cursor.

### Negative checks
- `enableCompactExpenseForm` OFF: the form shows every section in the old order, with no More details.
- `enableCompactSummary` OFF: the charts are always expanded under the balances, and an empty trip shows the normal Summary.
- `enableMotionPolish` OFF: no stamp celebration, a deleted row stays dimmed until the undo window ends, pull-to-refresh shows the old arrow, and there's no "Back online" note.
- Reduce Motion ON: none of the above animate, and everything still works.

### Pass
- Adding an expense takes one screen of fields, new trips tell you what to do first, nothing shows a blank or zero while loading, and small controls are easy to hit.

---

## UX-MOTION — App-wide motion polish, share pages, Ops Deck polish

**Commit:** v3.41.0. **Migrations:** none. **ADR:** 235.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Exit animations, drag-to-dismiss sheets, press shrink, trip card→header morph, directional tab slide, home card rise-in, hero total bump, springy switches, theme crossfade | `enableMotionPolish` (Core) | ON |
| Share page redesign, hover fix on touch, 11px label floor, Ops Deck toasts / nav codes / typed delete confirm / ledger phone layout | none (always on) | — |

Test on a phone-sized viewport (DevTools device mode is fine) plus a real Android or iOS device if you have one. Use Chrome or Safari 18 or later for the view transitions.

### Steps
1. **Exit animations.** Open and close each of these: the expense form (X), expense filters, a confirm dialog (for example, delete an expense), Share trip, the FX rates modal, and a chat long-press action sheet. Each should fade and drop away in about 0.2s instead of disappearing in one frame. Scroll the expense form down before closing it: it should close from where it was scrolled, not jump to the top.
2. **Drag to dismiss.** In chat, open "Why this split?" on an expense card and drag the sheet down. It follows your finger and closes past about 70px, and a shorter drag springs back. Do the same with the @tripbot confirm sheet (type `@tripbot 200 lunch`) and a chat long-press action sheet. In Summary, open UPI pay and drag down from the grey handle bar. Dragging on the buttons or the QR code must not move the sheet.
3. **Split explainer and @tripbot sheets** now show a real card: a surface background, rounded top corners and a handle pill. Before this change they were floating text on the dimmed backdrop.
4. **Trip morph.** From Journeys (stack view), tap the front card. The card should grow into the trip header. Tap back to go to all trips, and the header shrinks back into the card. Repeat in grid/list view.
5. **Tab slide.** Go Summary → Expenses → Members: content slides in from the right. Go back the other way: it slides in from the left. The bottom nav and header stay still. A finger swipe between tabs still behaves as before.
6. **Press feedback.** Press and hold any button: it shrinks slightly and springs back on release. Stack cards and grid cards keep their own press behavior.
7. **Switches and theme.** In Settings, press and hold a switch: the knob stretches, and on release it springs across. Change Appearance between Light and Night: the whole screen crossfades instead of cutting.
8. **Home and hero.** Reopen the app to Journeys: the cards rise in one after another. In a trip, add an expense that changes the outstanding total: the big Summary total counts to the new value and bumps once.
9. **Sticky hover (touch device).** Tap a secondary button or a glass card and lift your finger: it must not stay highlighted.
10. **Share pages.** From Invite & Share, create a view-only link and open it in a private window. You should see a boarding-pass card: mono destination eyebrow, trip name, a perforated divider, Travelers/Expenses tiles, and spend in mono. Switch the OS to dark mode and the page follows. Revoke the link and reload: you get a lock icon with "This link has ended". Open a live-location link: there is a surface header bar with a pulsing green dot, and the map marker is teal.
11. **Label floor.** Packing assistant, Travel Pass wallet and chat metadata: no label is smaller than 11px, and none of them overflow their chip or button.
12. **Ops Deck toasts.** In Flags, toggle a flag. The toast slides into the top-right corner, and the page below does not shift. Repeat in Users, Trips, Features, Audit (copy a payload), Tools and Bug Ledger.
13. **Ops Deck nav.** The rail codes read #00 to #08 from top to bottom. ⌘K search for `#05` finds Bugs.
14. **Typed delete.** Users → delete a test user. A styled dialog asks you to type DELETE. The red button stays disabled until the text matches exactly, then needs the usual two taps.
15. **Bug Ledger.** In the kanban view, drag a card: the card you left behind becomes a dashed, shrunken slot, and the target column lifts. In list view on a phone-width screen, each case is a stacked card (id and age, then title, then severity and status) with no sideways scroll. Change a filter: rows fade in. Open and close the case drawer: it slides out to the right.
16. **Trip filter counts.** Go to Journeys. All, Active, Past and Archived each show a count badge, including `0`. Past counts closed trips plus trips whose end date has passed. Archive a trip: Archived goes up by 1, and All plus Active or Past go down by 1.

### Negative checks
- `enableMotionPolish` OFF (Ops Deck → Flags) and reload: dialogs close instantly, the explainer, @tripbot and UPI sheets do not drag, there is no press shrink, and opening a trip or switching tabs uses the old plain crossfade. The ActionSheet still drags, as before. Share pages, the hover fix, the 11px labels and Ops Deck changes remain.
- OS "Reduce motion" ON with the flag ON: nothing animates out, slides or bumps, and every dialog still closes normally.
- Close a dialog, then tap immediately where its button was: the tap reaches the page underneath, because the fading copy never blocks input.

### Pass
- Nothing that closes vanishes in a single frame, sheets can be pulled away, trip open and tab changes have a direction, share links look on-brand in both themes, and the Ops Deck toasts no longer shift the page.

---

## PASS-STUB — Pass back seat and gate

**Version:** v3.42.1. **Flags:** existing `enableTravelerPassBack` (Core, default ON). The front of the pass is unchanged.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Seat-and-gate figures on the pass back | `enableTravelerPassBack` | ON |

### Steps
1. Open a trip where you belong to a couple or group (Sikkim / 2B). Go to Summary and flip the boarding pass.
2. Confirm the route row is still there. With one destination, the temperature sits under that city with a refresh icon. With several stops, the first stop’s weather sits under Departure and the last stop’s weather sits under Destination. Refresh is only on the destination line and reloads both. Tapping refresh leaves the pass on this side. Under the route, the left cell is **Inside {group}** and the right cell is **Outside {group}**.
3. Inside uses your partner's first name ("Ananya owes you" or "You owe Ananya"). Outside says "{group} receives" or "{group} pays". Green means that side owes you. Red means you or the group still pay. Cash you laid out does not appear as a green plus.
4. The line under the two cells is your personal net ("You are ahead …" or "You are short …"). Inside amount + outside amount equals that line.
5. Open a trip with individual members and no groups. Flip the pass. Left cell is **You get** or **You owe**. Right cell is **You paid**, in the ink color with no plus, and the caption is your share.
6. On the no-group trip, cash laid out minus your share equals the left cell.

### Negative checks
- Turn `enableTravelerPassBack` off. The back returns to the itinerary (dates, traveler, weather, join code). No Inside / Outside cells and no You paid cell.
- The front stays "Balance summary" and the outstanding total in both flag states.

### Pass
- A grouped traveler can see what is inside the couple and what the couple still settles with everyone else, and those two figures add up to the personal line.
- An ungrouped traveler sees one signed position and an unsigned cash-laid-out figure with their share.
- The front of the pass is the same as before.

---

## FEAT-COVER-CYCLE — Cycling destination photos

**Point:** A trip with several destinations rotates its cover on the home stack and the list cards, one photo per place, about every 5–6 seconds. A single destination stays on one photo. The open-trip map hero does not rotate.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Rotate stack and list covers through each destination | `cycleDestinationCovers` | ON (Core) |

### Steps
1. In Ops Deck → Flags, confirm **Cycling Destination Photos** is on.
2. Create or edit a trip named like “Sikkim Backpacking” and set the destination to `Gangtok, Pelling, Lachung` (or add those as stops).
3. On the home stack, watch the front card. The photo should change about every 5–6 seconds. The picture that is leaving stays visible while the next one dissolves over it for about a second — no blank flash. The blurred page behind the stack should follow with the same dissolve.
4. Open list view. The same trip’s card should rotate through those places. The bottom bar (Upcoming, Active, or Past, and Spent) stays on the photo the whole time, transparent, and does not disappear while the photo changes.
5. Swipe another multi-destination trip to the front. Its card should rotate through its own places.
6. Open a trip with one destination (for example Goa). The stack card and the list card stay on one photo.
7. Open the Sikkim trip. The photo behind the map stays a single cover and does not rotate.

### Negative checks
- Turn `cycleDestinationCovers` off and return home. The stack and list cards each show one photo and do not change after 6 seconds.
- With the flag on, a one-destination trip still does not rotate.

### Pass
- Multi-destination trips cycle a distinct photo per place on the stack and on list cards, including the backdrop behind the stack.
- One-destination trips and the open-trip hero stay on a single photo.
- Flag off restores the single cover.

---

## PASS-STUB-SIMPLIFY — Simplified pass back (balance hero)

**Version:** unreleased. **Flags:** existing `enableTravelerPassBack` (Core, default ON) — reuses the PASS-STUB flag, same surface, no new flag added. The front of the pass is unchanged except its flip-hint text (see steps).

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Simplified balance-hero back face | `enableTravelerPassBack` | ON |

### Steps
1. Open a trip with a single other traveler (1:1, no group). Go to Summary and flip the boarding pass.
2. Confirm the back shows: trip name, a "Balance details" title, the date range, and a flip hint reading "↺ Balance summary" top right. No weather, no route/plane diagram, no status pill anywhere on the back.
3. Confirm the hero shows one amount with a clear direction ("You owe {name}" / "{name} owes you" / "Your balance · you owe" / "Your balance · you're owed"), colored red when you owe and green when you're owed.
4. Below the amount, confirm a thin progress bar and a "{N} of {M} travelers settled" label.
5. Tap the hero amount. The page should smooth-scroll down to the "Who owes who" section below it — confirm no modal or new screen opens, and the card does not flip back to front.
6. Confirm an "Updated {relative time}" line appears above the footer (skip this check on a trip with zero expenses — the line is hidden when there's nothing to date).
7. Tap the join-code chip in the footer. It should copy the code to the clipboard and show "✓ Copied" briefly.
8. Confirm up to 2 other travelers' initials (+N overflow for more) appear next to the join-code chip.
9. Flip back to the front. Confirm the front's flip hint now reads "↻ Balance details" (it previously said "Itinerary," which the back no longer resembles at all after this change).
10. Open a trip where you're in a group/couple with exactly one other member and no balance outside the group. Confirm the hero names that person directly, e.g. "You owe Priya".
11. Open a trip where you're in a group **and** also carry a balance outside the group (or a group with 2+ other members). Confirm the hero falls back to the generic "Your balance · you owe" / "Your balance · you're owed" with no name, rather than naming only one of several people.

### Negative checks
- Turn `enableTravelerPassBack` off. The back returns to the old itinerary face (dates, traveler, weather strip, join code) unchanged — this change doesn't touch that branch.
- Front face amount, settled stamp, and member/transfer counts are identical in both flag states.

### Pass
- The back shows one legible, action-oriented number instead of the old seven competing elements (weather ×2, route diagram, status pill, finance grid, decorative barcode, mismatched hint).
- Tapping the amount reaches the real "Who owes who" section — no second settle flow was built on the card.
- The join-code chip actually copies, and the flip-hint text on both faces now matches what's actually on the other side.

---

## PASS-BACK-POLISH — Pass back layout polish (no clipping)

**Version:** 3.43.4. **Flags:** existing `enableTravelerPassBack` (Core, default ON) — same surface, no new flag.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Polished, unclipped balance-hero back face | `enableTravelerPassBack` | ON |

### Steps
1. On a phone-width screen (~360–390px), open a trip with 4+ travelers. Go to Summary.
2. Flip the boarding pass. Confirm nothing is cut off at the bottom: the join-code chip, "Updated …" line, and traveler avatars are all fully visible inside the card.
3. Confirm the header shows trip name, "Balance details", the date range, and a "↺ Summary" hint top right.
4. Confirm the hero shows the direction label and the amount, then a full-width progress bar with "{N} of {M} settled" on the left and "{pct}%" on the right.
5. Tap the "See who owes who ↓" row. The page scrolls to "Who owes who"; the card stays on the back.
6. Tap the join-code chip. It copies the code and shows "✓ Copied"; the card stays on the back.
7. Tap anywhere else on the card. It flips to the front. Confirm the front is the same height as the back, with the amount vertically centered and no doubled dashed line above the footer.
8. Scroll to "Who owes who" on an unsettled trip. Confirm there is no "{N} of {M} settled up · {pct}%" bar under the Simplified/Direct Debts toggle. The only progress bar is on the pass back.
9. Repeat 2–7 in dark mode, and with the OS "Reduce motion" setting on (faces crossfade instead of rotating).

### Negative checks
- Turn `enableTravelerPassBack` off. The legacy itinerary back still renders fully and flips both ways.
- The card's height does not jump when flipping in either direction.
- With the flag off, the "settled up" bar is back under "Who owes who".

### Pass
- No back-face content is ever clipped, at any phone width.
- Buttons on the back act without flipping the card; every other tap flips it.

---

## SUMMARY-CLARITY — Summary clarity: labeled totals, solid nav, honest chip

**Version:** unreleased. **Flags:** existing `enableTravelerPassBack` (Core, default ON) for the labels. The nav opacity and chip changes are bug fixes with no flag.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| "Your balance" vs "Group still to settle" labels | `enableTravelerPassBack` | ON |

### Steps
1. Open an unsettled trip, Summary. On the pass front, confirm the label reads "Group still to settle" (settled: "Group outstanding").
2. Flip the pass. Confirm the label reads "Your balance · you're owed" or "Your balance · you owe" (named counterparty lines like "You owe Priya" are unchanged).
3. Scroll to "Who owes who". Confirm the orange total has a small "group to settle" caption under it.
4. Confirm the chip that used to read "You're owed · remind" now reads "You're owed · see who", and tapping it scrolls to Who owes who.
5. Scroll Summary so a card sits behind the floating bottom bar. Confirm no card text shows through the bar in light and dark mode.
6. Measure the top chips: each is at least 36px tall.
7. As a traveler inside a couple/group with money both inside and outside the group (for example you are +₹48,732: partner owes you ₹34,232, group receives ₹14,500), flip the pass. Confirm a line under the amount reads "Inside +₹34,232.00 · Outside +₹14,500.00", and that Who owes who lists only the outside ₹14,500 transfer.
8. Long-press or hover the split line. The tooltip names both sides (for example "Ananya owes you · 2B receives").
9. As a traveler with no group, or in a group where one side is square, confirm the split line is absent.

### Negative checks
- Turn `enableTravelerPassBack` off. The front label still reads "Group still to settle" (the front is shared by both states). The "group to settle" caption under the Who owes who total is hidden, and the legacy itinerary back is unchanged.
- The bottom bar change and the chip copy apply in both flag states.

### Pass
- The two totals can no longer be mistaken for each other, and a grouped traveler can see why their balance is larger than the one transfer listed.
- Nothing shows through the bottom bar.
- The chip no longer promises a reminder it does not send.

---

## UX-POLISH-2 — UX polish: readable text, tap targets, dialog roles, settle confirm, flip cue

**Version:** 3.43.7. **Flags:** the flip cue reuses `enableTravelerPassBack` (Core, default ON). The other changes are fixes to existing screens with no flag.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| One-time "Tap to see your balance" cue on the pass front | `enableTravelerPassBack` | ON |

### Steps
1. **Text size.** On a phone, open Summary, Expenses, Members, Notes and Settings. Confirm no small caption, label or hint is below 11px (use browser dev tools to spot-check a few). Confirm nothing wraps badly or overlaps. Nav badges and counters were left alone on purpose.
2. **Tap targets.** In dev tools, hover the notification close button, notification row action buttons, the search "clear" (×) buttons, the settlement audit button, the member remind button and the mini pass top buttons. Each should show a 44×44px clickable area while looking the same size as before. Tap just outside the visible icon and confirm it still fires.
3. **Dialog roles.** With a screen reader (TalkBack or VoiceOver), open UPI pay, voice quick-add, the pass scanner, live flight/train status, the offline snapshot backup and the receipts gallery. Each should announce as a dialog with its title.
4. **Settle confirm.** On Who owes who, tap Settle on a transfer. Confirm the dialog shows a short question ("Record this payment as settled?"), then a card with "{from} → {to}" and the amount. Choose a partial amount: the card adds "Partial payment. {amount} stays pending." If a payer or receiver is a member of a group, the card adds a "paid by … · received by …" caption. With `enableSettlementDateNote` on, the date and note fields still appear under the card. Confirm and check the settlement is recorded with the right amount.
5. **Flip cue.** Clear site data (or use a fresh install). Open Summary on an unsettled trip. Confirm a pill reads "Tap to see your balance ↻" under the front amount. Tap the card. After flipping, flip back: the pill is gone and stays gone on reload.
6. Repeat 5 with the OS "Reduce motion" setting on: the pill shows but does not pulse.

### Negative checks
- Turn `enableTravelerPassBack` off. The flip cue never shows.
- A fully settled trip shows no settle dialog; other dialogs keep their old text.
- Ops Deck / admin screens keep their original small text.

### Pass
- Nothing readable is below 11px on traveler screens, and layouts still fit at 320px wide.
- Small icon buttons are easy to hit without looking bigger.
- Screen readers announce the six modals as dialogs.
- The settle confirm can be read at a glance.
- New users learn the pass flips; returning users never see the cue.

---

## COLLAB-SYNC — Shared packing, notes, and passes

**Migrations:** `0109_participant_trip_collab.sql` (v3.43.8) and `0110_trip_row_realtime.sql` (v3.43.9, paints the list from the trip row the way Talk paints a message).

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Notes tab (Talk, Pack, Notes) | `enableNotesAndChecklist` | ON (Trip pack) |
| Pass | `enableTravelPasses` | ON when a pass exists (Travel pack) |

No new flag. Talk already uses its own live chat channel.

### Steps
1. Apply migration 0109. Sign in as Person A and Person B on two browsers. Both are members of the same trip. B is not the owner.
2. A and B both stay on Notes → Pack. A adds an item. B's list shows it immediately, the same way a Talk message appears, without leaving the screen or reloading. B checks it off, edits the text, then deletes it. A's list follows each change.
3. Repeat for Notes (add, edit, delete) and Pass (save a pass, then delete it).
4. A adds an expense. B's Expenses and Summary update without a reload. A adds or renames a member. B's Members tab shows it.
5. Put B's phone to sleep, have A add a packing item, then bring B back. The new item is there.

### Negative checks
- A viewer who is not a member of the trip still cannot read or write the list.
- Trip rename, archive, and delete stay owner-only.
- Talk messages still appear live on the Talk sub-tab.

### Pass
- An add, edit, or delete by either member shows up for the other member on Pack, Notes, and Pass, and on Expenses, Summary, and Members, without reloading the app.

---

## MEMBERS-ROSTER — Members roster (v3.43.9)

**Commit:** `c303812`. **Migrations:** none. **ADR:** 254. **Bug:** BUG-267.

No new flag. Role changes, reminders, and group create stay on the existing Members tab.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Remind bell on someone who owes | `enableMemberMoneyRow` | as already set |
| Last seen under the name | `showLastSeen` | as already set |

### Steps
1. Open a trip with several members and at least one group. Go to Members.
2. Each person is one solid row: name and balance on the first line, role underneath (a quiet menu for the organizer, plain text otherwise). “You” and “Pending” sit on that role line. There is no second role badge, no dashed card, and no airplane coach sitting on the list.
3. As the organizer, change someone’s role from the menu on their row. The menu is the only role control.
4. With `enableMemberMoneyRow` on, a person who owes shows a bell. Tap it. The reminder share sheet opens. With the flag off, the bell is absent.
5. Groups is a short heading with a text “Create group” action. Each group is a name, the people in it, and Edit / Delete as text.

### Negative checks
- A non-organizer does not see the role menu, Create group, or Edit / Delete.
- Swipe still edits or deletes a member on a phone. Edit and delete icons appear for a mouse.

### Pass
- The Members tab reads as a list: one role per person, the balance on the right, and groups in the same quiet card style.

---

## FLUTTER-P7-FORM-LEDGER — Flutter: expense form and balances tab

**Scope:** Phase 7 slices C+D in `flutter_app/`. Use a staging project, never prod.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Percent / Exact / Shares splits | `enableAdvancedSplits` | ON |
| Itemized split | `enableItemizedSplit` | OFF |
| Several payers | `enableMultiPayerExpenses` | OFF |
| Currency picker + conversion | `enableCurrencyFx` | ON |
| Receipt photo | `enableReceiptUpload` | ON |
| "More details" fold | `enableCompactExpenseForm` | ON |
| Duplicate warning | `enableDuplicateDetector` | ON |
| Same as last time | `enableCloneLastExpense` | ON |
| Explain this number | `enableExplainThisNumber` | ON |
| Simplify-debts switch (admins) | `enableSimplifyDebtsToggle` | OFF |
| Settlement history | `enableSettlementHistory` | OFF |
| Date + note when settling | `enableSettlementDateNote` | OFF |

### Steps
1. Expenses tab → add. Type `12*3+4` in Amount → "= 40.00" appears; save stores 40. Letters are ignored in the field.
2. Leave amount or title empty and Save → the web's messages ("Please enter a valid amount greater than 0.", "Please enter a title for the expense."). Untick everyone → "Please select at least one member to split the expense with."
3. Title "Hotel" → category auto-picks (note shown) until you tap a category yourself.
4. Percent with 60/30 → "90.0% of 100%" and Save is refused ("Split percentages sum (90.00) must equal 100%."); add 10 → saves. Exact must equal the total. Shares 2/1/1 on 100 → 50/25/25 and re-opening the expense shows the weights.
5. Presets: Only payer, Everyone but payer, Everyone, 50% payer; a group chip selects exactly that group.
6. Multi-payer: toggle, amounts must equal the total ("Multi-payer sum ... must equal total expense ..."); the larger payer becomes the main payer.
7. Foreign currency: pick USD, enter 10 → "≈ ₹872.50 at 87.25" (default rates); "Set rate" changes it for this trip and syncs.
8. Attach a receipt (camera/gallery), remove it, attach again, Save; offline it uploads later.
9. Type the same amount + title as an existing expense today → duplicate card; "Not a duplicate" hides it.
10. Leave the form half-typed, come back → draft banner restores it; Discard clears it. Saving clears it.
11. Edit an expense → loads values, saves as an update, one row remains.
12. Balances tab: each traveler shows "is owed"/"owes"; "Who pays whom" lists payments. Settle → confirm (partial amount shows "Remaining" and the partial wording; 0 is refused). With the date/note flag a date and note appear and the note joins the title.
13. Simplify debts switch (admin, flag on) changes the list of payments. History (flag on) lists settlements as Awaiting confirmation / Confirmed; tap one to confirm if you are the receiver.

### Negative checks
- Advanced-splits off: only Equal. Multi-payer/FX/receipt/duplicate flags off: those controls are absent.
- Closed or frozen trip: Save is refused with "This trip is closed. Reopen it to add expenses."
- Not built yet (see BACKLOG): UPI sheet, settlement share card, close-out, cross-trip balances, categories/CSV/backup/analytics screens.

### Pass
- Shares and balances match the web for the same data.

---
## FLUTTER-P7-EXPENSES — Flutter: Expenses tab (list, filters, recycle bin)

**Scope:** Phase 7 slices A+B in `flutter_app/`. The add/edit form is not built yet (the buttons open a placeholder). Use a staging project, never prod.

### Flags (Ops Deck; Flutter only reads them)
| Behavior | Flag | Default |
|----------|------|---------|
| Recycle bin entry | `enableRecycleBin` | ON |
| Dispute actions in the expense sheet | `enableExpenseDisputes` | OFF |
| Approve pending expenses | `enableExpenseApprovalThreshold` | OFF |
| Confirm a received settlement | `enableSettlementConfirmation` | OFF |
| Quick filter chips (All / Paid by me / Involves me) | `enableExpenseQuickFilterChips` | OFF |
| Compact rows toggle | `enableCompactLedgerView` | OFF |
| Chat cards after expense events | `enableInChatEventCards` + `enableTripChat` | OFF / ON |

### Steps
1. Open a trip with expenses → Expenses tab. Top card shows Total spent, Per person, Top category. Settlements and expenses waiting for approval are **not** in the total.
2. Days start collapsed. Tap a day header (or ⋯ → Expand all days). Settlements appear in their own section.
3. Row shows: category tile, title, amount, "your share" (only when different), payer → split avatars (max 4 then +N), badges: receipt, disputed, pending approval, pending sync, sync conflict. A foreign-currency row has a ⇄ chip that flips between trip currency and the original currency.
4. Remove a member who paid/was in a split → that row shows the amber "Payer was removed…" / "A split member was removed…" warning.
5. Search a word from a title (list narrows after a moment); a nonsense word → "No expenses match these filters." Filters (icon): traveler, category, date range, min/max amount; the button shows the live count ("Show 3 expenses"); a dot appears on the icon while filters are active; "Clear filters" resets.
6. Swipe a row **left** → deleted with 5 s UNDO; **right** → opens Edit. Rows you can't manage (not the author, not an admin) don't swipe.
7. ⋯ → Recycle bin: restore, delete forever (asks first), Empty recycle bin (asks first, admins only). Deleted items from another device also appear within the 24 h window.
8. Tap a row → sheet with the amount, who paid, and who owes what (shares add up to the total; the payer gets any spare cent). With the flags on: Flag as disputed (optional note) / Resolve dispute; Approve (never on your own expense); Confirm payment received (only the person who received the settlement).
9. Airplane mode, then flag a dispute → "You're offline. Connect to the internet to do this." and nothing changes. (Same as the web: these need the server's rules.)
10. A trip with more than 50 rows shows "Load more" at the bottom.
11. Chips under the header: "You owe · settle up" / "You're owed · see who", "N disputes", "N invites pending", "Close out trip" (after the end date). Tapping goes to Balances / Members.

### Negative checks
- Flags off: no dispute/approve/confirm buttons, no filter chips, no compact toggle.
- Frozen or closed trip: saving an expense (once the form exists) is refused with the web wording.
- Guest account: the tab works locally and never syncs.

### Pass
- Numbers match the web for the same trip (total, per person, shares). Anything else is a bug.

---

## FLUTTER-P6 — Flutter app: auth, trips list, trip shell, join & share

**Scope:** the native Flutter app (`flutter_app/`, Phase 6). Same Supabase project as the web app. **Migrations:** none. **ADR:** 262, 263.

Run: `flutter run --dart-define-from-file=env/staging.json` (staging project, never prod). Google sign-in needs the client IDs from `docs/flutter-migration/contract/GOOGLE_OAUTH_SETUP.md`. iOS items need a Mac / Codemagic build.

### Flags (Ops Deck → Flags; the Flutter app only reads them)
| Behavior | Flag | Default |
|----------|------|---------|
| App lock (biometrics) | `enableBiometricAuth` | OFF |
| Chat tab first | `enableChatFirstNav` | OFF |
| Notes tab | `enableNotesAndChecklist` / `enableTravelPasses` / `enableTripChat` | ON |
| View-only share link section | `enableTripShareLink` | ON |
| Sync queue review sheet | `enableSyncQueueInspector` | OFF |

### A. Sign-in and session
1. Fresh install, signed out: you see the sign-in screen (no flash of anything else). Buttons: Continue with Google; Continue with Apple **on iOS only**; email + password; Continue as guest; Try the demo (non-prod builds only).
2. Sign in with Google. First time ever: the 3-step intro appears (Next, Next, Get started); Skip also works. Land on **My Trips**.
3. Force-quit and reopen: splash briefly, then **My Trips** directly (no login, no intro).
4. Sign out (⚙ menu → Sign Out), sign back in as the same user: no intro again. Sign in as a different user: intro shows once for them.
5. Wrong password → "Invalid email or password." Airplane mode + sign in → "Can't reach the server…". Empty fields → "Enter your email and password."
6. Ops Deck: set `signup_gate` ON → sign-in screen shows "New sign-ins are temporarily paused…", Google/Apple/sign-up disabled. Turn it off again.
7. Forgot Password → enter email → "Check your email". Open the emailed link on the device (opens the app) → choose a new password (min 8 chars) → saved, lands on trips.
8. ⚙ → Delete Account → confirm → account removed, back on sign-in. (Use a throwaway account.)

### B. App lock (needs a device with Face ID / Touch ID / fingerprint)
1. Ops Deck: `enableBiometricAuth` ON. In the app, enable the lock (Settings arrives in Phase 10; until then set the stored preference via a debug build).
2. Cold start → lock screen with auto prompt. Fail twice → "Biometric verification failed. Tap to try again." and the app stays covered. Pass → app visible.
3. Background the app 10 s and return → no prompt. Background > 30 s and return → prompt again.
4. Lock screen → Sign Out signs out cleanly. Flag OFF → never prompts even if the preference is on.

### C. Trips list
1. Empty account: "No trips yet" with **Create Trip** and **Join with Code**.
2. New Trip → name, destination (typing "Tokyo" suggests JPY), pick dates, Create. Leaving name blank with destination + dates fills a suggested name. Missing name/dates show inline errors. You land inside the trip.
3. List shows newest trip first; filter icon → Name (A–Z) reorders (numbers sort naturally: Trip 2 before Trip 10; accents ignored). Search matches name or destination; no match → "No trips match your search."
4. Card headline: "Starts in N days" / "Starts tomorrow" / "Day X of Y" / "Ended". Archived, Closed, Frozen badges.
5. Swipe a trip you own left → Archive; snackbar with UNDO (5 s). Archived trips sit under "Archived (n)". UNDO restores.
6. Trip ⋯ menu → Delete trip → confirm → trip disappears; UNDO within 5 s keeps it; after 5 s it is deleted for everyone. Trips owned by others show no menu/swipe.
7. Airplane mode: create a trip, add/archive; chip says "N changes waiting to sync". Reconnect: chip clears within seconds. A rejected change shows "Sync issue: tap to review" (sheet only with `enableSyncQueueInspector`).
8. Pull to refresh. Android back on the list: "Press back again to exit"; second press within 2 s exits.

### D. Trip shell
1. Open a trip: header has the trip name, back arrow, Share, Settings. Bottom bar: Expenses, Balances, Members, Notes (Chat only when `enableChatFirstNav` is ON, then it's first and the landing tab).
2. Tap tabs and **swipe left/right** on the content: tab changes and the bar follows. iOS: swipe from the very left edge on the first tab still goes back; on later tabs use the arrow (known conflict, ADR 263).
3. Android back: walks back through tabs you visited (up to 5), then leaves the trip.
4. Turn off `enableNotesAndChecklist`, `enableTravelPasses`, `enableTripChat` → Notes tab disappears.
5. iOS keyboard/viewport items from `contract/IOS_DEFECTS.md` that apply here (no keyboard in this screen yet; recheck in Phase 7).

### E. Invite, join and share
1. Trip → Share: shows the 6-character join code, QR, Share invite, Copy code, Copy link. A brand-new trip that hasn't synced shows "Your join code appears after this trip finishes syncing."
2. Scan the QR / open the link on another device: signed out → invite preview ("You're invited to …", dates, who's on it) **without signing in**. Continue with Google → "Which traveler are you?" → "I'm Ben" → you land in the trip.
3. Two phones claim the same member at once: the loser sees "That member was just claimed by someone else. Pick another."
4. Open the invite while already a member → "You're already in …" + Open trip. Everyone claimed → "Everyone's already joined".
5. Bad code → "Invite not found". Many wrong codes → "Too many attempts. Try again in 30s." with a countdown.
6. Manual entry: My Trips ⚙ → Join with Code (or the box on the sign-in screen): 6 characters, otherwise "Enter the 6-character code from your invite."
7. Guest mode opening an invite: "Guest mode can't join shared trips…".
8. View-only link (owner/admin): Create view-only link → Share/Copy → open in a browser or the app signed out: summary with travelers, expenses, spend per currency. Turn off link → same URL shows "This link has ended". Non-owners see "Only the trip owner or an admin can manage this link." With `enableTripShareLink` OFF the whole section is hidden.
9. Offline: creating/turning off the view-only link shows "Connect to the internet to change the view-only link."
10. Universal links (`https://trip-tracker.blackmaroon.in/join/CODE`, `/share/TOKEN`) open the app only once the domain serves `/.well-known/` files (see `contract/DEEPLINKS.md`); the custom scheme `com.triptracker.app://join/CODE` works today.

### Negative checks
- Signed out, open `/trip/<id>` or the trips list → redirected to sign-in; `/join`, `/share`, `/live`, `/reset-password`, `/privacy`, `/terms` stay reachable.
- No screen allows a guest to create view-only links or claim members.
- Dark mode and 200% text size: no clipped buttons or overflow on sign-in, trips list, invite sheet.

### Pass
- Every step above behaves as written on one Android device and (when a Mac is available) one iPhone; anything that deviates is filed as a bug.

---

## FLUTTER-P7-LOOP — Flutter: ledger loop, files, and exit bar

**Scope:** Phase 7 slices E–G in `flutter_app/`. No new flags. Use a staging project, never prod. ADR 266.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Pay with UPI on the settle sheet | `enableUpiPayments` | ON |
| Share settlement card | `enableWhatsAppSettlementShare` | ON |
| Close out trip chip (after the end date) | `enableTripCloseout` | ON |
| Mood question after lock | `enableCloseoutPulse` | OFF |
| Live FX (Frankfurter, 24h cache) | `enableCurrencyFx` | ON |
| Sticky day headers | `enableStickyDayHeaders` | OFF |
| Category color rings | `enableCategoryColorRings` | OFF |
| Compact ledger | `enableCompactLedgerView` | OFF |
| Compact summary padding | `enableCompactSummary` | ON |
| Category drag-reorder | `enableCategoryReorder` | OFF |
| Splitwise import button | `enableSplitwiseImport` | OFF |
| Other-trips search hits | `enableCrossTripSearch` | OFF |

### Steps
1. Add a 90 expense paid by you, split three ways. Balances shows you "is owed ₹60.00" and the other two "owes ₹30.00". The same "is owed" line stays pinned above the list. Sections collapse when their titles are tapped.
2. Settle the first payment. Enter `name@bank` and Pay with UPI. If no UPI app opens, a snackbar says the id was copied. Share card opens the share sheet with a PNG and a caption that names both people.
3. With two trips that share your account, Balances shows an "Across trips" line per currency. It is hidden when you have only one trip.
4. After a pull that conflicts, open Conflicts. Keep mine leaves your copy. Keep theirs replaces the row with the server amount and clears the badge.
5. Set the device date after the trip end date. Expenses shows "Close out trip". Lock trip marks the trip closed. With the pulse flag on, Yes / Not this group appears and is not saved.
6. Open an expense that has a receipt. The detail sheet shows the photo (local file, or a signed link that lasts about an hour).
7. Expenses menu → Quick add. Type `lunch 240` and Add expense. The row title is "Lunch" and the amount is 240.
8. Menu → Categories. Add "Snacks". Rename and delete work on that custom category. Built-ins have no delete. With reorder on, drag changes the order.
9. Menu → Export and import. Export CSV shares a sheet whose text starts with "TRIP TRACKER — LEDGER EXPORT". Export JSON shares a backup. Import JSON asks you to confirm a valid file. With Splitwise on, pick a CSV, preview, confirm; payment rows are skipped.
10. Turn sticky day headers on, expand a day, and scroll: the day title stays pinned. A horizontal drag that starts in the outer 28px of a row changes tabs; a drag that starts on the title still edits or deletes.
11. Turn cross-trip search on and search two or more letters that match an expense on another trip. "Other trips" lists that row.
12. Accessibility: at 200% text size, the expense form and the balances list still show "who pays whom" without a crash. With TalkBack or VoiceOver, focus "Add expense" and "Settle" and confirm each button's name is spoken.
13. On a device, open a trip with about 500 expenses. Scrolling the expenses list should stay near 55 fps, and the balances tab should appear within about 300 ms after the rows are on disk.

### Negative checks
- UPI flag off: no UPI field on the settle sheet. Share flag off: no Share card button.
- Close-out flag off, or the trip end date is still in the future: no Close out chip.
- Sticky headers off: day titles scroll away. Color rings off: category icons have no colored border. Compact ledger off: the menu has no compact switch.
- Splitwise flag off: the tools sheet has no Splitwise button. Cross-trip search off: a query never shows "Other trips".
- Voice, receipt OCR, geotag, and analytics charts are absent.

### Pass
- Balances match the web for the same expenses. UPI and the share PNG are confirmed on one Android device; iOS UPI query schemes are declared but need a device with a UPI app. The 500-row fps check is a device step (the widget test only checks that Load more appears).

---

## FLUTTER-P12 — Flutter: accessibility, hardening, release checks

**Scope:** Phase 12 work in `flutter_app/`. No new flags. Device steps; the automated half is `test/a11y/a11y_test.dart`. ADR 275.

### Steps
1. **Screen reader (iOS VoiceOver and Android TalkBack).** On login, trips list, add expense, settle up, chat send and join by code: every control is announced with a name and role, focus moves in reading order, and you can complete each task without sight. Icon-only buttons say what they do (Back, Close, Rename, Delete, Send message).
2. **Large text.** Set the OS text size to the maximum (and bold text on). Open trips list, add expense, balances, settings, notifications and Report a problem: nothing is cut off or overlaps, and every button is still reachable by scrolling. The Theme row in Settings stacks under its title.
3. **Dark mode.** Selected chips, the Theme control and primary buttons are readable (dark text on the bright teal button).
4. **Reduce motion.** With the OS setting on, screen transitions and the confetti/story animations do not play at full motion.
5. **Haptics.** Settings, Haptic feedback off: no vibration on taps or saves.
6. **Release build smoke (B-193).** Install a signed release build from the pipeline (not a debug build). Sign in, add an expense offline then online, open Notification preferences, trigger a push, and confirm no crash. This is the check for the R8 shrinking and release signing changes.
7. **Signing and secrets.** `tool/check_release_signing.sh <aab>` passes (not the debug key) and `tool/scan_binary_secrets.sh <aab|ipa>` reports nothing.
8. **Backups off.** On Android, `adb shell dumpsys package com.triptracker.app | grep -i allowBackup` shows it disabled; a clean-text `http://` URL is refused by a release build.
9. **Version rule.** `tool/release_version.sh` prints the `package.json` version and a build number above the last store build.

### Negative checks
- A debug-signed bundle makes the release job fail.
- A binary containing a `service_role` key makes the release job fail (the anon key is allowed).

### Pass
- The automated half passes headless today (28 tests). Steps 1 to 9 are open until run on devices and the pipeline (B-151, B-193, B-197).

---

## FLUTTER-P10E — Flutter: push, tap routing, pass reminders

**Scope:** Phase 10 slice E in `flutter_app/`. No new flags. Needs the Firebase files, a real device and a staging project (B-136, B-137, B-170). ADR 273.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Alerts to your phone | none (a device permission) | asked once |
| Quiet-hours shift of reminders | `enableQuietHours` | OFF |

### Steps
1. Fresh install, sign in with an account. No permission prompt appears at launch.
2. Create a trip and save its first expense. A short explanation appears ("Get trip alerts?"). Tap Not now: the OS prompt does not appear, and the question is not asked again.
3. Settings, Notification preferences, Push notifications tile says "Off. Tap to turn on." Tap it: the OS prompt appears. Allow. The tile says "On for this device".
4. In the database, `device_push_tokens` has one row for your user with `client = flutter`, the platform and the app version.
5. Second account on another phone adds an expense to the trip. Your phone gets a push ("Dinner — INR 900 added"). Do this for six states: app in the foreground, in the background, and killed; signed in and (after step 8) signed out.
6. Foreground: you see the in-app banner and hear/feel a sound, but not a second system banner. Background or killed: tap the push. The app opens on that trip's Expenses tab (Balances for a settlement, Members for "joined"). A "trip deleted" push opens the trips list.
7. Have the second account join through an invite: you get "Diana joined the trip".
8. Sign out. The device row is gone from `device_push_tokens`. Trigger another expense: this phone gets nothing. Sign back in: the row returns.
9. Add a flight pass 25 hours out. Two reminders are scheduled (24 h and 3 h). Android: after a reboot they are still scheduled. Turn "Travel pass reminders" off in Settings: both are cancelled.
10. With `enableQuietHours` on and 22:00 to 07:00 set, a 24 h reminder that would land at 02:00 arrives at 07:00 (unless that is after departure).
11. Deny the OS prompt: the tile says "Blocked. Turn it on in your phone settings." and nothing crashes.

### Negative checks
- Build without Firebase files: the tile says "Not available in this build"; the rest of the app works.
- A push whose `route` is something other than a trip tab path (for example a URL) is ignored for routing; it lands by type and trip.
- Guest or demo accounts never register a token.

### Pass
- Steps 1 to 4, 9 and the negative checks pass headless today. Steps 5 to 8, 10 and 11 need devices and are open (B-170).

---

## FLUTTER-P10D — Flutter: feedback, diagnostics, legal, telemetry

**Scope:** Phase 10 slice D in `flutter_app/`. ADR 273.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Suggest a feature row | `enableFeatureSuggestions` | OFF |
| Growth events | `enableGrowthTelemetry` | OFF (server also refuses inserts) |
| What's new row | `enableWhatsNewHub` | OFF |

### Steps
1. Settings, Help, Report a problem. Leave the title empty and send: "Give the problem a short title." Enter a title that includes an email address, add two steps on two lines, send. The message says "Your report is BUG-nnn". In the Ops Deck bug ledger the title shows `[email]` instead of the address, two repro steps, `client: flutter`, and recent logs with no emails or tokens.
2. Switch "Attach recent app logs" off and send again: no `consoleLogs` in diagnostics.
3. Your reports list shows both cases with status and severity.
4. As a guest: the screen says to sign in, and sending shows the same.
5. With `enableFeatureSuggestions` on: Suggest a feature sends and appears in the Ops Deck features list.
6. Settings, Help, Diagnostics: version, environment, sync state, last log lines. Share logs opens the share sheet. In a dev or staging build, "Feature flag overrides" lets you force a flag on or off; Reset all clears them.
7. Cause an uncaught error in a release build: one critical case appears (`found_by: auto-crash-handler`), not one per repeat. A burst of different errors files at most 5 per session, 30 seconds apart. Network errors are not filed.
8. Privacy Policy and Terms: tap "Read the full document online" and the web page opens.
9. With `enableGrowthTelemetry` on (server flag): opening the app twice in one UTC day creates one `app_open` row; `sync_fail`, `queue_stuck` (10 minutes online with work waiting) and `flush_ok` once per session. With it off, nothing is written.

### Negative checks
- Flag OFF: no Suggest a feature or What's new rows.
- Prod build: the flag override screen has no effect (the store is not wired).

### Pass
- Steps 1 to 6 and 8 pass headless. Steps 7 and 9 need a release build and staging.

---

## FLUTTER-P10C — Flutter: notification preferences, version gate, flags

**Scope:** Phase 10 slice C in `flutter_app/`. Needs staging for the server checks. ADR 273.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Quiet hours rows | `enableQuietHours` | OFF |
| Daily digest row | `enableDigestNotifications` | OFF |

### Steps
1. Settings, Notification preferences. With both flags off you see Push notifications and Muted trips only.
2. Turn on `enableQuietHours`. Switch quiet hours on, set From and Until. In `quiet_hours_prefs` the row has your times and your IANA zone (for example Asia/Kolkata).
3. Turn on `enableDigestNotifications`. The digest switch writes `notification_digest_prefs`.
4. Mute a trip here, or in Trip settings, Mute this trip. `trip_mutes` has the row. No push from that trip arrives; in-app notifications still do.
5. Version gate: set `min_supported_version_android` above the installed version in `app_config`. Reopen (or return to) the app: a full-screen "Update required" with Update now (store page). Set it back: normal.
6. Set only `recommended_version_android` higher: a banner "A new version is available" with Update and a dismiss.
7. Set `maintenance_mode` true: "Back soon" with the message and Try again.
8. Airplane mode on a cold start: no block, no banner (fail open).
9. Flags: change a global flag in the Ops Deck. After 15 minutes in the background, returning to the app picks it up.

### Negative checks
- Flags off: no quiet hours or digest rows.
- A broken `get_app_version_gate` response never blocks the app.

### Pass
- Steps 1, 5 to 8 (with a faked gate) and the flag matrix pass headless. Server checks need staging.

---

## FLUTTER-P10B — Flutter: settings and trip settings

**Scope:** Phase 10 slice B in `flutter_app/`. ADR 273.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Pure black dark mode | `enableAmoledTheme` | OFF |
| Biometric lock row | `enableBiometricAuth` | OFF |
| Simplify debts row | `enableSimplifyDebtsToggle` | OFF |
| Approval threshold row | `enableExpenseApprovalThreshold` | OFF |

### Steps
1. Trips list, settings icon, Settings. The screen shows Profile, Appearance, Notifications, Data, Help, About, Account (Security only with the flag).
2. Tap your name, change it, Save: the row updates. Reopen the app: the name is kept (accounts update the profile; guests keep it on the device).
3. Theme: choose Dark, then Light, then Auto. The app changes at once and keeps the choice after a restart.
4. With `enableAmoledTheme` on: the pure black switch appears and, in dark mode, backgrounds are black.
5. Haptic feedback off: taps stop vibrating. Default currency EUR: the next new trip starts in EUR, even if the destination suggests another.
6. With `enableBiometricAuth` on: turning the lock on asks for Face ID or fingerprint; a failed prompt leaves it off.
7. Export backup shares a `triptracker-backup-YYYY-MM-DD.json`. On a fresh install (or after Sign out), sign in, Restore backup, pick the file: the dialog says how many trips and expenses it adds and warns that a second restore duplicates. Confirm: the trips, people, archived people and expenses appear, with the right payers and splits.
8. Restore with a file that is not JSON: a clear message, nothing added.
9. About shows the version and build. What's new (flag) lists releases. Sign out clears the device. Delete account opens the existing screen.
10. Open a trip, Trip settings. As the owner: Freeze trip (confirm) makes expenses read-only; Trip closed and Archive work; Categories and Recycle bin open. Turning Freeze off restores edits.
11. As a non-owner member: Trip state is absent and Simplify debts / Approval threshold are read-only.

### Negative checks
- Flags off: no pure black, no Security section, no Simplify debts or approval rows.
- Guest: Settings works; Report a problem asks to sign in.

### Pass
- Steps 1 to 11 pass headless except Face ID (6) and the real restore on a clean device (7), which are device steps (B-012, B-146).

---

## FLUTTER-P10A — Flutter: in-app notifications

**Scope:** Phase 10 slice A in `flutter_app/`. Bell, list, banner. No push yet (slice E), no new flags. Needs a staging project for steps 7 and 8.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Money chip and folding of bursts | `enableNotificationGrouping` | ON |

### Steps
1. Open a trip. The header shows a bell. With unread rows it carries a badge (9+ above nine). With none, no badge.
2. Tap the bell. The list opens on "This trip". Each row has an icon, a headline ("Expense Added"), the detail ("Dinner — USD 85.00") and a relative time. Unread headlines are bold.
3. Switch to "All trips": rows from other trips appear.
4. Tap a row. It turns read and you land on the matching tab (chat message to Chat, settlement to Balances, member to Members, expense to Expenses). A "trip deleted" row only marks read.
5. Use the mark icon on a row to flip read and unread. Mark all as read clears every unread in the current scope.
6. Swipe a row left to delete it. Clear notifications asks first, then empties the current scope.
7. Two or more expense rows within an hour from the same person fold into one with "Show N more". Chat messages never fold.
8. Tap Money: only settlement rows stay. If rows exist but none are money, the empty state says "No money updates".
9. With the app open, have another account add an expense on staging. A banner slides in at the top with the headline and detail; it disappears after about 5 seconds or when swiped up; tapping it opens the list. Open the app fresh on a new install: older notifications do not pop banners.
10. Go offline, read a row, come back online. The row stays read after the next refresh.

### Negative checks
- `enableNotificationGrouping` off: no Money chip, bursts show as separate rows.
- Signed out: no bell data, list empty.
- Guest or demo (no backend): bell and list work from local rows only; nothing is sent.

### Pass
- Steps 1 to 8 pass headless (widget tests). Steps 9 and 10 need a staging project; steps on real devices stay unverified (B-001, B-004).

---

## FLUTTER-P8 — Flutter: members, notes, text chat, manual passes

**Scope:** Phase 8 slices A–D in `flutter_app/`. No new flags. No `record`, `just_audio`, `pdfrx`, `mobile_scanner`, or SQLCipher. Use a staging project for the two-account check. ADR 267.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Member balance line | `enableMemberMoneyRow` | ON |
| Notes tab (checklist and notes) | `enableNotesAndChecklist` | ON |
| Suggest packing | `enablePackingAssistant` | ON |
| Text chat (quiet chat on Notes, or its own tab) | `enableTripChat` | ON |
| Chat as the first tab | `enableChatFirstNav` | OFF |
| Add-pass button and pass cards | `enableTravelPasses` | ON |
| Date ranges, reactions, attachments, voice, typing, read receipts, Tripbot, document vault | matching labs/pro flags | OFF |

### Steps
1. Open a trip with three people and one expense you paid. Members lists everyone. Your row says "is owed" and the others say "owes". Turn `enableMemberMoneyRow` off and those amounts disappear; names stay.
2. Add a person by name. Rename them. Set someone to Viewer. Archive them: they move under Archived and are not offered on a new split. They still appear in old expenses.
3. Add a group of two people. Rename it. Delete it. Invite opens the same share sheet as the header (join code and share), not a contacts picker.
4. Notes → Checklist. Add an item, assign it, mark it done, and move it up. "n of n" matches. Suggest packing adds the document and power-bank lines, and a second tap does not duplicate them.
5. Notes → Notes. Add a note and type a sentence that includes `https://example.com`. The link is tappable. Keep typing while another phone updates the same note: the cursor does not jump.
6. With chat-first off, Notes shows a Chat segment. A message from someone else shows an unread mark until you open Chat. Send a message while offline: it stays on screen with Pending, and leaves Pending after sync. Day headers group by date. Long-press your own message to edit it, or clear it to delete it.
7. An expense, settlement, or dispute card in chat opens that expense.
8. Turn chat-first on. Chat is its own tab and shows the same unread dot. Notes no longer has a Chat segment.
9. With `enableTravelPasses` on and no passes, Notes shows Add pass and no pass cards. Add a flight (title, from, to). A card appears. Train and Hotel are the other types.
10. Two accounts on staging: A adds a checklist item and a chat line; B sees both without restarting. This step needs a staging project (same limit as B-001 and B-005).
11. On a device, open a chat with about 1,000 messages and scroll. It should stay near 55 fps. iOS keyboard: the composer stays above the keyboard. Neither check can be proven on this Linux machine.

### Negative checks
- Notes flag off and passes flag off and chat flag off: no Notes tab.
- Packing flag off: no Suggest packing button.
- Chat flag off: no Chat segment and no chat tab.
- Chat-first off: Chat is not in the bottom bar.
- Travel passes off: no Add pass control.
- Date-range membership, contacts picker, voice notes, image attach, reactions, typing, read receipts, Tripbot, scanner, PDF import, screen brightness, and the document vault are absent.

### Pass
- Roster, roles, archive, and groups match the steps. Checklist and notes save for a non-owner member via the collab write. Chat text survives offline. Pass cards appear only after one is saved. The 1,000-message scroll and the two-account check are device/staging steps.

---

## FLUTTER-NOTES-OVERFLOW — Flutter: Notes tab many-passes overflow fix

### Flags
- `enableTravelPasses` ON (default for Trip pack); `enableTripChat` ON to see the Chat segment.

### Steps
1. Open a trip with 8+ passes (e.g. Sikkim Bagpacking) on a phone-size screen.
2. Open the **Notes** bottom tab.
3. Confirm no yellow/black "BOTTOM OVERFLOWED" stripe appears.
4. Confirm the Checklist / Notes / Chat selector is visible below the passes area.
5. Scroll inside the Next Up + Passes area; all passes and "Add pass" are reachable.
6. Tap **Chat**, then **Notes**, then **Checklist**; each pane fills the remaining space.
7. Open a trip with 0 passes (e.g. Switzerland); layout is unchanged.

### Negative checks
- `enableTravelPasses` OFF → no passes list; selector and panes still render.

### Pass
- No overflow stripe at any pass count; selector always on screen; passes scroll within a capped area (~35% of screen height).

## FLUTTER-PASS-SORT — Flutter: pass list sorting (Time / Leg / Name)

### Flags
- `enablePassSorting` ON (default, Travel pack) and `enableTravelPasses` ON.

### Steps
1. Open a trip with 3+ passes across 2+ flights and several travelers (e.g. Sikkim Bagpacking) → Notes tab.
2. Above the passes, confirm a **Time | Leg | Name** control (Time selected).
3. Time: passes run earliest → latest; undated passes are last.
4. Tap **Leg**: passes are grouped under a header per flight/route (e.g. `6E445 · IXB · BLR`), earliest leg first, travelers A→Z within each group; passes with no leg info sit last under `—`.
5. Tap **Name**: passes group by passenger A→Z, each person's legs in time order; no leg headers.
6. Leave the tab and return: sort resets to Time (not remembered).
7. Open a trip with 1–2 passes: no sort control.
8. Tap a pass / QR / live-status icon in each mode; each opens the correct pass.

### Negative checks
- `enablePassSorting` OFF (Ops Deck → Flags / Travel pack) → no sort control, no leg headers, passes in stored order.
- `enableTravelPasses` OFF → no passes list at all.
- Sorting never changes stored order (reload app with Time mode: unchanged).

### Pass
- Each mode orders as above, headers only in Leg mode, flag OFF restores the plain list.

## FLUTTER-WEBTHEME — Flutter: web palette, pass cards, Superadmin redirect, sign-in diagnostics

### Flags
- None new. Passes cards use `enableTravelPasses`; sort uses `enablePassSorting`.

### Steps
1. Light, dark and AMOLED themes (Settings): primary actions and headers are teal (`#0F6F63` light, `#3FCBBD` dark), accent orange, surfaces match the web app; no blue remains (trips, balances, maps, Wrapped).
2. Notes tab with passes: each pass is a card (type icon, route, passenger, flight, date chip, QR + live-status buttons); tapping opens the scanner/status as before.
3. Login → expand Superadmin login → sign in with a superadmin account: you land on the Superadmin screen with only **Open Ops Deck** and **Sign out** (no traveller view, no trips).
4. Tap **Open Ops Deck**: Chrome opens the web app (`trip-tracker.blackmaroon.in`) and lands in the Superadmin portal already signed in, with no second login. Sign out returns to the Flutter login.
5. Superadmin password field: capital letters can be typed; eye icon shows/hides.
6. Debug builds: a failed Google sign-in shows the red banner plus a small grey line with the raw error.

### Negative checks
- Non-superadmin account in the Superadmin form → rejected, signed out, no `/admin`.
- Force-close and reopen as the same superadmin → traveller UI (admin redirect is per login, not persisted).
- After about an hour the web portal may refresh the shared session; reopening the Flutter app can then ask for a sign-in again (known trade-off, decision 282).
- Web links elsewhere in the app (share links, maps) open in the browser (Android manifest `https` query).
- Release builds never show the grey error line.

### Pass
- Palette matches the web app in all three themes; passes read as cards; superadmin login lands on `/admin`.

## FLUTTER-BENTO — Flutter: Bento redesign (P0 to P5)

### Flags
- None new. Existing flags still gate their features; `enableHorizonNav` keeps the home dock.

### Steps
1. Light theme: green-grey ground, white surfaces, ink text, five pastel tiles (mint, butter, peach, sky, lilac); fonts are Bricolage Grotesque (titles, numbers) and Figtree (body).
2. Switch Settings → Appearance to Dark and Black: tiles become deep tinted versions, text stays readable, buttons turn cream.
3. Login: tile collage, large headline, ink Google button; Superadmin login still works.
4. Trips: each trip is a tile (the trip happening today is the large mint tile with the flight arc); tiles spring in one after another (not with reduce-motion on).
5. Bottom dock: floating white pill, the selected item shows its lilac pill with its label, others show only an icon, the centre ink button creates a trip. Every icon has a spoken label (TalkBack).
6. Trip: header on the ground colour with an ink title; Expenses summary is mint/butter/peach tiles; each expense is a tile tinted by its category; Add expense has a butter amount tile and lilac selected chips.
7. Balances (cross-trip and per trip): mint/peach/sky "you" tile, ink text, trip tiles coloured per trip.
8. Members: one tile per person, groups in lilac.
9. Notes → Passes: each pass is a tinted tile (same flight, same colour); Spend insights: butter/peach/mint KPI tiles and a sky chart tile.
10. Settings: mint profile tile, section labels in Figtree; Onboarding and Splash on the ground colour.

### Negative checks
- Large text (200%) and right-to-left: no yellow overflow stripes on Login, Trips, Expenses, Balances, Members.
- Wide window (900px+): side rail still shows, tiles stay a readable width.
- Reduce motion: tiles appear without the spring-in.

### Pass
- Same colours and type in all three themes; every screen above reads as tiles on the ground; no overflow; all labels contrast-checked by the a11y test.

## FLUTTER-SUMMARY — Flutter: Summary tab, Add expense on Summary, map panel, live Notes

### Flags
- None new. The Spend insights link and Settlement history still follow `enableSpendInsights` and `enableSettlementHistory`.

### Steps
1. Open a trip: it lands on Summary; the tab order is Summary, Expenses, Members, Notes.
2. Summary top: boarding-pass card with trip dates, "You are owed" or "You owe" and a large amount, and a stamp (NOT SETTLED while money is owed, SETTLED at zero). Below it, To receive and To pay cards and, once there is something to settle, a progress card.
3. Who pays whom: tickets with avatars; as admin, flip the Simplify / Direct switch and check the counts line and the tickets change; tap Settle on a ticket to open the settle sheet.
4. Trip numbers (open by default): totals tiles, donut with a row per category, Who paid bars, per-person balances.
5. Tap Add expense on Summary, then on Expenses: both open the expense form; save one and see Summary update.
6. Tap the map icon in the trip header: with stops you get the map (tap it to edit the route); without stops you get "No route yet" and an Add stops button. Tap the icon again to hide it.
7. Notes: Passes pane, checklist add / edit / delete (Undo) and tick several items; with a second account, a tick or chat message appears without refreshing.

### Negative checks
- `enableSettlementHistory` OFF: no history section. `enableSpendInsights` OFF: no insights link.
- Non-admin member: no simplify switch.
- 200% text: Summary scrolls with no overflow stripes.

### Pass
- All steps behave as described, no overflow, ticks stay ticked after a pull-to-refresh.

## SETTLE-GROUP-RLS — Second partial group settlement no longer fails

**Commit:** `4f33b89` (BUG-293). **Migrations:** none. A settlement between a group and someone else used to be recorded under the group member with the biggest balance. After one partial payment, that could switch to the other group member. A non-organizer's next settle was then rejected with `new row violates row-level security policy for table "expenses"`. The signed-in member is now recorded for their own group's side. Fixed on web (`settlementPartiesForRecorder`) and Flutter (`planSettlement` in `flutter_app/lib/domain/logic/settle_up.dart`, used by the settle sheet and Settle all).
## SETTLE-GROUP-RLS — Second partial group settlement no longer fails

**Commit:** `ecf23b2` (BUG-293). **Migrations:** none. A settlement between a group and someone else used to be recorded under the group member with the biggest balance. After one partial payment, that could switch to the other group member. A non-organizer's next settle was then rejected with `new row violates row-level security policy for table "expenses"`. The signed-in member is now recorded for their own group's side.

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| Settle Up / custom amount | none (bug fix on the existing settle flow) | — |
| Simplify debts (group-merged transfers) | trip setting, ON | ON |
| Flutter Settle all | `enableSettleAll` | as already set |

### Steps
1. As the organizer, create a trip with Alice (organizer), Bob, and Charlie. Bob signs in on a second device and joins as a contributor, not an organizer.
2. Put Bob and Charlie in one group.
3. Alice adds a ₹1000 expense she paid, split equally between Bob and Charlie only. Summary shows "Bob & Charlie → Alice ₹1000".
4. As Bob, open Summary, choose a custom amount on that row, enter 10, and confirm.
5. As Bob, choose a custom amount on the same row (now ₹990), enter 990, and confirm.
6. Repeat once with Bob as the one owed: Alice pays the group's share back to Bob & Charlie, Bob records a partial and then the rest.
7. Flutter app: repeat steps 3–5 as Bob from the Summary tab. Tap Settle on the "Bob & Charlie → Alice" ticket, enter 10 in the settle sheet, save, then reopen it and save 990.
8. Flutter app with `enableSettleAll` ON and two debts for Bob's group: as Bob, record a partial on one, then tap Settle all.

### Negative checks
- An organizer outside the group can still record the settlement. It is still recorded under the group member chosen by the app.
- With Simplify debts OFF (direct member-to-member rows), Bob cannot settle Charlie's own row on web. That is unchanged.

### Pass
- Every settlement in steps 4–8 saves with no error. Summary shows the debt as settled.
- Settlement history lists the payments with Bob as payer (or recipient in step 6), not Charlie.

### Negative checks
- An organizer outside the group can still record the settlement. It is still recorded under the group member chosen by the app.
- With Simplify debts OFF (direct member-to-member rows), Bob cannot settle Charlie's own row. That is unchanged.

### Pass
- Both settlements in steps 4 and 5 save with no error toast. Summary shows the debt as settled.
- Settlement history lists both payments with Bob as payer (or recipient in step 6), not Charlie.

---

## STABILITY-POLISH — Failure copy, sync status, and Shares weights

**Flags:** none. These are fixes on existing Core surfaces.

### Steps
1. On web, open a trip. The header sync pill reads **Saved** when nothing is queued.
2. Turn the network off, add an expense, and confirm the pill and the offline banner say **Waiting**. Open the banner: the row is named (for example "Add expense: Dinner") and is not a raw type name.
3. If a queued change fails, the pill reads **Failed N**. Tap it. The existing queue opens and that row has **Retry**.
4. Add an expense with split mode **Shares**, weights 2 and 1. Save, edit the title, save again. Reopen the expense: the weights are still 2 and 1, and the balances are not an equal split.
5. Settings → backup → Import. The screen says a second import of the same file creates duplicate trips before you restore.
6. On Flutter, the trip header shows **Saved**, **Waiting**, or **Failed N**. Failed opens the same review sheet, and each failed row can be retried.
7. Flutter trip rows show a destination eyebrow when a destination exists, a round stamp, a dashed rule above the footer, and money in a monospace figure.
8. Settings → turn app lock off. The phone asks for biometrics. Cancelling leaves app lock on.

### Negative checks
- Closing a sync-conflict sheet does not keep the other device's copy. The expense stays in conflict until you choose Keep my version or Accept cloud version.
- With the sync inspector flag off, a failed row can still be retried. Discard stays behind that flag.

### Pass
- Shares weights survive an edit.
- Failed sync items are named and can be retried from the existing list.
- Crash and tab-error panels say the trip data is still on the device, and the diagnostic text is only in Copy report.

### Device proof (needs staging and a phone)
- Run the Flutter staging sync suite twice: create an expense offline, flush, replay the same write, and see one server row.
- On two phones, edit the same expense, then kill one app mid-flush. Resolve it only from the conflict sheet, which names the expense.
- Walk create trip → add expense → who owes whom on web at desktop and phone width, and on Flutter Android.

---

## Template for the next feature

Copy below when shipping the next customer-facing change:

```markdown
## FEAT-XXX / BUG-XXX — Short title (vX.Y.Z)

**Commit:** `hash`. **Migrations:** … **ADR:** …

### Flags
| Behavior | Flag | Default |
|----------|------|---------|
| … | `enable…` | OFF |

### Steps
1. …
2. …

### Negative checks
- Flag OFF → …

### Pass
- …
```

Then add a row to the **Index** table.

## FLUTTER-HORIZON — Horizon nav and spend insights (v3.48.0)

**Flags:** `enableHorizonNav`, `enableSpendInsights` (Pro pack, default OFF).

1. In Ops Deck > Flags turn ON `enableHorizonNav` for your user, reopen the Flutter app.
2. Phone width: bottom dock shows Trips, Balances, centre add, Activity, Me. Tap Balances: per-member balance bars render.
3. Window >= 900px: dock becomes a side rail. Press Android/system back on Balances: lands on Trips, app does not exit.
4. Window >= 1100px, open a trip Expenses: table with columns Expense, Category, Paid by, Date, Amount; selecting a row opens the detail panel.
5. Turn ON `enableSpendInsights`: trip tools show Spend insights; day and category charts render.
6. Window >= 1024px: login shows Night Sky pitch left, form right; Settings shows section list left that jumps to sections.

**Flag-OFF checks:** both flags OFF = original bottom nav and no Spend insights entry.

### Pass
- Each step matches; no overflow at 430, 900, 1100, 1280 widths.

## FLUTTER-FIRSTSYNC — Trips after sign-in, destination autocomplete, Horizon defaults (v3.48.2)

**Flags:** `enableDestinationAutocomplete`, `enableHorizonNav`, `enableSpendInsights` (all default ON, Core pack).

1. Sign in with Google on a fresh install. The Trips screen shows "Syncing your trips…" and then your trips, with no need to leave the screen.
2. Tap New Trip, type "gok" in Destination: suggestions appear (Gokarna). Pick one: the trip name fills as "Gokarna trip" and the currency follows the country.
3. Type "Munar": a "Did you mean Munnar?" chip appears; tapping it fixes the text.
4. The bottom dock (Trips, Balances, +, Activity, Me) is visible without touching any flag.

**Flag-OFF checks:** turn `enableDestinationAutocomplete` OFF: Destination is a plain field. Turn `enableHorizonNav` OFF: the older Trips menu returns.

### Pass
- Each step matches; no blank Trips screen after sign-in.

## FLUTTER-BOARDING — Flutter boarding-pass UI and live-stream fix (v3.54.0)

**Flags:** none (restyle of existing screens).

1. Open a trip. Summary: a twilight banner with the trip name, a glowing net balance, a NOT SETTLED (or SETTLED) stamp, dates and traveller count, and a barcode stub with Total spent, Per person and Open payments.
2. Scroll down: a runway card with an airplane marker and "% CLEARED"; under "Who pays whom", luggage-stub tiles with a Settle button. Tap Settle: the existing confirm sheet opens.
3. As the trip owner tap "Per person": within a second the list changes to one tile per debt and the "payments instead of" line stays; tap "Fewest payments": it changes back. Neither choice flips back on its own. Do it again after pulling to refresh.
4. Trip numbers: glowing donut with category badges below it; there is clear space above "Everyone's balance".
5. Expenses tab: a pill row (All Expenses plus categories); tap one to filter and see the pill glow teal. Day headers read like "OCT 14 · DAY 3". Rows are receipt cards; a row where you owe shows "your share ₹X" with a barcode, and one you paid shows "you get back ₹Y".
6. Notes > Passes: a pass shows route, time, passenger and seat, a dashed vertical tear line and a QR stub when the pass has QR data. The selector reads "Passes (2)" / "Checklist (8)".
7. Checklist: tick an item; the circle turns teal and the strike-through fades in.
8. Trip app bar: tap `⋮`: "App settings" opens the app settings; "Live Location Share" opens the share dialog. The gear still opens Trip settings.

**Negative checks:** as a non-owner admin the Fewest / Per person control is not shown on Summary. With compact ledger view ON, expense rows keep the old compact style.

### Pass
- Each step matches; no overflow at 360 px width and at 200% text size; toggling Per person survives a sync.

## FLUTTER-SUPERADMIN — Flutter native Superadmin portal and analytics (v3.55.0)

**Flags:** none (reachable only after the Superadmin login).

1. On the login screen open "Superadmin login" and sign in. You land in the portal inside the app (no browser opens). Bottom tabs: Overview, Bugs, Users, Trips, Flags, More.
2. Overview: tiles for open bugs, users, trips and flag overrides; each opens its tab. "Needs attention" lists open critical / high bugs.
3. Bugs: filter Open / Resolved / Won't fix / All and by severity; tap a bug, set status and a resolution note, Save; it leaves the Open list. "New bug" files one.
4. Users: ban / unban and delete (both ask first); superadmins show no ban or delete; Broadcast sends a notification after confirming.
5. Trips: filter by Active / Grounded / Closed / Archived; Ground, Archive and Delete a trip (delete confirms). Check the Audit log shows the action.
6. Flags: sections per pack (Core, Trip, Travel, Pro, Labs, Ops) with "x/y ON"; the chips filter by pack; flip a global switch (shows OVERRIDDEN); open a flag to reset it or add / remove a per-trip or per-user override.
7. More > Features: mark a request shipped with a note; log a new one; delete one (confirms). More > Audit log: filters and "Purge old entries" (confirms). More > Controls: toggle maintenance mode and sign-ins paused, set a maintenance window, change a number or the landing text and Save. More > Tools: Ping services, purge the recycle bin (confirms), change password.
8. More > Analytics: Growth (loop health, funnel, ghost trips, win-back, flag use, invites, slices, closeout pulse, Splitwise, signup source, retention), Overview, Financial (currency, categories, spenders, split modes, settlement health), Engagement and Health tabs fill in; pull to refresh reloads.
9. The open-in-browser icon in the top bar still opens the web Ops Deck already signed in.

**Negative checks:** a non-superadmin account is rejected at the Superadmin login with Google guidance; with the server refusing a change, the sheet shows the error and nothing changes.

### Pass
- Each step matches; no overflow at 360 px width; changes made here show up in the web Ops Deck.

## FLUTTER-CARDSTACK — Flutter Trips card-stack view (v3.55.0)

**Flags:** `enableTripCardStack` (Trip pack, default ON).

1. Open the app on the Trips home. The header has a list / cards button; the list is shown by default.
2. Tap it: a stack of tall boarding-pass cards appears. Every trip is there (upcoming, ongoing, ended, and archived ones at the back); the counter reads "1 of N".
3. Each card shows the trip photo with the destination (from when the trip was created) and a pin; a trip with no destination or photo shows a tinted gradient. The screen background is the top card's photo, blurred, and it fades to the next photo as you swipe.
4. Swipe right (or tap the card, or press Open): the trip opens; going back shows the same card on top. Swipe left (or press Skip): the card goes to the back and the next one is on top. A short drag springs back.
5. Long-press a card: a menu with Open, and (for trips you own) Archive / Unarchive and Delete. Delete asks first; Archive shows the undo bar.
6. Kill and reopen the app: it opens in the view you left it in. Tap the button again to return to the list.

**Flag-OFF checks:** turn `enableTripCardStack` OFF in Ops Deck > Flags: the button disappears and the Trips home is the list, even if you had chosen cards. A single trip cannot be skipped (the Skip button is disabled).

### Pass
- Each step matches; no overflow at 360 px width; swiping stays smooth with 20+ trips.

## FLUTTER-DEPARTURES — Flutter boarding-gate login, Departures stack, runway slider (v3.56.0)

**Flags:** `boardingPassLogin` (login, prod only), `enableTripCardStack` (Trip pack, default ON). Dev/staging builds always show the new login.

1. Signed out: the login shows a destination photo, "Board with Google", a gate-code field (Join stays dim until 6 characters) and "Staff ›".
2. Never sign in automatically as the superadmin: kill and reopen the app after a superadmin session; the login must show.
3. Sign in, open Trips, tap the cards button. The header says "Departures" with "N TRIPS · M ACTIVE"; the filter pills are centred; no white bar above the header.
4. Swipe the top card left (goes to the back) and right (previous card returns). Neither opens a trip. Tap the card: the trip opens. Long-press: Open / Archive / Delete menu.
5. Slide the plane right to the end: Create Trip opens. Slide left to the end: Join opens. A short slide rolls back. Tapping the Join / New Trip labels does the same.
6. In Create Trip, Destination is first. Type "Tokyo": the name fills "Tokyo trip". Type your own name, then change the destination: the name stays. Clear the name: the suggestion returns.

**Flag-OFF checks:** `enableTripCardStack` OFF: only the list view with the dock. `boardingPassLogin` OFF on a production build: the old login.

### Pass
- Each step matches; no overflow at 360 px width.

## FLUTTER-NOTE-POPUP — New note opens a title + body popup

**Flags:** none (fix to the existing Notes tab).

1. Open a trip > Notes > Notes pane > tap Add note.
2. A popup opens with a Title field and a multi-line Note field, plus Save.
3. Enter a title and a body, tap Save: the note appears with both filled in; no second step needed.
4. Add another with only a body: the title becomes the body's first line. Add one with both empty: Save closes the popup and nothing is created.
5. Dismiss the popup (swipe down / tap outside): no note is created.

**Flag-OFF checks:** n/a (no flag).

### Pass
- Each step matches; keyboard does not hide the Save button at 360 px width.

## FLUTTER-GROUP-SPEND — Group-wise spend (paid + share) on the Summary

**Flags:** `enableGroupSpend` (Trip pack, default ON).

1. Use a trip with at least two members in a group (Members > Add group) and a few expenses paid by different people, some split among everyone.
2. Open the trip Summary (ledger). The "Who paid" card follows the single Groups / People switch at the top of the Summary page (there is no second switch inside the card).
3. Members: unchanged per-person rows. Groups: one row per group with the amount its members paid (bar + amount) and "Share X" underneath, the sum of its members' split shares. Members in no group appear as their own row.
4. Check: sum of all Paid values = sum of the Members view; the group's Paid = its members' Paid added up.
5. A split payment (several payers) counts each payer toward their own group. Settlement transfers and pending-approval expenses are not counted.
6. A trip with no groups: no switch, members only.

**Flag-OFF checks:** turn `enableGroupSpend` OFF in Ops Deck > Flags: no switch, "Who paid" lists members only. Balances and settlements are identical either way.

### Pass
- Each step matches; rows do not overflow at 360 px width with long group names.

## FLUTTER-GROUP-EDIT — Flutter: group popup, edit members, 2-member minimum

**Flags:** none (fix to Members > Groups).

1. Members tab > Groups: tap a group. A popup lists its members (avatar + name) with Edit group and Delete.
2. Edit group: name and member checkboxes are pre-filled. Tick a new member / untick one, Save: the group updates.
3. Untick down to 1 member: a hint says fewer than 2 dissolves the group. Save: the group is removed and a message says it was dissolved.
4. Add group with fewer than 2 members picked: Save stays disabled.
5. Remove a trip member who is in a 2-member group: the group dissolves.

### Pass
- Each step matches; sheet scrolls on a 360 px wide phone.

## FLUTTER-CHECKLIST-RING — Flutter: checklist progress card

**Flags:** none.

1. Notes > Checklist with several items, some ticked: the ring shows a percentage inside; "N of M" and "K left" sit beside it. Nothing overlaps at 360 px or at 200% text.
2. Tick everything: the ring shows a check mark and the text says "All done".
3. Empty checklist: 0%.

### Pass
- No overlap in any state.

## FLUTTER-SETTINGS-LIST — Flutter: WhatsApp-style settings

**Flags:** `enableBiometricAuth` (Privacy and security row), `enableAmoledTheme` (inside Appearance), `enableFeatureSuggestions`, `enableWhatsNewHub`.

1. Settings/Me: a profile header (tap to rename), then rows: Account, Notifications, Appearance, Data and backup, Help, About (plus Privacy and security when its flag is ON); Sign out in red and the app version at the bottom.
2. Open each row: it is its own page with a back button. Appearance: theme, haptics, default currency. Notifications: preferences, pass reminders. Data and backup: export / restore. Help, About, Account (Delete account).
3. Switch a toggle on a page: it repaints immediately. Errors and "backup ready" appear as a bottom message.

**Flag-OFF checks:** with `enableBiometricAuth` OFF there is no Privacy and security row; with `enableAmoledTheme` OFF no Pure black row; Suggest a feature / What's new rows are absent unless their flags are ON.

### Pass
- Every old setting is still reachable; the list is flat with no cards.

## FLUTTER-SUMMARY-POLISH — Flutter: Summary and Settlement Pass polish

**Flags:** none (replaces the old layout). `enableGroupSpend` still controls the Members/Groups spend switch.

1. Summary tab: the hero amount counts up/down when a payment changes it; section headers show a one-line summary ("2 payments left", total spent) and the chevron rotates as the section expands with a smooth animation.
2. Who pays whom: your own payments come first. A transfer you must make has a "You pay" chip, one you receive has "Pays you". Each tile shows From → To, the amount and one Settle button.
3. Trip numbers: category rows are compact (dot, name, %, amount, thin animated bar); the donut, "Who paid" and Insights link are unchanged.

### Pass
- No overflow at 360 px; settle flow (UPI / share / confirm) works as before.

## FLUTTER-SETTLE-ALL — Flutter: settle all I owe

**Flags:** `enableSettleAll` (Trip pack, default ON).

1. Use a trip where you owe two or more people (e.g. Ben paid for you and him, Cara paid for you and her).
2. Summary tab > Who pays whom: a "Settle all I owe · 2 payments · amount" button sits above the tiles.
3. Tap it: a dialog asks "Mark 2 payments as paid?" and says no money is sent. Confirm: both payments are recorded, a toast says "2 payments recorded", and the list shows All settled.
4. With only one payment owed, or when you owe nothing, the button is absent. It never records payments owed by or to other people.

**Flag-OFF checks:** turn `enableSettleAll` OFF in Ops Deck > Flags: no button; each tile's own Settle still works.

### Pass
- Settlements appear in History and balances reach zero.

## FLUTTER-SHARE-SUMMARY — Flutter: share trip summary as an image

**Flags:** `enableShareSummaryImage` (Trip pack, default ON).

1. Summary > Trip numbers: tap "Share summary" (above the Insights link).
2. The share sheet opens with a picture: trip name, total spent, per person, who pays whom (max 6, "+N more" after) and a caption.
3. Trip with nothing owed: the picture says "All settled".

**Flag-OFF checks:** `enableShareSummaryImage` OFF: no button.

### Pass
- Image text is not cut off with 6+ transfers.

## FLUTTER-DAY-BY-DAY — Flutter: day-by-day spend

**Flags:** `enableDailyTimeline` (Trip pack, default ON).

1. Summary > Trip numbers: a "Day by day" list shows one row per day with a bar and amount, most recent 14 days.
2. Add an expense on a new date: a new row appears; totals are unchanged elsewhere.

**Flag-OFF checks:** `enableDailyTimeline` OFF: no list.

### Pass
- The biggest day has the longest bar.

## FLUTTER-CHECKLIST-CATEGORIES — Flutter: checklist category progress

**Flags:** `enableChecklistCategoryProgress` (Trip pack, default ON).

1. Notes > Checklist with items in at least two categories: under the overall ring, one thin bar per category with done/total.
2. Tick an item: the bar and count update at once; a finished category turns green.

**Flag-OFF checks:** `enableChecklistCategoryProgress` OFF: only the overall ring.

### Pass
- Categories without items are not listed.

## FLUTTER-SETTINGS-SEARCH — Flutter: settings search

**Flags:** `enableSettingsSearch` (Trip pack, default ON).

1. Settings/Me: a "Search settings" box sits under the profile.
2. Type "currency": the Default currency row appears in place and works. Type "backup": export and restore rows. Type "zzzz": "No settings match".
3. Clear the box with the x: the normal category list returns.

**Flag-OFF checks:** `enableSettingsSearch` OFF: no box.

### Pass
- Matches include rows from every page.

## FLUTTER-TRIP-BUDGET — Flutter: trip budget (this device only)

**Flags:** `enableTripBudget` (Trip pack, default ON).

1. Summary > Trip numbers: a "Set a trip budget" card. Tap, enter an amount, Save.
2. The card shows "spent of budget", a bar, and "X left"; green below 80%, orange from 80%, red and "X over budget" past 100%.
3. Tap the card again to change or clear the budget (0 clears it).
4. The note "Kept on this device only" is shown: the budget is not shared with other members and is not synced; a second device shows no budget.

**Flag-OFF checks:** `enableTripBudget` OFF: no card. Adding expenses is never blocked by the budget.

### Pass
- The bar color and wording follow the thresholds above.

## FLUTTER-TRIP-LIST-MONEY — Flutter: trip cards show people and your money

**Flags:** `enableTripListMoney` (Trip pack, default ON).

1. Trips list (list view): each trip card has overlapping member avatars (up to 4, then "+N") and, on the right, "You're owed ₹X" (green), "You owe ₹X" (red) or "Settled up".
2. Add an expense on a trip and return to the list: the line updates. A trip you are not a member of shows avatars but no money line.

**Flag-OFF checks:** `enableTripListMoney` OFF: no avatars and no money line.

### Pass
- The amount matches the trip's Summary hero; no overflow at 360 px.

## FLUTTER-TRIP-LIST-SECTIONS — Flutter: trips grouped by Happening now / Upcoming / Past

**Flags:** `enableTripListSections` (Trip pack, default ON).

1. Trips list with the All filter and trips in different phases: headers HAPPENING NOW, UPCOMING and PAST group the trips in that order; the chosen sort holds inside each group.
2. Switch the filter to Active/Upcoming/Past: no headers.

**Flag-OFF checks:** `enableTripListSections` OFF: one flat list in sort order.

### Pass
- A header never repeats; archived trips stay in their folded section.

## FLUTTER-TRIP-STRIP — Flutter: trip header strip

**Flags:** `enableTripHeaderStrip` (Trip pack, default ON).

1. Open a trip. Under the top bar, on every tab, a strip shows the status pill (Day 3 of 8 / Starts in 5 days / Ended) and the dates. It does not show account avatars.
2. Switch tabs: the strip stays.

**Flag-OFF checks:** `enableTripHeaderStrip` OFF: only the title bar.

### Pass
- The strip does not push content off screen at 360 px.

## FLUTTER-ADD-SPEED-DIAL — Flutter: Add expense speed dial

**Flags:** `enableQuickAddSpeedDial` (Trip pack, default ON).

1. Summary or Expenses tab: tap Add expense. A sheet offers Quick add (type a sentence or speak) and Full form.
2. Quick add opens the quick-add sheet; Full form opens the usual form.

**Flag-OFF checks:** `enableQuickAddSpeedDial` OFF: the button opens the full form directly.

### Pass
- Both routes save an expense as before.

## FLUTTER-SUMMARY-NEXT-ACTION — Flutter: Summary next action

**Flags:** `enableSummaryNextAction` (Trip pack, default ON).

1. You owe someone: the top of Summary says "Pay Ben ₹300" with a Settle button that opens that payment.
2. Others owe you: "Ben still owes you ₹300" or "2 people still owe you ₹X", no button.
3. Everything settled, or you are not on the trip: no banner.

**Flag-OFF checks:** `enableSummaryNextAction` OFF: no banner.

### Pass
- The named person and amount match the first tile under Who pays whom.

## FLUTTER-NOTES-QUICK-CAPTURE — Flutter: Notes quick capture

**Flags:** `enableNotesQuickCapture` (Trip pack, default ON).

1. Notes > Notes pane: a "Quick note" box is at the top. Type a title, press done: a note with that title is added and the box clears.
2. Add note (button) still opens the title + note popup.

**Flag-OFF checks:** `enableNotesQuickCapture` OFF: no box.

### Pass
- The note appears for other members after sync.

## FLUTTER-COACH-HINTS — Flutter: one-time coach hints

**Flags:** `enableCoachHints` (Trip pack, default ON).

1. Trips list: a tip "swipe a trip sideways to archive it". Members tab (once a group exists): "tap a group to see its members or edit it".
2. Tap the x on a tip: it disappears and stays gone after restarting the app.

**Flag-OFF checks:** `enableCoachHints` OFF: no tips.

### Pass
- A dismissed tip never returns on that device.

## FLUTTER-SETTLE-VIEW-SWITCH — Flutter: settlement Group view / Person view

**Flags:** `enableSettlementViewSwitch` (Trip pack, default ON).

1. Use a trip with a group (Members > Add group) and expenses so the group owes someone.
2. Summary > Who pays whom: a Group view / Person view switch is shown to every member, not only the owner.
3. Group view (default): the list settles between groups ("Duo pays Asha"). Person view: the same debts person to person ("Ben pays Asha", "Cara pays Asha"). Your own payments are still first; Settle all and the next-action banner follow the view you picked.
4. The choice is only for you: other members keep their own view, and the trip's Fewest payments setting is unchanged.
5. A trip with no groups shows no switch.

**Flag-OFF checks:** `enableSettlementViewSwitch` OFF: no switch; Who pays whom follows the groups.

### Pass
- Both views list the same total owed; settling in either view clears the matching debt.

## FLUTTER-PLAN-SUGGESTIONS — Flutter: Plan and suggestions in Trip numbers

**Flags:** `enableTripSuggestions` (Trip pack, default ON); the budget part follows `enableTripBudget`.

1. Summary > Trip numbers now starts with a "Plan and suggestions" card, above the total / per person / top category tiles.
2. With no budget, the first tip says to set one and has a Set budget button. Set a budget: the card shows spent of budget, a bar, what is left, "X a day left for N days" and "On pace for Y".
3. Up to 3 tips appear, for example "X over budget", "On pace to finish X over budget", "N payments are still open", "Ben paid 70% of everything...", "Food is 52% of spend", "Biggest day: 10-03, X". They never change an expense or balance.
4. Below the card: one headline strip (total, per person, top category), then tabs: Categories, People (ring, bars, Groups / Members switch), Days (bar chart), Details (every category and day as lists). Share summary and Insights are icon buttons in the Trip numbers header.
5. Who paid follows the one Groups / Members switch in Trip numbers > People.

**Flag-OFF checks:** `enableTripSuggestions` OFF: no tips (the budget still shows if `enableTripBudget` is ON). Both OFF: no card.

### Pass
- Tips match the numbers; nothing overflows at 360 px.

## FLUTTER-BACK-NAVIGATION — Flutter: back goes to the previous page

**Flags:** none (fix).

1. Open a trip, then its menu > App settings. Press the back button or swipe back: you return to the trip, not the trips list. Back again returns to the trips list.
2. Open Settings, Balances or Activity from the bottom bar, then go back: you land on the trips list.
3. In a trip, back still steps through previously visited tabs first.

### Pass
- Back never skips a page you came from.

## FLUTTER-TRIP-LIST-REDESIGN — Flutter: compact trips list

**Flags:** `enableTripsOverview` (new, Trip pack, default ON); the rows also follow `enableTripListMoney` and `enableTripListSections`.

1. Trips home with the List option chosen (see FLUTTER-TRIP-GRID-TILES for the default photo tiles): each trip is a compact row (about 96 px): a rounded cover thumbnail (or the trip's initial on a tinted block), the name, "place · dates", a small status pill, your money position on the right ("You're owed ₹X" green / "You owe ₹X" red / "Settled up"), member avatars and "N expenses". About six trips fit on one screen.
2. The trip happening today is a larger photo card with "Day N of M" and a progress bar. Upcoming rows show "Starts in N days"; finished or archived rows are dimmed.
3. Under the Search icon in the top bar, the search box appears; closing it clears the search.
4. A line at the top says "You're owed ₹X across N trips" (or "You owe ...", "All settled across N trips", or "Balances in N currencies"); tapping it opens Balances.
5. With the All filter, pinned headers read HAPPENING NOW · n, UPCOMING · n, PAST · n. Tap PAST to fold or unfold it.
6. Swipe a row sideways to archive (owners), or press and hold for Open / Archive / Delete.
7. The cards (stack) view is unchanged.

**Flag-OFF checks:** `enableTripsOverview` OFF: no summary line. `enableTripListSections` OFF: one flat list without headers. `enableTripListMoney` OFF: no avatars or money text.

### Pass
- No overflow at 360 px or at 200% text; the long-press menu works for owners only for archive and delete.

## FLUTTER-TRIP-GRID-TILES — Flutter: Trips as photo tiles

**Flags:** `enableTripGridTiles` (Trip pack, default ON).

1. Trips home (not the card stack): trips are square photo tiles, two across, each with the destination photo, a status pill top-left, your money top-right, name, dates and avatars at the bottom. The trip happening now is a wide hero card above the grid. Pinned HAPPENING NOW / UPCOMING / PAST headers still apply.
2. A trip with no photo shows a gradient with its initial.
3. The grid/list icon in the top bar switches to the compact rows and back; the choice is remembered. Press and hold a tile for Open / Archive / Delete (a grid has no swipe).
4. At 200% text the tiles do not overflow.

**Flag-OFF checks:** `enableTripGridTiles` OFF: compact rows only, no switch.

### Pass
- Photos load; text is readable on any photo.

## FLUTTER-TRIP-COVER-SYNC — Flutter: cover photo band and saved/syncing line

**Flags:** `enableTripCoverHeader` (Trip pack, default **OFF** since v3.63: the photo band under the top bar was removed from the default look), `enableSyncLine` (default ON).

1. Open a trip with a destination photo: under the top bar, a slim cover photo band shows the status pill and dates; the photo glides in from the tile. Without a photo, the plain status strip shows.
2. On the right of the strip: "All saved" when everything is synced, "Syncing N changes" while waiting, "Offline" / "Offline - N waiting" without a connection, "Sync issue - Retry" when an item is stuck (tap to retry).

**Flag-OFF checks:** each flag OFF removes its own part; the strip keeps status and dates.

### Pass
- The line follows airplane mode within a few seconds.

## FLUTTER-TODAY-CLOSEOUT — Flutter: Today card and trip-over prompt

**Flags:** `enableTodayCard`, `enableCloseoutPrompt` (Trip pack, default ON).

1. While a trip is happening or about to start, the top of Summary has a Today card: Day N of M (or Starts in N days), spent today, and the next pass with its time.
2. When the trip has ended and is not closed or archived, a "This trip is over" prompt shows: whether everything is settled (or how many payments are left), Mark as paid (when you owe), Share summary and Close trip (opens the usual close sheet).

**Flag-OFF checks:** each flag OFF hides its card.

### Pass
- The cards never change data by themselves.

## FLUTTER-GLOBAL-SEARCH — Flutter: search inside trips

**Flags:** `enableGlobalSearch` (Trip pack, default ON).

1. Trips home > search icon > type a word from an expense title or a note: a "Found inside trips" list shows matching expenses (with trip, date and amount) and notes; tap one to open that trip on Expenses / Notes.
2. A word that matches only a trip name just filters trips as before.

**Flag-OFF checks:** `enableGlobalSearch` OFF: only trips are filtered.

### Pass
- Settlements and deleted expenses never appear.

## FLUTTER-SMART-EXPENSE-DEFAULTS — Flutter: smart expense defaults

**Flags:** `enableSmartExpenseDefaults` (Trip pack, default ON).

1. Save an expense with a payer and category. Open Add expense again on the same trip: the same payer and category are preselected (typing a title can still suggest another category).
2. Another trip has its own remembered values.

**Flag-OFF checks:** `enableSmartExpenseDefaults` OFF: the form always starts with the standard payer and category.

### Pass
- Nothing is saved until you save the expense.

## FLUTTER-NOTIFICATION-DAYS — Flutter: notifications by day and back navigation

**Flags:** `enableNotificationDayGroups` (Trip pack, default ON).

1. Notifications are grouped under TODAY, YESTERDAY and dates.
2. From the bottom-bar Activity tab, tap a notification: the trip opens on the right tab; back returns to the notification list.
3. From a trip's bell, tap a notification of the same trip: the tab switches in place; back goes to the previous tab, then out of the trip.

**Flag-OFF checks:** `enableNotificationDayGroups` OFF: one continuous list.

### Pass
- Back never lands on the Trips home unless nothing else is underneath.

## FLUTTER-REDUCE-MOTION-ROLLING — Flutter: rolling hero numbers and reduce motion

**Flags:** `enableReduceMotion` (Trip pack, default ON).

1. On a trip's Summary, add an expense or settle a payment, then return to Summary: the big amount on the hero card rolls digit by digit like an odometer (up when it grows, down when it shrinks), also when you come back from the form.
2. Settings > Appearance > Reduce motion: the digits, progress bars and sections jump straight to their final state. The phone's own "remove animations" does the same.

**Flag-OFF checks:** `enableReduceMotion` OFF: no switch (the rolling still follows the phone's own setting).

### Pass
- The amount is read out as one number by a screen reader.

## FLUTTER-NOTIFICATION-ACTIONS — Flutter: Confirm button on notifications

**Flags:** `enableNotificationActions` (Trip pack, default ON); also needs `enableSettlementConfirmation` ON.

1. Ben records a settlement that pays you. In Activity, his "Confirm settlement" notification has a Confirm button under it.
2. Tap Confirm (online): a message says the settlement is confirmed, the notification is marked read, and the expense shows as confirmed in the trip.
3. Offline: a message says it could not confirm; nothing changes.
4. Someone who is not the recipient, or a settlement that is already confirmed, sees no button.

**Flag-OFF checks:** either flag OFF: no button; open the notification and confirm from the expense.

### Pass
- Confirming never affects any other settlement.

## FLUTTER-PHOTO-CACHE — Flutter: photos kept on the device

**Flags:** none (performance; photos still load from the network when not cached).

1. Open the Trips list online so the cover photos load. Close the app, turn on airplane mode and reopen: the same photos still show on the tiles, the trip band and the stack.
2. A photo that was never loaded online shows the gradient fallback offline.

### Pass
- No broken-image icons; the cache is the phone's normal cache folder, which Android may clear when it needs space.

## FLUTTER-LAST-SYNCED — Flutter: Updated caption and pull to refresh

**Flags:** `enableLastSyncedCaption` (Trip pack, default ON).

1. Signed in and online: the Trips list and the Summary show "Updated just now / 5m ago / 2h ago" at the top right. Pull down on either page: the list refreshes and the caption resets.
2. Guests and offline-only accounts that never synced show no caption. The time is remembered after a restart.

**Flag-OFF checks:** `enableLastSyncedCaption` OFF: no caption (pulling still refreshes).

### Pass
- The caption ages by itself while the page stays open.

## FLUTTER-TRIP-SWITCHER — Flutter: switch between trips

**Flags:** `enableTripSwitcher` (Trip pack, default ON).

1. Open a trip while you have two or more: the trip name in the top bar has a small down arrow. Tap it: a list of your other trips (in Trips list order, archived skipped) with status and dates; the current one is ticked.
2. Pick another trip: it opens on the tab you were on. A single trip shows no arrow and the name is plain text.
3. The old previous / next arrows and the swipe on the status strip are gone; the strip keeps status, dates and the saved / syncing line.

**Flag-OFF checks:** `enableTripSwitcher` OFF: the name is plain text; use the Trips list.

### Pass
- TalkBack reads "<trip name>. Switch trip" as a button with a 48 px target.

## FLUTTER-TRIP-PINS — Flutter: pinned trips

**Flags:** `enableTripPins` (Trip pack, default ON).

1. Press and hold a trip > Pin to top: a PINNED header appears first with that trip, before Happening now.
2. Press and hold it again > Unpin: it returns to its phase. Pins survive a restart and exist only on this device.

**Flag-OFF checks:** `enableTripPins` OFF: no Pin option and no Pinned header.

### Pass
- A pinned trip stays visible under the Active / Upcoming filters it belongs to.

## FLUTTER-RECEIPT-GALLERY — Flutter: receipt gallery

**Flags:** `enableReceiptGallery` (Trip pack, default ON).

1. Expenses tab > the three-dot menu > Receipts: a grid of every receipt in the trip, newest first, each with its title, date and amount. Trips with no receipts show an empty state.
2. Tap a photo: it opens large (pinch to zoom). Open expense shows that expense.

**Flag-OFF checks:** `enableReceiptGallery` OFF: no Receipts entry.

### Pass
- Settlements and deleted expenses never appear.

## FLUTTER-SPEND-RING — Flutter: spend by person ring

**Flags:** `enableSpendRing` (Trip pack, default ON).

1. Summary > Trip numbers > Who paid: with two or more payers a ring shows each person's share of what was paid, with a legend ("Asha 75%").
2. Tap a person in the legend: the Expenses tab opens filtered to their expenses. In Groups view the ring shows groups (no filter).

**Flag-OFF checks:** `enableSpendRing` OFF: the bars only.

### Pass
- The ring and the bars below it show the same numbers.

## FLUTTER-FIRST-RUN-TOUR — Flutter: first-run tour and sample trip

**Flags:** `enableFirstRunTour` (Trip pack, default ON).

1. First time the Trips list shows (fresh install or cleared data): a three-card tour (tiles, press and hold, inside a trip) with Skip, Next and Got it. It does not come back.
2. With no trips, the empty state also has "Try a sample trip": it creates a small trip (Sample: Goa weekend, three travellers, four expenses) and opens it. Delete it like any trip.

**Flag-OFF checks:** `enableFirstRunTour` OFF: no tour and no sample button.

### Pass
- The sample trip behaves like a real one (settle, share, delete).

## FLUTTER-FEEDBACK-PACK — Flutter: sound and haptic feedback

**Flags:** `enableFeedbackPack` (Trip pack, default ON).

1. Settings > Appearance > Sound feedback is off by default. Turn it on: settling a payment, saving an expense and tapping UNDO give a light tap and a soft click. Off: haptic only.

**Flag-OFF checks:** `enableFeedbackPack` OFF: no sound switch; save and undo have no haptic; settling keeps its old haptic.

### Pass
- Nothing clicks while the switch is off or the phone is on silent.

## FLUTTER-AMOUNT-KEYPAD — Flutter: amount keypad

**Flags:** `enableAmountKeypad` (Trip pack, default ON).

1. Add expense: the keypad icon next to the amount opens big keys (0-9, point, + - x /, delete, Done). The amount and the "= total" line update as you type, e.g. 12 x 3 = 36.
2. One decimal point per number; a second sign replaces the first; delete removes the last key.

**Flag-OFF checks:** `enableAmountKeypad` OFF: no keypad icon.

### Pass
- A keypad amount saves exactly like a typed one.

## FLUTTER-TRIP-ACCENT — Flutter: trip accent colour

**Flags:** `enableTripAccent` (Trip pack, default ON).

1. A trip with a cover photo tints its status pill (under the top bar) and the Day by day bars with a dark colour from the photo. Trips without a photo keep the standard colour.

**Flag-OFF checks:** `enableTripAccent` OFF: standard colour everywhere.

### Pass
- White text on the pill is readable for light and dark photos.

## FLUTTER-SUMMARY-COLLAPSE — Flutter: collapse Trip numbers

**Flags:** `enableSummaryCollapse` (Trip pack, default ON).

1. Settings > Appearance > Collapse Trip numbers: turn it on. Open a trip's Summary: Trip numbers is folded (the header still shows the total); tap it to expand.
2. Off (default): Trip numbers open as before.

**Flag-OFF checks:** `enableSummaryCollapse` OFF: no switch; a saved choice is ignored.

### Pass
- Folding hides nothing permanently.

## FLUTTER-NUMBERS-TABS — Flutter: Trip numbers with tabs

**Flags:** none (replaces the long stack); the Plan card follows `enableTripBudget` / `enableTripSuggestions`.

1. Summary > Trip numbers (header: title and total on the left, Share summary and Insights icons on the right).
2. Under the Plan and suggestions card: one headline strip (Total · Per person · Top category), then tabs Categories, People, Days, Details. One tab shows at a time with a short fade.
3. Categories: the donut with legend and the top three categories; "Show all N" expands the rest. People: the ring, legend (tap a person to filter Expenses), the bars, and the Groups / Members switch. Days: a bar chart of the last 14 days; tap a bar to read that day. Details: every category and every day as lists.
4. Nothing from the old layout is lost; every number is reachable from a tab or the header icons.
5. The Groups / Members switch is only here: Who pays whom above follows it.

### Pass
- No overflow at 360 px or 200% text; tab chips wrap instead of scrolling.

## FLUTTER-OFFLINE-FEEDBACK — Flutter: bug reports and suggestions offline

**Flags:** `enableOfflineFeedback` (Trip pack, default ON).

1. Signed in, turn on airplane mode. Settings > Help > Report a problem (or Suggest a feature), fill in a title, send. The message says it is saved on this phone and a note shows how many are waiting.
2. Turn the network back on (or reopen the app online): the saved messages are sent by themselves, the note disappears, and the bug gets its case number in "my reports".
3. A message that keeps failing while online is dropped after five tries. Guests (not signed in) still see "Sign in to send".

**Flag-OFF checks:** `enableOfflineFeedback` OFF: offline sending shows the old error and nothing is kept.

### Pass
- Nothing is lost if the app is closed while messages are waiting.

## FLUTTER-SETTLED-CELEBRATION — Flutter: settled celebration

**Flags:** `enableSettledCelebration` (Trip pack, default ON).

1. Settle the last payment on a trip that had expenses: a card "Everyone is square" with a bouncing check and a share button appears at the top, with a success tap.
2. While anything is owed, no card.

**Flag-OFF checks:** `enableSettledCelebration` OFF: only the SETTLED stamp.

## FLUTTER-SETTLE-ROUNDING — Flutter: round down when settling

**Flags:** `enableSettleRounding` (Trip pack, default ON).

1. Settle a payment of, say, 287: the sheet offers "Pay a round amount: 280". Tap it: the amount becomes 280 and "7 remaining" shows; confirm to record 280, the 7 stays owed.
2. A clean amount (280) or one under 20 shows no option. It never rounds up.

**Flag-OFF checks:** `enableSettleRounding` OFF: no option.

## FLUTTER-APP-SHORTCUTS — Flutter: app icon shortcuts

**Flags:** `enableAppShortcuts` (Trip pack, default ON). Android only.

1. Long-press the app icon: Add expense and Latest trip.
2. Latest trip opens the trip happening now, else the next upcoming, else the most recent finished one. Add expense opens that trip's form; back returns to the trip.
3. With no trips, or the flag off, both just open the home screen.

### Pass
- iOS has no shortcuts yet.

## FLUTTER-EXPENSE-HISTORY — Flutter: expense history line

**Flags:** `enableExpenseHistory` (Trip pack, default ON).

1. Open an expense: "Added by Asha, 2 h ago". After a later change, an "Edited 10 min ago" line. Saving again within a minute does not count as an edit.

**Flag-OFF checks:** `enableExpenseHistory` OFF: no history lines. It shows author and times, not a field-by-field list.

## FLUTTER-PENDING-DOTS — Flutter: pending sync dot on trips

**Flags:** `enablePendingDots` (Trip pack, default ON).

1. Make a change offline: that trip's tile (and row) shows a small amber cloud dot. When the change syncs the dot goes.

**Flag-OFF checks:** `enablePendingDots` OFF: no dot.

## FLUTTER-TRIP-TEMPLATES — Flutter: trip templates

**Flags:** `enableTripTemplates` (Trip pack, default ON).

1. Create Trip > Start from a template: Weekend, Road trip or Group stay. Create: the trip has the extra categories (for example Fuel, Tolls, Parking) and a starter checklist you can edit. Tap the chosen chip again to start empty.

**Flag-OFF checks:** `enableTripTemplates` OFF: no template chips.

## FLUTTER-SUMMARY-TWO-PANE — Flutter: Summary two panes

**Flags:** `enableSummaryTwoPane` (Trip pack, default ON).

1. On a tablet or a phone in landscape (content at least 840 px wide): balance, Today card and plan on the left; who pays whom and Trip numbers on the right, each scrolling on its own.
2. A phone in portrait keeps one column.

**Flag-OFF checks:** `enableSummaryTwoPane` OFF: one column everywhere.

## FLUTTER-INVITE-CARD — Flutter: invite picture

**Flags:** `enableInviteCard` (Trip pack, default ON).

1. Trip > Share: "Share invite picture" makes an image with the trip photo, name, dates, join code and a QR code and opens the share sheet. No expenses are on it.

**Flag-OFF checks:** `enableInviteCard` OFF: no button.

## FLUTTER-QUICK-CHIPS — Flutter: Expenses quick filter chips

**Flags:** `enableExpenseQuickFilterChips` (moved from the Pro pack to the Trip pack, now default ON).

1. Expenses tab: a row of one-tap chips (for example Paid by me and the categories in use) above the list; tap to filter, tap again to clear. The Filters button still opens the full sheet.

**Flag-OFF checks:** OFF: no chip row.

## FLUTTER-A11Y-AUDIT — Flutter: accessibility audit

**Flags:** none.

1. With TalkBack on: the trip name reads as a "Switch trip" button; tab chips, legend chips and the Groups / Members switch have 48 px targets; the tour, keypad, receipts and Trip numbers tabs are readable at 200% text.
2. The automated checks (tap targets, labels, contrast, 200% text) run in `test/a11y/a11y_test.dart` for the new screens.

## FLUTTER-PERSONAL-EXPENSES — Flutter: personal expenses, left out of totals

**Flags:** `enableExpenseExclusion` (Trip pack, default ON).

1. Add expense > turn on **Just for me**: the Split section disappears; save. The row shows a small person icon (Personal).
2. Summary: the trip total, per-person average, category and day charts, spend by person, insights and Who pays whom do **not** include it. Nobody owes anything for it.
3. Open any expense you can edit: **Count in trip totals** switch. Turn it off: the expense leaves the totals and settlement (even if it was shared); turn it on: it returns.
4. Swipe an expense row **right**: Personal / Count it, with an UNDO. (Swipe left still deletes.) Edit is in the detail sheet.
5. Expenses tab: the **Personal** chip shows only left-out expenses.
6. Edit a personal expense: the switch is on and the split stays hidden; changing the payer moves the split to the new payer.
7. Another member opens the trip: the expense is still visible to them (only excluded from calculations). An older web app does not know the mark and still counts it.

**Flag-OFF checks:** no Just for me switch, no detail switch, swipe right edits, no Personal chip. Expenses already marked stay out of totals.

### Pass
- Totals before and after turning the switch off/on differ by exactly that expense's amount.

## FLUTTER-UNDO-SETTLEMENT — Flutter: undo a recorded payment

**Flags:** `enableUndoSettlement` (Trip pack, default ON).

1. Summary > Settle > Confirm: the toast has **UNDO** for ~6 seconds. Tap it: the payment goes to the recycle bin and the balances return.
2. Settle all on 2+ payments: the toast has UNDO for all of them.

**Flag-OFF checks:** no UNDO on the toast.

## FLUTTER-SAVED-FILTERS — Flutter: saved expense filters

**Flags:** `enableSavedFilters` (Trip pack, default ON).

1. Expenses tab > apply any filter (search, category, Personal chip...) > **Save filter** chip appears > name it. A bookmark chip appears under the quick filters.
2. Clear filters, then tap the saved chip: the filter returns. Hold the chip: it is removed. Up to eight per trip; same name replaces.
3. Saved filters are on this phone only, and a fixed date range is not saved.

**Flag-OFF checks:** no Save filter chip and no saved chips.

## FLUTTER-CLEAN-TOPBAR — Flutter: clean trip top bar, no banner

**Flags:** `enableCleanTopBar` (Trip pack, default ON); `enableTripHeaderStrip` and `enableTripCoverHeader` (Labs, default OFF).

1. Open a trip. Under the top bar there is **no** photo banner and no status/dates strip: the page starts straight at the tab content.
2. Top bar: back, the trip name (down arrow when you have 2+ trips), the bell and one **More** menu with Share trip, Route map, Trip settings, App settings, Live location. Route map toggles the map panel; Trip settings opens the trip's settings.
3. Go offline or make a change: a small cloud / sync icon appears in the top bar with a tooltip (Offline, Syncing, Sync issue). A stuck sync retries when tapped. When everything is saved the icon is not there.

**Flag-OFF checks:** `enableCleanTopBar` OFF: the older separate Map, Share, menu, bell and Settings buttons. A Superadmin can turn `enableTripHeaderStrip` ON to bring back the status/dates strip with its "All saved" line.

### Pass
- Trip name opens the trip list; every menu action still works.

## FLUTTER-CONTEXT-FAB — Flutter: quick action buttons on Notes and Members

**Flags:** `enableContextFab` (Trip pack, default ON).

1. Notes tab > Checklist: **Add item** button floats bottom right; Notes: **Add note**. Passes has none.
2. Members tab: **Add member** (only if you can manage the trip).
3. The in-page buttons are still there.

**Flag-OFF checks:** no floating buttons.

## FLUTTER-SUMMARY-FOCUS — Flutter: Summary focus mode

**Flags:** `enableSummaryFocus` (Trip pack, default ON).

1. Open Summary: balance, Who pays whom and the next action come first; **Trip numbers** is folded away. Tap its header to open it.
2. Leaving and returning to the page folds it again.

**Flag-OFF checks:** `enableSummaryFocus` OFF: Trip numbers starts open (unless Settings > Collapse Trip numbers is on).

## FLUTTER-JUMP-TODAY — Flutter: jump to today

**Flags:** `enableJumpToToday` (Trip pack, default ON).

1. Expenses with a day group for today: scroll well down. A **Jump to today** chip appears at the top; tap it: today's day opens and scrolls into view; the chip goes.
2. Day headers show each day's total (unchanged).

**Flag-OFF checks:** no chip.

## FLUTTER-QUICK-AMOUNTS — Flutter: quick amount chips

**Flags:** `enableQuickAmounts` (Trip pack, default ON).

1. Add expense with an empty amount: up to four chips with recently used amounts on this trip. Tap one: the amount fills. Once there is an amount, the chips step aside.
2. A foreign currency still shows the converted amount under the field (unchanged).

**Flag-OFF checks:** no chips.

## FLUTTER-COACH-EMPTY — Flutter: friendly empty states

**Flags:** `enableCoachEmptyStates` (Trip pack, default ON).

1. A trip with no checklist items: an illustrated "Your packing list starts here" card. Notes > Notes with no notes: "No notes yet" card with an **Add note** button.

**Flag-OFF checks:** plain text as before.

## FLUTTER-SKELETONS — Flutter: skeleton loaders

**Flags:** `enableSkeletonLoaders` (Trip pack, default ON).

1. Open Summary or Expenses on a slow connection or after a cold start: soft grey blocks pulse briefly instead of a spinner. With Settings > Reduce motion on, they do not pulse.

**Flag-OFF checks:** the spinner.

## FLUTTER-HIGH-CONTRAST — Flutter: high contrast and haptics setting

**Flags:** `enableHighContrast`, `enableHapticsSetting` (Trip pack, default ON).

1. Settings > Appearance > **High contrast**: text turns black (light) or white (dark) and grey text and borders get stronger, on every screen. Off by default.
2. Settings > Appearance > **Haptic feedback**: turns the light taps on saves, swipes, undo, tabs, quick amounts, saved filters and trip switching on or off together.

**Flag-OFF checks:** `enableHighContrast` OFF: no switch. `enableHapticsSetting` OFF: no switch and haptics stay on.

## FLUTTER-SHEET-HANDLES — Flutter: consistent bottom sheets

**Flags:** none.

1. Open the default-currency picker, What's new, the offline snapshot and the route map: each sheet has the same grab handle and rounded top as the rest, and swipes down to close.

## FLUTTER-PAID-LEGEND — Flutter: Who paid labels

**Flags:** none (copy only).

1. Trip numbers > People: a one-line key under the chart: "Bar = money they paid. Their part = their cut of all the costs."
2. Under each person or group: **Their part ₹X** (what they owe of the trip's costs). The bar and the right-hand amount are what they **paid**. Paid minus their part is what they are owed or owe.

## FLUTTER-PAID-VS-SHARE — Flutter: You paid vs your share, balance explainer, saved-offline toast

**Flags:** `enableYouPaidVsShare`, `enableBalanceExplainer`, `enableSavedOfflineToast` (Trip pack, default ON).

1. Open a trip you are on, add an expense of 90 paid by you split 3 ways, go to Summary (Balances). Under the hero there is one strip: **You paid ₹90.00**, **Your share ₹30.00**, **Difference +₹60.00** (green), and "You paid more than your share, so others owe you (before settlements)". The two To receive / To pay tiles are gone.
2. Have someone else pay an expense you share: Difference is negative (red) with the "you owe others" line. Equal paid and share: neutral and "You paid exactly your share".
3. Tap the strip: a sheet "How your balance adds up" lists each expense where paid differs from share, biggest first, with Paid / share and the +/- effect. A trip with no such expense shows "No expenses move your balance yet".
4. Turn on airplane mode, add an expense and save: a message "Saved on this phone. It will sync when you're back online." shows. Online: no message.
5. A viewer who is not on the trip sees no strip and no tiles.

**Flag-OFF checks:** `enableYouPaidVsShare` OFF: the To receive / To pay tiles return, no strip. `enableBalanceExplainer` OFF: the strip shows but is not tappable and has no "Tap to see" line. `enableSavedOfflineToast` OFF: no message when saving offline.

**Pass:** figures match the expense list; the difference is before recorded settlements, so it can differ from the hero after payments.

## FLUTTER-TIDY-TABS — Flutter: tidy Expenses, Notes and Members, edit and delete passes, analytics switch

**Flags:** `enableTidyExpenses`, `enableTidyNotes`, `enableTidyMembers`, `enablePassEditDelete` (Trip pack, default ON).

**Expenses**
1. Open Expenses: each row is a flat bordered tile (category tile, title, "Paid by X · Split with N", amount on the right, "Your share" under it; "Get back" in green when you paid). No glow, perforation or barcode. Day headers are calm: small spaced label, bold day total, count.
2. Collapse or expand a day: the header is a bordered card row with the day label, "N expenses", a large bold day total and a chevron, readable against the page in light and dark. Tap a row, swipe it, search, open Filters: all behave as before. Compact view and the wide table are unchanged.

**Notes**
3. On the Notes and Checklist panes there is exactly one Add control: the floating **Add note** / **Add item** button (no second Add button in the page, and the list scrolls clear of it). With `enableContextFab` OFF the in-page buttons return. The Notes pane label shows a count. Each note is a bordered card with its title, an inline editable body and "Edited 2h ago".
4. Card menu (...) > **Pin to top**: the note moves to the top with a pin icon. **Delete**: the note goes and a snackbar offers **UNDO**, which brings it back.

**Members**
5. Each member is a flat tile with a role chip (Organizer highlighted), the Gmail state, and (with the money-row flag) a green or red balance chip. **Invite** is the filled button, **Add member** the outlined one.
6. With more than 8 active members a **Search members** box filters by name or email.

**Passes**
7. Notes > Passes: each pass card has a (...) menu. **Edit** opens the pass with its values, now with date and time, passenger, seat or room and booking reference. Save, and the card updates; details not shown in the form (booking id, QR, attachment) are kept.
8. **Delete** asks "Delete this pass?"; **Keep** cancels; **Delete** removes it with an **UNDO** snackbar.

**Analytics switch**
9. With groups on the trip, Trip numbers > People > switch Groups / Members: only the Who paid card changes. **Who pays whom** keeps showing group transfers; the Fewest / Per person toggle is unaffected.

**Flag-OFF checks:** `enableTidyExpenses` OFF: boarding-receipt rows with barcode and the old day header. `enableTidyNotes` OFF: plain note cards, no menu, no count. `enableTidyMembers` OFF: tinted tiles, no chips, no search. `enablePassEditDelete` OFF: no (...) menu on passes.

**Pass:** nothing is lost or duplicated on edit, undo restores the exact pass, and the analytics switch never changes the settlement list.

## FLUTTER-SETTINGS-PAGE — Flutter: one-page Settings like the web

**Flags:** `enableSettingsDataHub` (Trip pack, default ON, new). Existing: `enableGeotagging` (default ON), `enableDataSaverMode` (default OFF), `enableDemoSeeding` (default OFF), `enableHapticsSetting` (default ON), `enableFeatureSuggestions`, `enableSettingsSearch`. Test on an Android phone and an iPhone, signed in, with at least one trip that has an expense.

**One page**
1. Me tab (or Trip menu > App settings). Settings is one scrolling page of cards: THIS TRIP, APPEARANCE, NOTIFICATIONS, DATA, HELP & ABOUT, ACCOUNT. Rows have a tinted icon, title, subtitle and a switch, segmented control, badge or chevron at the right. Rows are separated by thin lines. No category drill-in rows remain except "More display options", "Backups" and "About & Legal".

**This Trip** (only when you have a trip)
2. The card is for the trip happening now, else the next one, else the latest. **Invite & Share Trip** opens the invite sheet; **Trip Tools** opens the tools sheet; **Trip settings** opens that trip's settings; **Live location** opens the 12-hour share sheet.
3. **Close Trip** shows "<symbol><amount> still unsettled" (or "Everything is settled") and opens the close-out sheet. It is hidden once the trip is closed.
4. **Geotag expenses**: switch on, leave the page and come back: still on. It only stores your choice on this phone for now; expenses do not get a place yet.

**Appearance**
5. **Appearance** has Light, Dark and Auto icons: tapping one changes the theme at once, and the subtitle follows ("Light", "Dark", "Follows your phone").
6. **Haptics** has All, Important and Off. All: every tap vibrates. Important: save, settle, delete and warnings vibrate, tab switches and menu taps are silent. Off: nothing vibrates. Close and reopen the app: the choice stays. A phone that had haptics switched off before the update starts on Off.
7. **More display options** opens Pure black, High contrast, Reduce motion, Collapse Trip numbers, Sound feedback and Default currency, as before.

**Notifications**
8. **Notifications** shows "N unread" (or "All caught up") and opens the inbox. **Notification preferences** and **Travel pass reminders** work as before.

**Data**
9. **Data saver** (needs `enableDataSaverMode`): switch persists. It only stores your choice for now.
10. **Storage and Data**: the badge shows total size; the page shows data and cache sizes. **Clear cache** asks first; after Clear the cache size drops and trips and expenses are untouched.
11. **Archived Trips**: subtitle counts archived trips. Restore (undo arrow) returns a trip to the list at once. The trash icon appears only on trips you own, asks first, and removes the trip for everyone.
12. **Backups** opens Export backup and Restore backup (unchanged behaviour).

**Help & About**
13. **Report a Problem**, **Suggest a Feature** (needs `enableFeatureSuggestions`) and **Diagnostics** open as before. **Seed Demo Trip** (needs `enableDemoSeeding`) adds "Goa Weekend (Demo)" with 3 members and 4 expenses; tapping it again adds another copy.
14. **About & Legal** shows "Version x.y.z (build)" and opens What's new, Privacy Policy and Terms.

**Account**
15. **Sign Out** and **Delete Account** are red cards. Sign Out asks first; Delete Account opens the existing delete flow.

**Search:** with `enableSettingsSearch` on, typing "currency", "haptics" or "storage" lists those rows in place.

**Flag-OFF checks:** `enableSettingsDataHub` OFF: Storage and Data and Archived Trips are gone (Backups stays; archived trips are still in the Trips list's folded section). `enableGeotagging` OFF: no Geotag row. `enableDataSaverMode` OFF: no Data saver row. `enableDemoSeeding` OFF: no Seed Demo Trip. `enableHapticsSetting` OFF: no Haptics row and haptics stay on every tap.

**Pass:** every old setting is still reachable, switches survive an app restart, nothing is deleted without a confirmation, and every row is easy to tap (48dp) in light and dark.

## FLUTTER-HEADER-SUMMARY — Flutter: trip header actions, edit trip, Summary upgrades

**Flags:** `enableTripHeaderActions` and `enableSummaryUpgrades` (Trip pack, both default ON, new). Existing: `enableTripCloseout`, `enableExpenseDisputes`. Prep: a trip you own whose end date has passed, with at least one expense where someone owes money, and a second trip you do not own.

**Header**
1. Open the trip. Under the top bar the header shows the status pill, the dates, a sync line and a chip "N members · N expenses" (settlements and bin items do not count).
2. Long-press the trip name. A sheet opens headed by the name and "dates · N members · N expenses", with **Share Trip & QR Code**, **Mute Trip Alerts**, **Edit Trip Details**, **Settings** and, if you have another trip, **Switch to Another Trip**. Tap the name briefly (with 2+ trips): the old switcher list still opens.
3. **Share**: the invite sheet opens. **Mute**: the row flips to "Unmute Trip Alerts"; reopen the sheet to confirm; Trip settings shows the same switch. **Settings**: opens the app settings. **Switch**: opens the trip list sheet.
4. **Edit Trip Details** (owner only): a popup with Trip name, Destination (suggestions as in New Trip) and Dates. Change the name, tap **Update Trip**: the header and Trips list show the new name at once. Clearing the name shows "Give the trip a name". **Cancel** changes nothing. Dates: pick a new range, Update: the dates change everywhere. Sign in on a second device: the change arrives after sync.
5. On the trip you do not own: the sheet has no Edit Trip Details row.
6. Open the route map (More menu > Route map) on a trip with stops: a "N stops" pill sits at the top left of the map; tapping it lists the stops, choosing one opens the full route.

**Summary**
7. Open the Summary tab. At the top: chips for "You owe · settle up" or "You're owed · see who", disputes, pending invites and **Close out trip**, and, because the trip dates have ended with money unsettled, a banner "Trip dates ended — close out remaining balances". Tapping the banner or Close out trip opens the close-out sheet; the You owe / You're owed chips open the payments list.
8. Under "Who pays whom": **How it works** opens a sheet explaining Simplified and Per person (with the payment counts).
9. On each payment card: **Custom amount** opens Settle with the amount selected, ready to type a smaller amount (it records a partial settlement as before). **Remind** appears only when someone else owes (not on your own payments); it opens the phone share sheet with "Hi <name>, a gentle reminder: you owe <name> <amount> for "<trip>"...". Nothing is sent unless you pick an app and send it.
10. Open **Trip numbers**: the first thing is a 2x2 **At a Glance** grid: Total spent, Per-head cost, Top category, Biggest spender.

**Flag-OFF checks:** `enableTripHeaderActions` OFF: no chip, long-press does nothing, no stops pill (the old header strip flag still decides if the strip shows). `enableSummaryUpgrades` OFF: no chips or banner at the top, no How it works, Custom amount or Remind, no At a Glance grid; Settle, Settle all and the toggle work as before.

**Pass:** no balance or settlement number changes; every new control is at least 48dp and readable at large text and in dark mode; Remind never sends anything by itself; non-owners cannot edit a trip.

## FLUTTER-UI-ROUND3 — Flutter: clean header, pass multi-select, filters page, mini pass, voice

**Flags:** `enableTripHeaderActions` (header + Edit Trip), `enableSummaryUpgrades` (mini pass), `enablePassEditDelete` (Select), `enableVoiceInput` (Voice). All Trip pack, default ON.

1. Open a trip. The top bar is one row (back, trip name with a small chevron, bell, menu). Under the name is one muted line: dates, members, expenses, with a status dot (green active, blue upcoming, grey ended). There is no photo strip.
2. Tap the trip name: the actions sheet opens (Share, Mute, **Edit Trip Details**, Settings, Switch to Another Trip when you have more than one). Edit Trip Details renames the trip and keeps its dates.
3. Open the top-bar menu: **Edit trip details** is listed there too. Sign in as a non-owner: the row shows greyed with "Only the organizer can edit".
4. Notes > Passes (two or more passes): tap **Select**. Tick some passes, tap **Select all** (then **Clear**), tap the bin, confirm "Delete N passes?". All chosen passes go in one save and one **Undo** brings them back. **Cancel** leaves select mode.
5. Expenses > Filters: green header with a close button; sections My expenses, Category, Paid by, Date range (two fields), Amount range; footer **Clear all** and **Show N expenses** pinned. The count updates as you pick.
6. Summary: scroll down past the balance card. A slim pass appears under the top bar with the route, days and stops, and OUTSTANDING (or SETTLED) with the amount. Tap it to jump back to the top.
7. Expenses: tap the red **Voice** pill, allow the microphone, say "500 lunch at the dhaba". The words appear live and the amount and category are filled in for you to confirm before saving. Needs the phone's speech service and a connection on Android.

**Flag-OFF checks:** `enableTripHeaderActions` OFF restores the old title and strip, no Edit Trip entries. `enableSummaryUpgrades` OFF: no mini pass. `enablePassEditDelete` OFF: no Select. `enableVoiceInput` OFF: no Voice pill and no mic in Quick Add.

**Pass:** no money numbers change; mic permission is asked only after tapping Voice; every control is at least 48dp.

**Settlement pass flip (same section, `enableSummaryUpgrades` + `enableYouPaidVsShare`):**
8. Summary: the pass has a small "↻ Your share" chip top right and the separate You paid / Your share card is gone. Tap anywhere on the pass: it turns over to show **You paid**, **Your share**, **Difference** (green if owed to you, red if you owe) and the reason. **Settlement pass** chip is on the back; tap again to turn back.
9. On the back, tap **How your balance adds up**: the breakdown sheet opens.
10. Not a trip member: the pass does not flip. Reduce motion on: faces swap without the turn.

**Flag-OFF:** `enableSummaryUpgrades` OFF brings the old You paid / Your share card back and the pass does not flip.

**Voice and Edit Trip follow-ups (same section):**
11. Edit Trip: the destination is one box per place. **Add destination** adds a box, the minus button removes one (not shown when only one is left). Save joins them as "Goa, Gokarna, Hampi"; reopening shows one box each.
12. Voice: tap **Voice**, allow the mic. A "Listening…" panel with a progress bar shows the words as you speak. Say "five hundred rupees lunch" or "paanch sau chai": the preview shows 500. If speech is not available or nothing is heard, a plain message and **Try again** appear. The phone needs Google speech services (and a connection on most phones).

**Settled in both views, clearer header, confirm on history (same section):**
13. Summary > Who pays whom: settle everything using **Fewest payments**, then switch to **Per person**. The pass stays **SETTLED** with all square in both views, the amount on the pass and the mini pass is the same in both, and Members shows nobody owed or owing. (Before the fix Per person showed leftover payments and NOT SETTLED.)
14. The trip header line (dates, members, expenses) is a clear 12.5pt body font with even spacing, readable in light and dark.
15. Once the trip is settled, the yellow close-out card near the top of Summary is gone (it still shows while payments are left). History: a settlement paid to you shows a **Confirm received** button on its row (needs `enableSettlementConfirmation`); everyone else sees "Awaiting confirmation" until the recipient confirms. Opening the row also has Confirm payment received.

## CI-ANDROID-APK — Automatic Android APK from main

**Flags:** none (infrastructure). Needs the repo secrets `FLUTTER_DEV_ENV_JSON_B64` and `ANDROID_SIDELOAD_KEYSTORE_B64`.

1. Push a change under `flutter_app/` to `main` (or run **Android APK (latest)** from the Actions tab). Wait for **Flutter CI** to go green; **Android APK (latest)** then starts by itself.
2. Open Releases: the **android-latest** pre-release now carries `trip-tracker-dev-vX.Y.Z-<sha>.apk` and says which commit it came from.
3. On the phone, download and install it over **Trip Tracker (Dev)**. It updates in place (no uninstall) and you stay signed in.
4. A red Flutter CI run must **not** produce a new release.

**Pass:** the installed app shows the new version and works against the same data as the web app.

## PTR-SCROLL — Scrolling no longer triggers pull-to-refresh

**Version:** 3.69.1 · **Flags:** none (bug fix) · **Device:** phone or touch emulation.

1. Open a trip with enough expenses to scroll, on the Expenses tab.
2. Scroll down quickly to Settlements at the bottom. Pass: no refresh indicator appears.
3. Flick back up to the top in one swipe. Pass: no refresh indicator, no refresh.
4. Scroll to the top, wait about half a second, then pull down about 150px slowly. Pass: indicator appears and expenses refresh on release.
5. Pull down only about 40px and release. Pass: indicator springs back, no refresh.
6. Pull diagonally. Pass: no refresh.
7. Repeat steps 4 and 5 on the Trips list. Pass: same behavior.

## CONFLICT-DIFF — Sync conflict sheet shows what changed

**Version:** unreleased · **Flags:** none (UX fix on an existing surface) · **Device:** two devices, or one phone plus the web app, on the same trip.

1. On device A, go offline and change an expense's amount (say 90 to 60) and its category.
2. On device B, change the same expense's amount (90 to 40) and who paid, then let it sync.
3. Bring device A online, open the trip, then open the sync conflict sheet (Ledger or Expenses banner).
4. Pass: only the changed fields are listed (Amount, Category, Paid by), bold on a yellow tint, with "On this phone" and "On the server" columns. A line reads "3 other fields are the same" for Date, Title and Split.
5. Pass: **Keep mine** and **Keep theirs** look identical in weight; neither is pre-emphasised.
6. Tap **Keep theirs**. Pass: the expense shows the server values and the conflict disappears. Repeat with **Keep mine** on a second conflict. Pass: local values stay and the conflict disappears.
7. Pass: the sentence "<title> changed on another device…" no longer appears under each expense title; only the sheet intro does.

**Negative checks:** an expense with no conflict never shows the sheet ("No conflicts to resolve." if opened directly). Nothing in Settings or the Ops Deck changes.

## SAVE-ADD-ANOTHER — Save and add another on the new-expense form

**Version:** unreleased · **Flags:** `enableSaveAndAddAnother` (Trip pack, default ON; Ops Deck → Flags). Related, already shipped: `enableSmartExpenseDefaults`, `enableRememberDefaultSplit`.

1. Open a trip, tap add expense. Pass: a **Save** button and, under it, a lighter **Save and add another** button.
2. Enter amount 100 and title "Breakfast", tap **Save and add another**. Pass: a brief "Saved. Add the next one." message, the form stays open with empty title and amount, and the amount field has the cursor.
3. Enter 60 and "Taxi", tap **Save**. Pass: the form closes and both Breakfast and Taxi are in Expenses, each with its own amount.
4. With the smart-defaults flags ON, pick a different payer and category before step 2. Pass: after **Save and add another** the next form starts from that payer and category (and the same split).
5. Enter a repeat of the expense you just saved (same title, amount, date) and save. Pass: the duplicate warning appears.
6. Open an existing expense to edit. Pass: no **Save and add another** button.
7. Open a fresh new-expense form and tap **Save and add another** without typing anything. Pass: a red strip directly above the buttons says "First add an expense." and nothing is saved. Type a digit. Pass: the strip disappears.
7b. Type a title but no amount and tap **Save and add another** (or plain **Save**), with the keyboard open. Pass: "Please enter a valid amount greater than 0." shows in the same strip above the buttons, in view without scrolling.
7c. After a successful **Save and add another**, pass: a green "Saved. Add the next one." line appears above the buttons for about 3 seconds, and **Save and add another** stays fully visible and tappable (no snackbar over it).
8. Go offline and repeat step 2. Pass: it saves on the phone and the form still resets; the items sync when back online.

**Flag-OFF negative check:** turn `enableSaveAndAddAnother` OFF. Pass: the new-expense form shows only **Save**, and Save closes the form as before. Existing expenses, splits and sync are unchanged either way.

## UX-BATCH-4 — Balance bars, deck quick add, receipt empty action, icon labels

**Version:** unreleased · **Flags:** `enableBalanceBars`, `enableTripCardQuickAdd` (both Trip pack, default ON); the receipt button rides the existing `enableReceiptGallery`. `enableTripCardQuickAdd` needs `enableTripCardStack` ON.

**Balance bars**
1. Open a trip where one person paid and others owe (say Asha paid 90, three-way equal). Open Summary, then the **Who pays whom** section. Pass: above the transfer rows, **Who is up, who is down** lists everyone with a balance. Asha has a green bar going right of the centre line; Ben and Cara have equal red bars going left; amounts on the right; the longest bar belongs to the biggest balance.
2. Settle everything. Pass: the bars disappear with the transfers ("All settled").
3. Turn on TalkBack or VoiceOver. Pass: each row reads as one sentence, e.g. "Ben owes ₹30.00".
4. Turn `enableBalanceBars` OFF. Pass: only the transfer rows remain; balances and Settle buttons behave as before.

**Deck quick add**
5. On the Trips screen in card view, look under the top card. Pass: an **Add expense** button sits right under the card, above the Join / New Trip dock and fully tappable (the dock does not cover it).
6. Tap it. Pass: the new-expense form opens for the trip on top. Save, then go back. Pass: you land on the Trips deck.
7. Swipe to an archived or closed trip. Pass: the button is gone; swipe back and it returns.
8. Swiping, tap-to-open and long-press still work exactly as before.
9. Turn `enableTripCardQuickAdd` OFF. Pass: no button, the card is taller; list and grid views are unchanged either way.

**Receipt gallery empty state**
10. Open Receipts on a trip with no receipt photos. Pass: the empty message has an **Add expense** button that opens the new-expense form.

**Icon labels**
11. With TalkBack or VoiceOver, focus the back arrow on Insights and the close button on the UPI payment sheet. Pass: they announce "Back" and "Close".

## COMPASS — Trip dock + Trip hub, Spend header, balance bars, storage card, web Settle-up pane

**Version:** unreleased · **Flags (all default ON):** `enableCompassNav` (Core), `enableCompassSpend` (Trip), `enableCompassMoney` (Trip), `enableCompassMe` (Core), `enableCompassWeb` (Core). Design: `docs/compass-redesign-plan.md`. Login and the Trips home layout are intentionally unchanged. Turn a flag OFF in Ops Deck → Flags (or Settings → Flag overrides on dev builds) for the negative checks.

**Trip bottom bar and Trip hub (`enableCompassNav`)**
1. Open any trip on a phone. Pass: the bottom bar reads **Spend, Balances, [orange +], Chat, Trip**, every label always visible, the current one teal with a small bar above its icon. The old floating **Add expense** button is gone.
2. Tap the orange **+**. Pass: the Quick add / full form chooser opens (or the full form when Quick add speed dial is OFF), exactly as the old button did.
3. Tap **Trip**. Pass: a cover with the trip name and a grid: **Members, Notes** (only if Notes is on), **Receipts, Insights** (only if Spend insights is on), **Invite, Live location, Tools, Trip settings**. Each tile opens what it says.
4. Tap **Members**. Pass: the People page opens and **Trip** stays the lit item. Swipe sideways: pages move Spend, Balances, Chat, Trip, People, Notes in that order.
5. Open an old link or notification for `/trip/<id>/notes` and `/trip/<id>/members`. Pass: they still open, with **Trip** lit.
6. Open a trip from the Trips list. Pass: it opens on Balances (who owes what), as before.
7. On the Trips home, look at the bottom bar. Pass: **Trips, Wallet, Activity, Me** with the orange + in the middle; Wallet opens the cross-trip balances. Layout of the Trips screen itself is unchanged.
8. Switch to dark mode and to AMOLED. Pass: bar, orange button and hub are readable; the orange + has dark text-on-orange contrast.
9. Turn OFF Trip Group Chat (`enableTripChat`). Pass: the trip bar shows **Spend, Balances, +, Trip** (no Chat).

**Spend header (`enableCompassSpend`)**
10. Open Spend (Expenses) on a trip with expenses. Pass: a **Total spent** card sits above the search row with the total, **Per person**, and an orange pill like "Stay 38%"; each expense row has a category-coloured ring. Pass: no budget bar anywhere.
11. Add an expense. Pass: total and percentage update.

**Balance bars (`enableCompassMoney`)**
12. Open Balances (Summary) on a trip where people owe each other. Pass: the **who is up, who is down** bars show even when the separate Balance Bars flag is OFF.

**Storage card (`enableCompassMe`)**
13. Settings → Storage and Data. Pass: a card at the top shows the device total with a teal/orange split bar and "Data … · Cache …"; the two lists below are unchanged.

**Web settle-up pane (`enableCompassWeb`)**
14. Open the Flutter web app in a window at least 1280px wide, open a trip's Spend tab. Pass: a 300px **Settle up** pane on the right lists who pays whom with amounts; tapping a row opens Balances. Narrow the window below 1280px. Pass: the pane disappears; phones never show it.

**Flag-OFF negative checks:** turn `enableCompassNav` OFF: the old tab bar (Summary/Expenses/Members/Notes per your other flags), floating Add button and old home bar return; no Trip hub. Turn `enableCompassSpend`, `enableCompassMoney`, `enableCompassMe`, `enableCompassWeb` OFF one at a time: the header card, forced bars, storage card and right pane each disappear and nothing else changes. No data, balance or setting changes in any case.

**Pass criteria:** steps 1 to 14 pass in light, dark and AMOLED, at text size 130%, with TalkBack/VoiceOver reading each bar item as "<label>, button" and the orange + as "Add expense".

## TRIP-GET-STARTED — Get this trip rolling: start card on a blank trip

**Version:** unreleased · **Flag:** `enableTripGetStarted` (Trip pack, default ON).

1. Create a new trip and open it. Pass: Summary shows **Get this trip rolling** with two cards, **Invite your group** and **Add your first expense**. No boarding pass, no who-pays-whom, no balance bars, no settled/celebration banners.
2. Open the Expenses tab on the same trip. Pass: the same start card (not an empty list with search and filters).
3. Tap **Share invite link**. Pass: the system share sheet opens with the text "Join my trip "<name>" on Trip Tracker: <link> (code XXXXXX)".
4. Tap **Copy link**. Pass: "Invite link copied" appears; pasting elsewhere gives the join link.
5. Tap **Code and QR**. Pass: the invite sheet opens with the code and QR.
6. Tap **Add expense**. Pass: the Quick add / full form chooser (or the full form) opens. Save one expense and go back. Pass: Summary and Expenses now show the normal screens, and the start card never returns, even if the expense is later deleted and others remain.
7. Delete the only expense (move it to the bin). Pass: the start card returns, since the trip is blank again. Recording a settlement alone does not count as an expense.
8. Join the trip from a second account. Pass: the card says "2 travelers so far".
9. Check light, dark and text size 130%. Pass: buttons wrap, nothing is clipped. With `enableCompassNav` ON the Add button is orange.

**Flag-OFF negative check:** turn `enableTripGetStarted` OFF. Pass: a blank trip shows the previous Summary and Expenses screens. Trips with expenses look the same either way.

