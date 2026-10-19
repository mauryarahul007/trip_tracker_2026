# Feature Parity Matrix

**Baseline Date:** 2026-10-06  
**Status:** Frozen for Migration  
**Scope Tiers:**
- **Tier 1 (T1)**: Core & Trip packs — Required for first store release.
- **Tier 2 (T2)**: Travel pack — Required before sunsetting Capacitor.
- **Tier 3 (T3)**: Pro pack — Post-launch iterative rollout.
- **Tier 4 (T4)**: Labs pack — Experimental (ships only if flag is ON in production).
- **Out of Scope (out)**: Ops Deck / Superadmin screens remain web-only (ADR D8).

---

## 1. Routes & Shell Architecture

| Web Route / Surface | Web Source File(s) | Feature Flag Key | Pack | Tier | Flutter Phase | Status | Test-Steps Anchor in `FEATURE_TEST_STEPS.md` |
|---|---|---|---|---|---|---|---|
| `/login` | `src/components/LoginScreen.tsx` | `boardingPassLogin` | `core` | T1 | Phase 6 | `partial` (tests only; Google/Apple need client IDs; no on-device run) | `## FEAT-BOARDINGPASS` |
| `/reset-password` | `src/components/ResetPasswordModal.tsx` | `(none - core)` | `core` | T1 | Phase 6 | `partial` (tests only) | `## Shared prep` |
| `/delete-account` | `src/components/DeleteAccountModal.tsx` | `(none - core)` | `core` | T1 | Phase 6 | `partial` (calls delete_own_account; unverified against staging) | `## Shared prep` |
| `/join/:code` | `src/components/JoinTripPreviewModal.tsx` | `enableInviteConversion` | `core` | T1 | Phase 6 | `partial` (tests only; universal links need domain) | `## FEAT-GROWTH2` |
| `/share/:token` | `src/components/TripShareView.tsx` | `enableTripShareLink` | `core` | T1 | Phase 6 | `partial` (tests only) | `## FEAT-078` |
| `/live/:token` | `src/components/LiveLocationShareModal.tsx` | `enableLiveLocationShare` | `travel` | T2 | Phase 9 | `done` | Phase 9B shipped in ADR 269 (`LiveScreen`, `/live/:token`) |
| App Shell / Router | `src/App.tsx`, `src/components/NavTabs.tsx` | `enableTabBackHistory`, `enableDeepLinkedTabs` | `core` | T1 | Phase 2, 6 | `partial` | `## Navigation, dialogs & sync UX pass` |
| Bottom Nav Tabs | `src/components/NavTabs.tsx`, `src/utils/tripTabs.ts` | `enableChatFirstNav` | `trip` | T1 | Phase 2, 6, 8 | `partial` (expenses, ledger, members, notes, and chat-first chat are built; settings built in Phase 10) | `## FLUTTER-P8` |

---

## 2. Core Pack (Tier 1: Store Launch Gate)

| Feature / Screen | Web Source File(s) | Feature Flag Key | Pack | Tier | Flutter Phase | Status | Test-Steps Anchor in `FEATURE_TEST_STEPS.md` |
|---|---|---|---|---|---|---|---|
| Trips List & Stack | `src/components/TripsListScreen.tsx`, `TripStack.tsx` | `enableMotionPolish` | `core` | T1 | Phase 6 | `partial` (list + Hero, no 3D stack) | `## UX-MOTION` |
| Quick Trip Creation | `src/components/NewTripModal.tsx` | `enableQuickTripCreate` | `core` | T1 | Phase 6 | `partial` | `## UX-POLISH3` |
| Destination Suggest | `src/components/DestinationAutocomplete.tsx` | `enableDestinationAutocomplete` | `core` | T1 | Phase 6 | `todo` | `## DEST-SUGGEST` |
| Destination Covers | `src/components/TripStack.tsx` | `cycleDestinationCovers` | `core` | T1 | Phase 6 | `todo` | `## FEAT-COVER-CYCLE` |
| Traveler Pass Back | `src/components/TravelPassHeroCard.tsx` | `enableTravelerPassBack` | `core` | T1 | Phase 6 | `todo` | `## PASS-STUB-SIMPLIFY` |
| Predictive Chips | `src/components/ExpenseForm.tsx` | `enablePredictiveChips` | `core` | T1 | Phase 7 | `done` | `## FLUTTER-P7-FORM-LEDGER` |
| Expense Recycle Bin | `src/components/RecycleBinModal.tsx` | `enableRecycleBin` | `core` | T1 | Phase 7 | `done` | `## FLUTTER-P7-EXPENSES` |
| Duplicate Detector | `src/components/DuplicateExpenseModal.tsx` | `enableDuplicateDetector` | `core` | T1 | Phase 7 | `done` | `## FLUTTER-P7-FORM-LEDGER` |
| Explain This Number | `src/components/ExplainNumberModal.tsx` | `enableExplainThisNumber` | `core` | T1 | Phase 7 | `done` | `## FLUTTER-P7-FORM-LEDGER` |
| Clone Last Expense | `src/components/ExpenseForm.tsx` | `enableCloneLastExpense` | `core` | T1 | Phase 7 | `done` | `## FLUTTER-P7-FORM-LEDGER` |
| Remember Default Split | `src/components/ExpenseForm.tsx` | `enableRememberDefaultSplit` | `core` | T1 | Phase 7 | `done` | `## FLUTTER-P7-FORM-LEDGER` |
| Persistent Draft | `src/components/ExpenseForm.tsx` | `enablePersistentExpenseDraft` | `core` | T1 | Phase 7 | `done` | `## FLUTTER-P7-FORM-LEDGER` |
| Trip Closeout | `src/components/TripCloseoutModal.tsx` | `enableTripCloseout` | `core` | T1 | Phase 7 | `done` | `## FLUTTER-P7-LOOP` |
| WhatsApp Share | `src/components/BalancesSettlements.tsx` | `enableWhatsAppSettlementShare` | `core` | T1 | Phase 7 | `done` | `## FLUTTER-P7-LOOP` |
| UPI Payments | `src/components/UpiPaymentModal.tsx` | `enableUpiPayments` | `core` | T1 | Phase 7 | `done` | `## FLUTTER-P7-LOOP` |
| Contact Invite | `src/components/ContactInviteModal.tsx` | `enableContactInvite` | `core` | T1 | Phase 8 | `deferred` (B-038; invite reuses the share sheet) | `## FLUTTER-P8` |
| Clone Trip Squad | `src/components/NewTripModal.tsx` | `enableCloneTripSquad` | `core` | T1 | Phase 6 | `todo` | `## FEAT-LIGHTLOOP` |
| Extended Undo | `src/components/UndoToasts.tsx` | `enableExtendedUndo` | `core` | T1 | Phase 2 | `todo` | `## Navigation, dialogs & sync UX pass` |
| Notes/Pack/Pass IA | `src/components/ChecklistNotesTab.tsx` | `enableNotesTalkPackPass` | `core` | T1 | Phase 8 | `partial` (one Notes tab: checklist, notes, quiet chat, manual passes) | `## FLUTTER-P8` |
| Progressive Next Up | `src/components/NextUpTravelCapsule.tsx` | `enableProgressiveNextUp` | `core` | T1 | Phase 9 | `done` | Phase 9D shipped in ADR 271 (`NextUpTravelCapsule`) |
| Compact Summary | `src/components/TripSummaryCard.tsx` | `enableCompactSummary` | `core` | T1 | Phase 7 | `done` | `## FLUTTER-P7-LOOP` |
| Compact Expense Form | `src/components/ExpenseForm.tsx` | `enableCompactExpenseForm` | `core` | T1 | Phase 7 | `done` | `## FLUTTER-P7-FORM-LEDGER` |
| Calm Haptics | `src/utils/haptics.ts` | `enableCalmHaptics` | `core` | T1 | Phase 2 | `todo` | `## UX-POLISH3` |
| Trip Wrapped | `src/components/TripWrappedModal.tsx` | `enableTripWrapped` | `core` | T1 | Phase 9 | `done` | Phase 9D shipped in ADR 271 (`trip_wrapped_service`, `TripWrappedModal`) |
| Sticky Day Headers | `src/components/ExpenseList.tsx` | `enableStickyDayHeaders` | `core` | T1 | Phase 7 | `done` | `## FLUTTER-P7-LOOP` |
| Category Glow Rings | `src/components/ExpenseList.tsx` | `enableCategoryColorRings` | `core` | T1 | Phase 7 | `done` | `## FLUTTER-P7-LOOP` |
| Compact Ledger View | `src/components/BalancesSettlements.tsx` | `enableCompactLedgerView` | `core` | T1 | Phase 7 | `done` | `## FLUTTER-P7-LOOP` |

---

## 3. Trip Pack (Tier 1: On the Road)

| Feature / Screen | Web Source File(s) | Feature Flag Key | Pack | Tier | Flutter Phase | Status | Test-Steps Anchor in `FEATURE_TEST_STEPS.md` |
|---|---|---|---|---|---|---|---|
| Member Money Row | `src/components/MembersGroupsTab.tsx` | `enableMemberMoneyRow` | `trip` | T1 | Phase 8 | `partial` (balance line on the roster; widget-tested) | `## FLUTTER-P8` |
| Notification Groups | `src/components/NotificationsPanel.tsx`| `enableNotificationGrouping` | `trip` | T1 | Phase 10| `done` (P10 slice A; headless only) | `## UX-POLISH3` |
| Voice Expense Input | `src/components/VoiceExpenseModal.tsx` | `enableVoiceInput` | `trip` | T1 | Phase 9 | `done` | Phase 9C shipped in ADR 270 (`speech_recognition_gateway`, mic button in `QuickAddSheet`) |
| Receipt Image Upload | `src/components/ReceiptModal.tsx` | `enableReceiptUpload` | `trip` | T1 | Phase 7 | `done` | `## FLUTTER-P7-LOOP` |
| Notes & Checklist | `src/components/ChecklistNotesTab.tsx` | `enableNotesAndChecklist` | `trip` | T1 | Phase 8 | `partial` (collab RPC; cursor kept while typing) | `## FLUTTER-P8` |
| Realtime Trip Chat | `src/components/TripChatPanel.tsx` | `enableTripChat` | `trip` | T1 | Phase 8 | `partial` (text, day groups, local unread; voice/media later) | `## FLUTTER-P8` |
| Packing Assistant | `src/components/SmartPackingAssistantModal.tsx` | `enablePackingAssistant` | `trip` | T1 | Phase 8 | `partial` (adds the existing suggestion list; not the full modal) | `## FLUTTER-P8` |
| Geotagging | `src/components/ExpenseForm.tsx` | `enableGeotagging` | `trip` | T1 | Phase 9 | `deferred` | Phase 9 (B-064) |
| Location Search | `src/services/placeSuggest.ts` | `enableAdvancedLocationSearch` | `trip` | T1 | Phase 9 | `done` (gazetteer + Photon API) | `## FLUTTER-P9-MAPS` |
| Currency FX Overrides| `src/components/FxRatesModal.tsx` | `enableCurrencyFx` | `trip` | T1 | Phase 7 | `done` | `## FLUTTER-P7-LOOP` |
| Expense Photo Link | `src/components/ExpenseForm.tsx` | `enableExpensePhotoLinking` | `trip` | T1 | Phase 7 | `todo` | `## FEAT-076` |
| Expense Disputes | `src/components/DisputeModal.tsx` | `enableExpenseDisputes` | `trip` | T1 | Phase 7 | `done` | `## FLUTTER-P7-EXPENSES` |
| Digest Notifications| `src/components/DigestSettingsModal.tsx`| `enableDigestNotifications` | `trip` | T1 | Phase 10| `done` (P10; headless only, server prefs unverified) | `## FEAT-078` |
| Member Last Seen | `src/components/TripChatPanel.tsx` | `enableMemberLastSeen` | `trip` | T1 | Phase 8 | `deferred` | B-089 |

---

## 4. Travel Pack (Tier 2: Capacitor Deprecation Gate)

| Feature / Screen | Web Source File(s) | Feature Flag Key | Pack | Tier | Flutter Phase | Status | Test-Steps Anchor in `FEATURE_TEST_STEPS.md` |
|---|---|---|---|---|---|---|---|
| Travel Passes Wallet | `src/components/TravelPassWalletView.tsx`| `enableTravelPasses` | `travel` | T2 | Phase 8, 9 | `partial` (manual flight/train/hotel; scanner, PDF, vault later) | `## FLUTTER-P8` |
| Next Up Capsule | `src/components/NextUpTravelCapsule.tsx` | `enableNextUpCapsule` | `travel` | T2 | Phase 9 | `done` | Phase 9D shipped in ADR 271 (`next_up_capsule`, `NextUpTravelCapsule`) |
| Boarding Gate Scanner | `src/components/PassScanModal.tsx` | `enableGateScanner` | `travel` | T2 | Phase 9 | `done` | Phase 9D shipped in ADR 271 (`pass_scanner_modal`, `PassScannerModal`) |
| Flight Radar Status | `src/components/FlightTrackerModal.tsx` | `enableFlightRadar` | `travel` | T2 | Phase 9 | `done` (flight modal, IATA/ICAO mapping, radar portal links, train PNR status) | `## FLUTTER-P9-STATUS` |
| Itinerary Route Stops | `src/components/TripJourneyMap.tsx` | `enableRouteStops` | `travel` | T2 | Phase 9 | `done` (route stops modal, collab sync, journey map) | `## FLUTTER-P9-MAPS` |
| Calendar ICS Export | `src/utils/icsExport.ts` | `enableIcsExport` | `travel` | T2 | Phase 9 | `done` | Phase 9D shipped in ADR 271 (`ics_export_service`, `shareTripIcs`) |
| Offline Map Tiles | `src/components/TripMapHero.tsx` | `enableOfflineMapTiles` | `travel` | T2 | Phase 9 | `todo` | `## FEAT-076` |
| Live Location Share | `src/components/LiveLocationShareModal.tsx`| `enableLiveLocationShare` | `travel` | T2 | Phase 9 | `done` (GeolocatorLocationGateway, 60s heartbeat, live viewer screen, chat radar banner) | `## FLUTTER-P9-LIVE` |
| Map Collapsed Default| `src/components/TripContentSheet.tsx` | `enableMapCollapsedByDefault` | `travel` | T2 | Phase 9 | `done` (collapsible hero, deferred render) | `## FLUTTER-P9-MAPS` |

---

## 5. Pro Pack (Tier 3: Post-Launch Increments)

| Feature / Screen | Web Source File(s) | Feature Flag Key | Pack | Tier | Flutter Phase | Status | Test-Steps Anchor in `FEATURE_TEST_STEPS.md` |
|---|---|---|---|---|---|---|---|
| Weather Nudges | `src/services/weatherService.ts` | `enableWeatherItineraryNudges` | `pro` | T3 | Phase 9 | `done` | Phase 9C shipped in ADR 270 (`weather_service`, `WeatherBadge` in checklist/notes) |
| Data Saver Mode | `src/components/SettingsView.tsx` | `enableDataSaverMode` | `pro` | T3 | Phase 10| `todo` | `## FEAT-080` |
| Advanced Splits | `src/components/ExpenseForm.tsx` | `enableAdvancedSplits` | `pro` | T3 | Phase 7 | `done` | `## FLUTTER-P7-FORM-LEDGER` |
| Itemized Receipt Split| `src/components/ItemizedSplitModal.tsx`| `enableItemizedSplit` | `pro` | T3 | Phase 7 | `done` | `## FLUTTER-P7-FORM-LEDGER` |
| On-Device Receipt OCR| `src/components/ReceiptOcrModal.tsx` | `enableReceiptOcr` | `pro` | T3 | Phase 9 | `done` | Phase 9C shipped in ADR 270 (`receipt_ocr_service`, `OcrGateway`, `ReceiptOcrModal`) |
| Multi-Trip Analytics | `src/components/AnalyticsTab.tsx` | `enableMultiTripAnalytics` | `pro` | T3 | Phase 9 | `deferred` | T3 charts skipped; no `fl_chart` (B-070) |
| Biometric App Lock | `src/utils/webAuthn.ts` | `enableBiometricAuth` | `pro` | T3 | Phase 10| `partial` (settings toggle built; real device unverified) | `## Shared prep` |
| Document Vault | `src/components/DocumentVaultModal.tsx` | `enableDocumentVault` | `pro` | T3 | Phase 9 | `deferred` | B-020; not in the Phase 8 build |
| Burn Rate Insights | `src/components/BurnRateInsightCard.tsx`| `enableBurnRateInsight` | `pro` | T3 | Phase 7 | `deferred` | T3 charts skipped; no `fl_chart` in this slice (B-070) |
| Date Range Members | `src/components/MemberDateModal.tsx` | `enableDateRangeMembership` | `pro` | T3 | Phase 8 | `deferred` | B-083 |
| Auto Currency Detect | `src/utils/countryCurrencyMap.ts` | `enableAutoCurrencyDetection` | `pro` | T3 | Phase 7 | `todo` | `## FEAT-079` |
| Split Exclusion Dflts| `src/components/SplitExclusionModal.tsx`| `enableSplitExclusionDefaults` | `pro` | T3 | Phase 7 | `todo` | `## FEAT-079` |
| Multi-Payer Expenses | `src/components/MultiPayerForm.tsx` | `enableMultiPayerExpenses` | `pro` | T3 | Phase 7 | `done` | `## FLUTTER-P7-FORM-LEDGER` |
| AMOLED Pure Black | `src/index.css` | `enableAmoledTheme` | `pro` | T3 | Phase 2, 10| `todo` | `## FEAT-079` |
| Quiet Hours Window | `src/components/QuietHoursModal.tsx` | `enableQuietHours` | `pro` | T3 | Phase 10| `done` (P10; headless only) | `## FEAT-078` |
| Splitwise CSV Import | `src/components/SplitwiseImportModal.tsx`| `enableSplitwiseImport` | `pro` | T3 | Phase 7 | `done` | `## FLUTTER-P7-LOOP` |
| Trip Stack Alphabetical| `src/components/TripStack.tsx` | `enableTripStackSort` | `pro` | T3 | Phase 6 | `todo` | `## FEAT-TRIPSORT` |
| Sync Queue Inspector | `src/components/SyncQueueModal.tsx` | `enableSyncQueueInspector` | `pro` | T3 | Phase 10| `todo` | `## Navigation, dialogs & sync UX pass` |
| Settlement Date & Note| `src/components/SettlementModal.tsx` | `enableSettlementDateNote` | `pro` | T3 | Phase 7 | `done` | `## FLUTTER-P7-FORM-LEDGER` |
| Settlement History Log| `src/components/SettlementHistoryModal.tsx`| `enableSettlementHistory` | `pro` | T3 | Phase 7 | `done` | `## FLUTTER-P7-FORM-LEDGER` |
| Cross-Trip Search | `src/components/CrossTripSearchModal.tsx`| `enableCrossTripSearch` | `pro` | T3 | Phase 7 | `done` | `## FLUTTER-P7-LOOP` |
| Settle Confirmation | `src/components/BalancesSettlements.tsx` | `enableSettlementConfirmation` | `pro` | T3 | Phase 7 | `done` | `## FLUTTER-P7-FORM-LEDGER` |
| Expense Approval Gate| `src/components/ApprovalThresholdModal.tsx`| `enableExpenseApprovalThreshold` | `pro` | T3 | Phase 7 | `todo` | `## FEAT-078` |
| Quick Filter Chips | `src/components/ExpenseList.tsx` | `enableExpenseQuickFilterChips` | `pro` | T3 | Phase 7 | `done` | `## FLUTTER-P7-EXPENSES` |
| Chat Reactions/Replies| `src/components/TripChatPanel.tsx` | `enableChatReactionsAndReplies` | `pro` | T3 | Phase 8 | `deferred` | B-084 |
| In-Chat Event Cards | `src/components/TripChatPanel.tsx` | `enableInChatEventCards` | `pro` | T3 | Phase 8 | `partial` (cards Phase 7 already writes open the expense) | `## FLUTTER-P8` |
| Chat Attachments Tray| `src/components/TripChatPanel.tsx` | `enableChatAttachments` | `pro` | T3 | Phase 8 | `deferred` | B-085 |
| Simplify Debts Toggle| `src/components/BalancesSettlements.tsx` | `enableSimplifyDebtsToggle` | `pro` | T3 | Phase 7 | `done` | `## FLUTTER-P7-FORM-LEDGER` |

---

## 6. Labs Pack (Tier 4: Experimental)

| Feature / Screen | Web Source File(s) | Feature Flag Key | Pack | Tier | Flutter Phase | Status | Test-Steps Anchor in `FEATURE_TEST_STEPS.md` |
|---|---|---|---|---|---|---|---|
| Chat Offline Outbox | `src/services/offlineChatStore.ts` | `enableChatOfflineOutbox` | `labs` | T4 | Phase 5, 8 | `partial` (text sends always queue; not gated on this flag) | `## FLUTTER-P8` |
| Chat Voice Notes | `src/components/TripChatPanel.tsx` | `enableChatVoiceNotes` | `labs` | T4 | Phase 8 | `deferred` | B-086 |
| Chat Typing Indicator| `src/components/TripChatPanel.tsx` | `enableChatTypingIndicators` | `labs` | T4 | Phase 8 | `deferred` | B-023 |
| Chat Read Receipts | `src/components/TripChatPanel.tsx` | `enableChatReadReceipts` | `labs` | T4 | Phase 8 | `deferred` | B-087 |
| TripBot NL Parser | `src/components/TripChatPanel.tsx` | `enableTripbotNlExpenses` | `labs` | T4 | Phase 8 | `deferred` | B-088 |
| Chat Unread on Notes | `src/components/NavTabs.tsx` | `enableChatUnreadOnNotes` | `labs` | T4 | Phase 8 | `partial` (unread follows `enableTripChat`, not this flag) | `## FLUTTER-P8` |
| Keyword Tagging | `src/utils/categoryKeywords.ts` | `enableKeywordTagging` | `labs` | T4 | Phase 7 | `todo` | `## Shared prep` |
| Demo Data Seeding | `src/components/DemoSeedModal.tsx` | `enableDemoSeeding` | `labs` | T4 | Phase 10| `todo` | `## Shared prep` |
| Feature Suggestions | `src/components/FeatureRequestModal.tsx`| `enableFeatureSuggestions` | `labs` | T4 | Phase 10| `done` (P10; headless only) | `## Shared prep` |
| Achievements Badges | `src/components/AchievementsModal.tsx` | `enableAchievements` | `labs` | T4 | Phase 9 | `done` | Phase 9D shipped in ADR 271 (`achievements_service`, `AchievementBadgeModal`) |
| Offline Snapshot | `src/utils/offlineSnapshot.ts` | `enableOfflineSnapshot` | `labs` | T4 | Phase 9 | `done` | Phase 9C shipped in ADR 270 (`offline_snapshot_service`, `OfflineSnapshotModal`) |
| Closeout Pulse Mood | `src/components/TripCloseoutModal.tsx` | `enableCloseoutPulse` | `labs` | T4 | Phase 7 | `done` | `## FLUTTER-P7-LOOP` |
| Category Reorder | `src/components/CategoryOrderModal.tsx` | `enableCategoryReorder` | `labs` | T4 | Phase 7 | `done` | `## FLUTTER-P7-LOOP` |
| What's New Hub | `src/components/WhatsNewModal.tsx` | `enableWhatsNewHub` | `labs` | T4 | Phase 10| `done` (P10; changelog sheet) | `## FEAT-080` |
| Traveler Passport | `src/components/TravelerPassportModal.tsx`| `enableTravelerPassport` | `labs` | T4 | Phase 9 | `done` | Phase 9D shipped in ADR 271 (`traveler_passport_service`, `TravelerPassportModal`, `PassportStamp`) |
| Growth Telemetry | `src/services/growthApi.ts` | `enableGrowthTelemetry` | `labs` | T4 | Phase 10| `done` (P10; headless only) | `## FEAT-GROWTH2` |
| Lifecycle Nudges | `src/services/growthApi.ts` | `enableLifecycleNudges` | `labs` | T4 | Phase 10| `todo` | `## FEAT-GROWTH2` |

---

## 7. Ops Pack (Web-Only: Out of Scope for Flutter per ADR D8)

| Feature / Screen | Web Source File(s) | Feature Flag Key | Pack | Tier | Flutter Phase | Status | Reason / Justification |
|---|---|---|---|---|---|---|---|
| Ops Deck Command Center| `src/components/admin/AdminCommandCenterPage.tsx` | `enableOpsDeck` | `ops` | `out` | None | `skipped` | Admin portal stays web-only |
| Bug Tracker & Triage | `src/components/admin/SuperAdminBugTracker.tsx` | `enableAdminBugTracker`| `ops` | `out` | None | `skipped` | Admin portal stays web-only |
| Audit Log Purge Tool | `src/components/admin/AdminAuditPage.tsx` | `enableAuditPurge` | `ops` | `out` | None | `skipped` | Admin portal stays web-only |
| User Suspension Admin | `src/components/admin/AdminUsersPage.tsx` | `enableUserManagement` | `ops` | `out` | None | `skipped` | Admin portal stays web-only |
| Growth Funnels Report | `src/components/admin/AdminGrowthPage.tsx` | `enableGrowthMetrics` | `ops` | `out` | None | `skipped` | Admin portal stays web-only |
