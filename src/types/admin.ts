export type FeatureFlagKey =
  | 'enableGeotagging'
  | 'enableAdvancedLocationSearch'
  | 'enableAdvancedSplits'
  | 'enableP2PSync'
  | 'enableReceiptUpload'
  | 'enableRecycleBin'
  | 'enableKeywordTagging'
  | 'enableDemoSeeding'
  | 'enableMultiTripAnalytics';

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
