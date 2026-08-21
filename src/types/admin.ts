export type FeatureFlagKey =
  | 'enableGeotagging'
  | 'enableAdvancedLocationSearch'
  | 'enableAdvancedSplits'
  | 'enableP2PSync'
  | 'enableReceiptUpload'
  | 'enableRecycleBin'
  | 'enableKeywordTagging'
  | 'enableDemoSeeding'
  | 'enableMultiTripAnalytics'
  | 'enableFeatureSuggestions';

export interface FeatureFlagMeta {
  key: FeatureFlagKey;
  label: string;
  description: string;
  category: 'core' | 'geotagging' | 'splits' | 'sync' | 'admin';
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
  | 'audit_log_retention_days';

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
