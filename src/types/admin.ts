export type FeatureFlagKey =
  // Core pack
  | 'enablePredictiveChips'
  | 'enableRecycleBin'
  | 'enableExplainThisNumber'
  | 'enableStickyDayHeaders'
  | 'enableCategoryColorRings'
  | 'enableCompactLedgerView'
  | 'enableCategoryReorder'
  | 'enableWhatsNewHub'
  // Phase 2: Active Group Collab & Natural Entry
  | 'enableVoiceInput'
  | 'enableReceiptUpload'
  | 'enableNotesAndChecklist'
  | 'enableNotesTalkPackPass'
  | 'enableDuplicateDetector'
  | 'enableTripChat'
  | 'enableExpensePhotoLinking'
  | 'enableExpenseDisputes'
  | 'enableDigestNotifications'
  | 'enableMemberLastSeen'
  | 'enableExpenseApprovalThreshold'
  // Phase 3: Smart Travel Navigator & Pass Hub
  | 'enableTravelPasses'
  | 'enableNextUpCapsule'
  | 'enableProgressiveNextUp'
  | 'enableGateScanner'
  | 'enableFlightRadar'
  | 'enablePackingAssistant'
  | 'enableRouteStops'
  | 'enableGeotagging'
  | 'enableIcsExport'
  | 'enableOfflineMapTiles'
  | 'enableLiveLocationShare'
  | 'enableMapCollapsedByDefault'
  | 'enableWeatherItineraryNudges'
  | 'enableDataSaverMode'
  // Phase 4: FinTech Pro & Global Jetsetter Suite
  | 'enableAdvancedSplits'
  | 'enableItemizedSplit'
  | 'enableReceiptOcr'
  | 'enableCurrencyFx'
  | 'enableMultiTripAnalytics'
  | 'enableBiometricAuth'
  | 'enableDocumentVault'
  | 'enableBurnRateInsight'
  | 'enableDateRangeMembership'
  | 'enableAutoCurrencyDetection'
  | 'enableSplitExclusionDefaults'
  | 'enableMultiPayerExpenses'
  | 'enableAmoledTheme'
  // Phase 2: Active Group Collab & Natural Entry (cont'd)
  | 'enableQuietHours'
  // Phase 5: Switch, Speed & Trust
  | 'enableSplitwiseImport'
  | 'enableWhatsAppSettlementShare'
  | 'enableCloneLastExpense'
  | 'enableRememberDefaultSplit'
  | 'enableTabBackHistory'
  | 'enableDeepLinkedTabs'
  | 'enableExtendedUndo'
  | 'enableTripStackSort'
  | 'enablePersistentExpenseDraft'
  | 'enableSyncQueueInspector'
  | 'enableSettlementDateNote'
  | 'enableSettlementHistory'
  | 'enableTripCloseout'
  | 'enableCrossTripSearch'
  | 'enableSettlementConfirmation'
  | 'enableTripShareLink'
  | 'enableCloneTripSquad'
  | 'enableContactInvite'
  | 'enableExpenseQuickFilterChips'
  // Phase 6: WhatsApp Social & Chat Hub
  | 'enableChatFirstNav'
  | 'enableChatReactionsAndReplies'
  | 'enableChatOfflineOutbox'
  | 'enableInChatEventCards'
  | 'enableChatAttachments'
  | 'enableChatVoiceNotes'
  | 'enableChatTypingIndicators'
  | 'enableChatReadReceipts'
  | 'enableTripbotNlExpenses'
  | 'enableChatUnreadOnNotes'
  // Phase 7: Commercial FinTech & Smart Splitting
  | 'enableSimplifyDebtsToggle'
  // Deferred & Admin Ops
  | 'enableUpiPayments'
  | 'enableAdvancedLocationSearch'
  | 'enableKeywordTagging'
  | 'enableDemoSeeding'
  | 'enableFeatureSuggestions'
  | 'enableTripWrapped'
  | 'enableAchievements'
  | 'enableOfflineSnapshot'
  | 'enableCloseoutPulse'
  // Growth & retention
  | 'enableInviteConversion'
  | 'enableTravelerPassport'
  | 'enableGrowthTelemetry'
  | 'enableLifecycleNudges';

/** Who the flag is for — Ops Deck groups and arm/safe by pack, not engineering phase. */
export type ConsumerPackId = 'core' | 'trip' | 'travel' | 'pro' | 'labs' | 'ops';

export interface ConsumerPackDef {
  id: ConsumerPackId;
  packNumber: 1 | 2 | 3 | 4 | 5 | 6;
  code: string;
  title: string;
  tagline: string;
  description: string;
  targetAudience: string;
  flagKeys: FeatureFlagKey[];
}

export interface FeatureFlagMeta {
  key: FeatureFlagKey;
  label: string;
  description: string;
  category: 'core' | 'collab' | 'transit' | 'fintech' | 'geotagging' | 'splits' | 'admin' | 'security';
  pack: ConsumerPackId;
  defaultEnabledForUsers: boolean;
}

export interface SuperadminCredentials {
  email: string;
  password: string;
  recoveryPhones: string[];
}

export interface GlobalAnalyticsSummary {
  totalSpend: number;
  totalTripsCount: number;
  activeTripsCount: number;
  totalExpensesCount: number;
  totalMembersCount: number;
  categoryDistribution: { categoryId: string; name: string; amount: number; percentage: number; color?: string }[];
  currencyBreakdown: Record<string, number>;
  topSpenders: { name: string; amount: number; tripName: string }[];
}

export interface TripAuditItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  baseCurrency: string;
  memberCount: number;
  expenseCount: number;
  totalSpend: number;
  ownerEmail?: string;
  archived: boolean;
  createdAt: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string | null;
  banned: boolean;
  createdAt: string;
  signupSource?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    capturedAt?: number;
  } | null;
}

export type AppConfigKey =
  | 'maintenance_mode'
  | 'maintenance_window'
  | 'signup_gate'
  | 'join_max_attempts'
  | 'join_lockout_minutes'
  | 'recycle_bin_retention_hours'
  | 'expense_amount_ceiling'
  | 'audit_log_retention_days'
  | 'landing_backdrop_url'
  | 'ops_webhook_url'
  | 'landing_headline'
  | 'landing_tagline'
  | 'landing_invite_blurb'
  | 'empty_trip_blurb'
  | 'flag_presets';

export interface DevicePlatformCount {
  platform: 'ios' | 'android';
  count: number;
}

export interface AuditLogEntry {
  id: string;
  tripId: string | null;
  actorUserId: string | null;
  action: string;
  details: unknown;
  createdAt: string;
}

export interface NotificationStats {
  totalCount: number;
  readCount: number;
  last7dCount: number;
}
