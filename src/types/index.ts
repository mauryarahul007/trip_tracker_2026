export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  baseCurrency: string;
  memberIds: string[];
  groupIds: string[]; // List of groups associated with this trip
  ownerId: string; // admin: full CRUD + can settle any transfer
  joinCode: string; // shareable code, e.g. "ABC123"
  createdAt: number;
  updatedAt: number;
  expenseCount?: number;
  archived?: boolean;
}

export interface Member {
  id: string;
  name: string;
  archived?: boolean; // soft-delete flag
  linkedUserId?: string | null; // set once this member "claims" their identity via /join
  avatarUrl?: string | null; // from the linked account's Google profile, if any
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
  receiptImage?: string; // client-only: a freshly-captured base64 preview, not yet uploaded
  receiptPath?: string | null; // Supabase Storage object path once uploaded — resolve via a signed URL to display
  isSettlement: boolean;
  createdByUserId: string; // participant edit/delete rights are scoped to this
  deletedAt?: number | null; // set when soft-deleted into the recycle bin; purged 24h after
  deletedByUserId?: string | null;
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

export interface PreviousMemberSuggestion {
  name: string;
  linkedUserId?: string | null;
  avatarUrl?: string | null;
}

