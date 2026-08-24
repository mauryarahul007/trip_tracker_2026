import type { Trip, Member, Group, Expense } from '../types';

export interface DemoData {
  trip: Omit<Trip, 'ownerId' | 'joinCode'>;
  members: Record<string, Member>;
  groups: Record<string, Group>;
  expenses: Omit<Expense, 'isSettlement' | 'createdByUserId'>[];
}

export function generateDemoData(): DemoData {
  const now = Date.now();
  const tripId = `trip-goa-${now}`;

  // Unique member IDs
  const mRahulId = `mem-rahul-${now}`;
  const mPriyaId = `mem-priya-${now}`;
  const mAmitId = `mem-amit-${now}`;
  const mSnehaId = `mem-sneha-${now}`;

  const members: Record<string, Member> = {
    [mRahulId]: { id: mRahulId, name: 'Rahul' },
    [mPriyaId]: { id: mPriyaId, name: 'Priya' },
    [mAmitId]: { id: mAmitId, name: 'Amit' },
    [mSnehaId]: { id: mSnehaId, name: 'Sneha' },
  };

  // Groups
  const gCouplesId = `grp-couples-${now}`;
  const gGirlsId = `grp-girls-${now}`;

  const groups: Record<string, Group> = {
    [gCouplesId]: {
      id: gCouplesId,
      name: 'Couples',
      memberIds: [mRahulId, mPriyaId],
    },
    [gGirlsId]: {
      id: gGirlsId,
      name: 'Girls',
      memberIds: [mPriyaId, mSnehaId],
    },
  };

  const trip: Omit<Trip, 'ownerId' | 'joinCode'> = {
    id: tripId,
    name: 'Road Trip to Goa ☀️',
    destination: 'Goa',
    startDate: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 days ago
    endDate: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],   // 2 days from now
    baseCurrency: 'INR',
    memberIds: [mRahulId, mPriyaId, mAmitId, mSnehaId],
    groupIds: [gCouplesId, gGirlsId],
    createdAt: now,
    updatedAt: now,
  };

  // Expenses with coordinates for Demo Journey Map
  const expenses: Omit<Expense, 'isSettlement' | 'createdByUserId'>[] = [
    {
      id: `exp-goa-2-${now}`,
      tripId,
      title: 'Airport Taxi & Car Rental',
      amount: 8000,
      currency: 'INR',
      category: 'cat-travel',
      date: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paidBy: mAmitId,
      splitMode: 'equal',
      splitMemberIds: [mRahulId, mPriyaId, mAmitId, mSnehaId],
      resolvedShares: {
        [mRahulId]: 2000,
        [mPriyaId]: 2000,
        [mAmitId]: 2000,
        [mSnehaId]: 2000,
      },
      location: { lat: 15.3808, lng: 73.8314, placeName: 'Dabolim Airport, Goa' },
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      updatedAt: now - 3 * 24 * 60 * 60 * 1000,
    },
    {
      id: `exp-goa-1-${now}`,
      tripId,
      title: 'Airbnb Beach Villa',
      amount: 24000,
      currency: 'INR',
      category: 'cat-stay',
      date: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paidBy: mRahulId,
      splitMode: 'equal',
      splitMemberIds: [mRahulId, mPriyaId, mAmitId, mSnehaId],
      resolvedShares: {
        [mRahulId]: 6000,
        [mPriyaId]: 6000,
        [mAmitId]: 6000,
        [mSnehaId]: 6000,
      },
      location: { lat: 15.5165, lng: 73.7667, placeName: 'Candolim Villa, Goa' },
      createdAt: now - 3 * 24 * 60 * 60 * 1000 + 5000,
      updatedAt: now - 3 * 24 * 60 * 60 * 1000 + 5000,
    },
    {
      id: `exp-goa-3-${now}`,
      tripId,
      title: 'Dinner at Thalassa',
      amount: 6000,
      currency: 'INR',
      category: 'cat-food',
      date: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paidBy: mPriyaId,
      splitMode: 'custom',
      splitMemberIds: [mRahulId, mPriyaId, mAmitId, mSnehaId],
      splitConfig: {
        [mRahulId]: 1.5,
        [mPriyaId]: 1.5,
        [mAmitId]: 1.0,
        [mSnehaId]: 1.0,
      },
      resolvedShares: {
        [mRahulId]: 1800,
        [mPriyaId]: 1800,
        [mAmitId]: 1200,
        [mSnehaId]: 1200,
      },
      location: { lat: 15.5925, lng: 73.7389, placeName: 'Thalassa, Siolim, Goa' },
      createdAt: now - 2 * 24 * 60 * 60 * 1000,
      updatedAt: now - 2 * 24 * 60 * 60 * 1000,
    },
    {
      id: `exp-goa-4-${now}`,
      tripId,
      title: 'Scuba Diving & Watersports',
      amount: 10000,
      currency: 'INR',
      category: 'cat-activities',
      date: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paidBy: mSnehaId,
      splitMode: 'percentage',
      splitMemberIds: [mRahulId, mPriyaId, mAmitId, mSnehaId],
      splitConfig: {
        [mRahulId]: 20,
        [mPriyaId]: 20,
        [mAmitId]: 30,
        [mSnehaId]: 30,
      },
      resolvedShares: {
        [mRahulId]: 2000,
        [mPriyaId]: 2000,
        [mAmitId]: 3000,
        [mSnehaId]: 3000,
      },
      location: { lat: 15.5562, lng: 73.7517, placeName: 'Calangute Watersports, Goa' },
      createdAt: now - 1 * 24 * 60 * 60 * 1000,
      updatedAt: now - 1 * 24 * 60 * 60 * 1000,
    },
    {
      id: `exp-goa-5-${now}`,
      tripId,
      title: 'Cashew Shopping & Spices',
      amount: 3200,
      currency: 'INR',
      category: 'cat-shopping',
      date: new Date(now).toISOString().split('T')[0],
      paidBy: mRahulId,
      splitMode: 'exact',
      splitMemberIds: [mRahulId, mPriyaId, mSnehaId],
      splitConfig: {
        [mRahulId]: 800,
        [mPriyaId]: 1200,
        [mSnehaId]: 1200,
      },
      resolvedShares: {
        [mRahulId]: 800,
        [mPriyaId]: 1200,
        [mSnehaId]: 1200,
      },
      location: { lat: 15.4989, lng: 73.8278, placeName: 'Panaji Market, Goa' },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `exp-goa-6-${now}`,
      tripId,
      title: 'Fuel Station Refill',
      amount: 1500,
      currency: 'INR',
      category: 'cat-travel',
      date: new Date(now).toISOString().split('T')[0],
      paidBy: mAmitId,
      splitMode: 'equal',
      splitMemberIds: [mRahulId, mPriyaId, mAmitId, mSnehaId],
      resolvedShares: {
        [mRahulId]: 375,
        [mPriyaId]: 375,
        [mAmitId]: 375,
        [mSnehaId]: 375,
      },
      location: { lat: 15.5342, lng: 73.8295, placeName: 'Porvorim Fuel Station, Goa' },
      createdAt: now + 1000,
      updatedAt: now + 1000,
    },
  ];

  return {
    trip,
    members,
    groups,
    expenses,
  };
}
