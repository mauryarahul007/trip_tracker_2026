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
| `/live/:token` | `src/components/LiveLocationShareModal.tsx` | `enableLiveLocationShare` | `travel` | T2 | Phase 9 | `todo` | `## FEAT-076` |
| App Shell / Router | `src/App.tsx`, `src/components/NavTabs.tsx` | `enableTabBackHistory`, `enableDeepLinkedTabs` | `core` | T1 | Phase 2, 6 | `partial` | `## Navigation, dialogs & sync UX pass` |
| Bottom Nav Tabs | `src/components/NavTabs.tsx`, `src/utils/tripTabs.ts` | `enableChatFirstNav` | `trip` | T1 | Phase 2, 6 | `partial` (tabs are placeholders until Ph 7-8) | `## Chat placement flags` |

---

## 2. Core Pack (Tier 1: Store Launch Gate)

| Feature / Screen | Web Source File(s) | Feature Flag Key | Pack | Tier | Flutter Phase | Status | Test-Steps Anchor in `FEATURE_TEST_STEPS.md` |
|---|---|---|---|---|---|---|---|
| Trips List & Stack | `src/components/TripsListScreen.tsx`, `TripStack.tsx` | `enableMotionPolish` | `core` | T1 | Phase 6 | `partial` (list + Hero, no 3D stack) | `## UX-MOTION` |
| Quick Trip Creation | `src/components/NewTripModal.tsx` | `enableQuickTripCreate` | `core` | T1 | Phase 6 | `partial` | `## UX-POLISH3` |
| Destination Suggest | `src/components/DestinationAutocomplete.tsx` | `enableDestinationAutocomplete` | `core` | T1 | Phase 6 | `todo` | `## DEST-SUGGEST` |
| Destination Covers | `src/components/TripStack.tsx` | `cycleDestinationCovers` | `core` | T1 | Phase 6 | `todo` | `## FEAT-COVER-CYCLE` |
| Traveler Pass Back | `src/components/TravelPassHeroCard.tsx` | `enableTravelerPassBack` | `core` | T1 | Phase 6 | `todo` | `## PASS-STUB-SIMPLIFY` |
| Predictive Chips | `src/components/ExpenseForm.tsx` | `enablePredictiveChips` | `core` | T1 | Phase 7 | `todo` | `## FEAT-LIGHTLOOP` |
| Expense Recycle Bin | `src/components/RecycleBinModal.tsx` | `enableRecycleBin` | `core` | T1 | Phase 7 | `todo` | `## FEAT-LIGHTLOOP` |
| Duplicate Detector | `src/components/DuplicateExpenseModal.tsx` | `enableDuplicateDetector` | `core` | T1 | Phase 7 | `todo` | `## FEAT-LIGHTLOOP` |
| Explain This Number | `src/components/ExplainNumberModal.tsx` | `enableExplainThisNumber` | `core` | T1 | Phase 7 | `todo` | `## FEAT-LIGHTLOOP2` |
| Clone Last Expense | `src/components/ExpenseForm.tsx` | `enableCloneLastExpense` | `core` | T1 | Phase 7 | `todo` | `## FEAT-LIGHTLOOP2` |
| Remember Default Split | `src/components/ExpenseForm.tsx` | `enableRememberDefaultSplit` | `core` | T1 | Phase 7 | `todo` | `## FEAT-LIGHTLOOP2` |
| Persistent Draft | `src/components/ExpenseForm.tsx` | `enablePersistentExpenseDraft` | `core` | T1 | Phase 7 | `todo` | `## Navigation, dialogs & sync UX pass` |
| Trip Closeout | `src/components/TripCloseoutModal.tsx` | `enableTripCloseout` | `core` | T1 | Phase 7 | `todo` | `## FEAT-LIGHTLOOP2` |
| WhatsApp Share | `src/components/BalancesSettlements.tsx` | `enableWhatsAppSettlementShare` | `core` | T1 | Phase 7 | `todo` | `## FEAT-LIGHTLOOP` |
| UPI Payments | `src/components/UpiPaymentModal.tsx` | `enableUpiPayments` | `core` | T1 | Phase 7 | `todo` | `## FEAT-LIGHTLOOP` |
| Contact Invite | `src/components/ContactInviteModal.tsx` | `enableContactInvite` | `core` | T1 | Phase 8 | `todo` | `## FEAT-078` |
| Clone Trip Squad | `src/components/NewTripModal.tsx` | `enableCloneTripSquad` | `core` | T1 | Phase 6 | `todo` | `## FEAT-LIGHTLOOP` |
| Extended Undo | `src/components/UndoToasts.tsx` | `enableExtendedUndo` | `core` | T1 | Phase 2 | `todo` | `## Navigation, dialogs & sync UX pass` |
| Notes/Pack/Pass IA | `src/components/ChecklistNotesTab.tsx` | `enableNotesTalkPackPass` | `core` | T1 | Phase 8 | `todo` | `## FEAT-LIGHTLOOP` |
| Progressive Next Up | `src/components/NextUpTravelCapsule.tsx` | `enableProgressiveNextUp` | `core` | T1 | Phase 9 | `todo` | `## FEAT-LIGHTLOOP` |
| Compact Summary | `src/components/TripSummaryCard.tsx` | `enableCompactSummary` | `core` | T1 | Phase 7 | `todo` | `## UX-POLISH2` |
| Compact Expense Form | `src/components/ExpenseForm.tsx` | `enableCompactExpenseForm` | `core` | T1 | Phase 7 | `todo` | `## UX-POLISH2` |
| Calm Haptics | `src/utils/haptics.ts` | `enableCalmHaptics` | `core` | T1 | Phase 2 | `todo` | `## UX-POLISH3` |
| Trip Wrapped | `src/components/TripWrappedModal.tsx` | `enableTripWrapped` | `core` | T1 | Phase 9 | `todo` | `## FEAT-LIGHTLOOP2` |
| Sticky Day Headers | `src/components/ExpenseList.tsx` | `enableStickyDayHeaders` | `core` | T1 | Phase 7 | `todo` | `## FEAT-079` |
| Category Glow Rings | `src/components/ExpenseList.tsx` | `enableCategoryColorRings` | `core` | T1 | Phase 7 | `todo` | `## FEAT-079` |
| Compact Ledger View | `src/components/BalancesSettlements.tsx` | `enableCompactLedgerView` | `core` | T1 | Phase 7 | `todo` | `## FEAT-080` |

---

## 3. Trip Pack (Tier 1: On the Road)

| Feature / Screen | Web Source File(s) | Feature Flag Key | Pack | Tier | Flutter Phase | Status | Test-Steps Anchor in `FEATURE_TEST_STEPS.md` |
|---|---|---|---|---|---|---|---|
| Member Money Row | `src/components/MembersGroupsTab.tsx` | `enableMemberMoneyRow` | `trip` | T1 | Phase 8 | `todo` | `## MEMBERS-ROSTER` |
| Notification Groups | `src/components/NotificationsPanel.tsx`| `enableNotificationGrouping` | `trip` | T1 | Phase 10| `todo` | `## UX-POLISH3` |
| Voice Expense Input | `src/components/VoiceExpenseModal.tsx` | `enableVoiceInput` | `trip` | T1 | Phase 7 | `todo` | `## BUG-227` |
| Receipt Image Upload | `src/components/ReceiptModal.tsx` | `enableReceiptUpload` | `trip` | T1 | Phase 7 | `todo` | `## FEAT-076` |
| Notes & Checklist | `src/components/ChecklistNotesTab.tsx` | `enableNotesAndChecklist` | `trip` | T1 | Phase 8 | `todo` | `## COLLAB-SYNC` |
| Realtime Trip Chat | `src/components/TripChatPanel.tsx` | `enableTripChat` | `trip` | T1 | Phase 8 | `todo` | `## FEAT-CHATLIFE` |
| Packing Assistant | `src/components/SmartPackingAssistantModal.tsx` | `enablePackingAssistant` | `trip` | T1 | Phase 8 | `todo` | `## COLLAB-SYNC` |
| Geotagging | `src/components/ExpenseForm.tsx` | `enableGeotagging` | `trip` | T1 | Phase 7 | `todo` | `## FEAT-076` |
| Location Search | `src/services/placeSuggest.ts` | `enableAdvancedLocationSearch` | `trip` | T1 | Phase 7 | `todo` | `## DEST-SUGGEST` |
| Currency FX Overrides| `src/components/FxRatesModal.tsx` | `enableCurrencyFx` | `trip` | T1 | Phase 7 | `todo` | `## FEAT-079` |
| Expense Photo Link | `src/components/ExpenseForm.tsx` | `enableExpensePhotoLinking` | `trip` | T1 | Phase 7 | `todo` | `## FEAT-076` |
| Expense Disputes | `src/components/DisputeModal.tsx` | `enableExpenseDisputes` | `trip` | T1 | Phase 7 | `todo` | `## FEAT-077` |
| Digest Notifications| `src/components/DigestSettingsModal.tsx`| `enableDigestNotifications` | `trip` | T1 | Phase 10| `todo` | `## FEAT-078` |
| Member Last Seen | `src/components/TripChatPanel.tsx` | `enableMemberLastSeen` | `trip` | T1 | Phase 8 | `todo` | `## FEAT-CHATLIFE` |

---

## 4. Travel Pack (Tier 2: Capacitor Deprecation Gate)

| Feature / Screen | Web Source File(s) | Feature Flag Key | Pack | Tier | Flutter Phase | Status | Test-Steps Anchor in `FEATURE_TEST_STEPS.md` |
|---|---|---|---|---|---|---|---|
| Travel Passes Wallet | `src/components/TravelPassWalletView.tsx`| `enableTravelPasses` | `travel` | T2 | Phase 8, 9 | `todo` | `## PASS-STUB` |
| Next Up Capsule | `src/components/NextUpTravelCapsule.tsx` | `enableNextUpCapsule` | `travel` | T2 | Phase 9 | `todo` | `## FEAT-LIGHTLOOP` |
| Boarding Gate Scanner | `src/components/PassScanModal.tsx` | `enableGateScanner` | `travel` | T2 | Phase 9 | `todo` | `## PASS-STUB` |
| Flight Radar Status | `src/components/FlightTrackerModal.tsx` | `enableFlightRadar` | `travel` | T2 | Phase 9 | `todo` | `## PASS-STUB` |
| Itinerary Route Stops | `src/components/TripJourneyMap.tsx` | `enableRouteStops` | `travel` | T2 | Phase 9 | `todo` | `## FEAT-076` |
| Calendar ICS Export | `src/utils/icsExport.ts` | `enableIcsExport` | `travel` | T2 | Phase 9 | `todo` | `## Shared prep` |
| Offline Map Tiles | `src/components/TripMapHero.tsx` | `enableOfflineMapTiles` | `travel` | T2 | Phase 9 | `todo` | `## FEAT-076` |
| Live Location Share | `src/components/LiveLocationShareModal.tsx`| `enableLiveLocationShare` | `travel` | T2 | Phase 9 | `todo` | `## BUG-221` |
| Map Collapsed Default| `src/components/TripContentSheet.tsx` | `enableMapCollapsedByDefault` | `travel` | T2 | Phase 9 | `todo` | `## FEAT-LIGHTLOOP` |

---

## 5. Pro Pack (Tier 3: Post-Launch Increments)

| Feature / Screen | Web Source File(s) | Feature Flag Key | Pack | Tier | Flutter Phase | Status | Test-Steps Anchor in `FEATURE_TEST_STEPS.md` |
|---|---|---|---|---|---|---|---|
| Weather Nudges | `src/services/weatherService.ts` | `enableWeatherItineraryNudges` | `pro` | T3 | Phase 9 | `todo` | `## FEAT-078` |
| Data Saver Mode | `src/components/SettingsView.tsx` | `enableDataSaverMode` | `pro` | T3 | Phase 10| `todo` | `## FEAT-080` |
| Advanced Splits | `src/components/ExpenseForm.tsx` | `enableAdvancedSplits` | `pro` | T3 | Phase 7 | `todo` | `## FEAT-079` |
| Itemized Receipt Split| `src/components/ItemizedSplitModal.tsx`| `enableItemizedSplit` | `pro` | T3 | Phase 7 | `todo` | `## FEAT-079` |
| On-Device Receipt OCR| `src/components/ReceiptOcrModal.tsx` | `enableReceiptOcr` | `pro` | T3 | Phase 9 | `todo` | `## FEAT-076` |
| Multi-Trip Analytics | `src/components/AnalyticsTab.tsx` | `enableMultiTripAnalytics` | `pro` | T3 | Phase 9 | `todo` | `## Shared prep` |
| Biometric App Lock | `src/utils/webAuthn.ts` | `enableBiometricAuth` | `pro` | T3 | Phase 10| `todo` | `## Shared prep` |
| Document Vault | `src/components/DocumentVaultModal.tsx` | `enableDocumentVault` | `pro` | T3 | Phase 9 | `todo` | `## Shared prep` |
| Burn Rate Insights | `src/components/BurnRateInsightCard.tsx`| `enableBurnRateInsight` | `pro` | T3 | Phase 7 | `todo` | `## FEAT-LIGHTLOOP` |
| Date Range Members | `src/components/MemberDateModal.tsx` | `enableDateRangeMembership` | `pro` | T3 | Phase 8 | `todo` | `## MEMBERS-ROSTER` |
| Auto Currency Detect | `src/utils/countryCurrencyMap.ts` | `enableAutoCurrencyDetection` | `pro` | T3 | Phase 7 | `todo` | `## FEAT-079` |
| Split Exclusion Dflts| `src/components/SplitExclusionModal.tsx`| `enableSplitExclusionDefaults` | `pro` | T3 | Phase 7 | `todo` | `## FEAT-079` |
| Multi-Payer Expenses | `src/components/MultiPayerForm.tsx` | `enableMultiPayerExpenses` | `pro` | T3 | Phase 7 | `todo` | `## FEAT-079` |
| AMOLED Pure Black | `src/index.css` | `enableAmoledTheme` | `pro` | T3 | Phase 2, 10| `todo` | `## FEAT-079` |
| Quiet Hours Window | `src/components/QuietHoursModal.tsx` | `enableQuietHours` | `pro` | T3 | Phase 10| `todo` | `## FEAT-078` |
| Splitwise CSV Import | `src/components/SplitwiseImportModal.tsx`| `enableSplitwiseImport` | `pro` | T3 | Phase 9 | `todo` | `## Shared prep` |
| Trip Stack Alphabetical| `src/components/TripStack.tsx` | `enableTripStackSort` | `pro` | T3 | Phase 6 | `todo` | `## FEAT-TRIPSORT` |
| Sync Queue Inspector | `src/components/SyncQueueModal.tsx` | `enableSyncQueueInspector` | `pro` | T3 | Phase 10| `todo` | `## Navigation, dialogs & sync UX pass` |
| Settlement Date & Note| `src/components/SettlementModal.tsx` | `enableSettlementDateNote` | `pro` | T3 | Phase 7 | `todo` | `## FEAT-078` |
| Settlement History Log| `src/components/SettlementHistoryModal.tsx`| `enableSettlementHistory` | `pro` | T3 | Phase 7 | `todo` | `## FEAT-078` |
| Cross-Trip Search | `src/components/CrossTripSearchModal.tsx`| `enableCrossTripSearch` | `pro` | T3 | Phase 6 | `todo` | `## Shared prep` |
| Settle Confirmation | `src/components/BalancesSettlements.tsx` | `enableSettlementConfirmation` | `pro` | T3 | Phase 7 | `todo` | `## FEAT-078` |
| Expense Approval Gate| `src/components/ApprovalThresholdModal.tsx`| `enableExpenseApprovalThreshold` | `pro` | T3 | Phase 7 | `todo` | `## FEAT-078` |
| Quick Filter Chips | `src/components/ExpenseList.tsx` | `enableExpenseQuickFilterChips` | `pro` | T3 | Phase 7 | `todo` | `## FEAT-079` |
| Chat Reactions/Replies| `src/components/TripChatPanel.tsx` | `enableChatReactionsAndReplies` | `pro` | T3 | Phase 8 | `todo` | `## FEAT-CHATLIFE` |
| In-Chat Event Cards | `src/components/TripChatPanel.tsx` | `enableInChatEventCards` | `pro` | T3 | Phase 8 | `todo` | `## FEAT-076` |
| Chat Attachments Tray| `src/components/TripChatPanel.tsx` | `enableChatAttachments` | `pro` | T3 | Phase 8 | `todo` | `## FEAT-077` |
| Simplify Debts Toggle| `src/components/BalancesSettlements.tsx` | `enableSimplifyDebtsToggle` | `pro` | T3 | Phase 7 | `todo` | `## FEAT-LIGHTLOOP` |

---

## 6. Labs Pack (Tier 4: Experimental)

| Feature / Screen | Web Source File(s) | Feature Flag Key | Pack | Tier | Flutter Phase | Status | Test-Steps Anchor in `FEATURE_TEST_STEPS.md` |
|---|---|---|---|---|---|---|---|
| Chat Offline Outbox | `src/services/offlineChatStore.ts` | `enableChatOfflineOutbox` | `labs` | T4 | Phase 5, 8 | `todo` | `## FEAT-CHATLIFE` |
| Chat Voice Notes | `src/components/TripChatPanel.tsx` | `enableChatVoiceNotes` | `labs` | T4 | Phase 8 | `todo` | `## FEAT-077` |
| Chat Typing Indicator| `src/components/TripChatPanel.tsx` | `enableChatTypingIndicators` | `labs` | T4 | Phase 8 | `todo` | `## FEAT-077` |
| Chat Read Receipts | `src/components/TripChatPanel.tsx` | `enableChatReadReceipts` | `labs` | T4 | Phase 8 | `todo` | `## FEAT-077` |
| TripBot NL Parser | `src/components/TripChatPanel.tsx` | `enableTripbotNlExpenses` | `labs` | T4 | Phase 8 | `todo` | `## FEAT-077` |
| Chat Unread on Notes | `src/components/NavTabs.tsx` | `enableChatUnreadOnNotes` | `labs` | T4 | Phase 8 | `todo` | `## FEAT-CHATLIFE` |
| Keyword Tagging | `src/utils/categoryKeywords.ts` | `enableKeywordTagging` | `labs` | T4 | Phase 7 | `todo` | `## Shared prep` |
| Demo Data Seeding | `src/components/DemoSeedModal.tsx` | `enableDemoSeeding` | `labs` | T4 | Phase 10| `todo` | `## Shared prep` |
| Feature Suggestions | `src/components/FeatureRequestModal.tsx`| `enableFeatureSuggestions` | `labs` | T4 | Phase 10| `todo` | `## Shared prep` |
| Achievements Badges | `src/components/AchievementsModal.tsx` | `enableAchievements` | `labs` | T4 | Phase 9 | `todo` | `## Shared prep` |
| Offline Snapshot | `src/utils/offlineSnapshot.ts` | `enableOfflineSnapshot` | `labs` | T4 | Phase 9 | `todo` | `## Shared prep` |
| Closeout Pulse Mood | `src/components/TripCloseoutModal.tsx` | `enableCloseoutPulse` | `labs` | T4 | Phase 7 | `todo` | `## FEAT-LIGHTLOOP2` |
| Category Reorder | `src/components/CategoryOrderModal.tsx` | `enableCategoryReorder` | `labs` | T4 | Phase 7 | `todo` | `## FEAT-080` |
| What's New Hub | `src/components/WhatsNewModal.tsx` | `enableWhatsNewHub` | `labs` | T4 | Phase 10| `todo` | `## FEAT-080` |
| Traveler Passport | `src/components/TravelerPassportModal.tsx`| `enableTravelerPassport` | `labs` | T4 | Phase 9 | `todo` | `## FEAT-GROWTH2` |
| Growth Telemetry | `src/services/growthApi.ts` | `enableGrowthTelemetry` | `labs` | T4 | Phase 10| `todo` | `## FEAT-GROWTH2` |
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
