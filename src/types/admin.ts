export type FeatureFlagKey =
  // Phase 1: Core Social Splitter (Base MVP)
  | 'enablePredictiveChips'
  | 'enableRecycleBin'
  // Phase 2: Active Group Collab & Natural Entry
  | 'enableVoiceInput'
  | 'enableReceiptUpload'
  | 'enableNotesAndChecklist'
  | 'enableDuplicateDetector'
  // Phase 3: Smart Travel Navigator & Pass Hub
  | 'enableTravelPasses'
  | 'enableNextUpCapsule'
  | 'enableGateScanner'
  | 'enableFlightRadar'
  | 'enablePackingAssistant'
  | 'enableRouteStops'
  | 'enableGeotagging'
  // Phase 4: FinTech Pro & Global Jetsetter Suite
  | 'enableAdvancedSplits'
  | 'enableItemizedSplit'
  | 'enableReceiptOcr'
  | 'enableCurrencyFx'
  | 'enableMultiTripAnalytics'
  | 'enableBiometricAuth'
  // Deferred & Admin Ops
  | 'enableUpiPayments'
  | 'enableAdvancedLocationSearch'
  | 'enableKeywordTagging'
  | 'enableDemoSeeding'
  | 'enableFeatureSuggestions'
  | 'enableTripWrapped'
  | 'enableAchievements'
  | 'enableOfflineSnapshot';

export type ReleasePhaseId = 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'deferred';

export interface ReleasePhaseDef {
  id: ReleasePhaseId;
  phaseNumber: 1 | 2 | 3 | 4 | 0;
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
  phase: ReleasePhaseId;
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
  | 'ops_webhook_url';

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
