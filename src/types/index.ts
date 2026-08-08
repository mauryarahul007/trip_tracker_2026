export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  baseCurrency: string;
  memberIds: string[];
  groupIds: string[]; // List of groups associated with this trip
  createdAt: number;
  updatedAt: number;
}

export interface Member {
  id: string;
  name: string;
  archived?: boolean; // soft-delete flag
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[]; // members inside this group
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
  splitMemberIds: string[]; // members participating in this split
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
  groups: Record<string, Group>; // groupId -> Group
  expenses: Expense[];
  categories: Category[];
}
