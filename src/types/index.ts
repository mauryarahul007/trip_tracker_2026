export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  baseCurrency: string;
  memberIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Member {
  id: string;
  name: string;
  type: 'individual' | 'group';
  headCount: number; // 1 for individual, N for group
  defaultWeight: number; // defaults to headCount, custom weighting allowed
  archived?: boolean; // soft-delete flag
}

export type SplitMode = 'equal' | 'equalUnit' | 'custom' | 'exact' | 'percentage';

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  paidBy: string; // memberId
  splitMode: SplitMode;
  splitConfig?: Record<string, number>; // memberId -> weight / amount / percentage
  resolvedShares: Record<string, number>; // memberId -> actual split share in baseCurrency
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  isCustom: boolean;
}

export interface TripState {
  trips: Trip[];
  activeTripId: string | null;
  members: Record<string, Member>; // memberId -> Member
  expenses: Expense[];
  categories: Category[];
}
