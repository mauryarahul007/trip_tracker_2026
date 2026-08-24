import type { Trip, Expense, Member, Category } from '../types';

export interface AchievementBadge {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  unlocked: boolean;
  progressText: string;
  rarity: 'common' | 'rare' | 'legendary';
}

export function calculateTripAchievements(
  trip: Trip,
  expenses: Expense[],
  members: Member[],
  categories: Category[],
  isFullySettled: boolean
): AchievementBadge[] {
  const activeExpenses = expenses.filter((e) => !e.isSettlement && !e.deletedAt);

  // 1. Caffeine Logistics (3+ Cafe/Coffee/Breakfast)
  const coffeeCount = activeExpenses.filter((e) => {
    const t = e.title.toLowerCase();
    const c = categories.find((cat) => cat.id === e.category)?.name.toLowerCase() || '';
    return t.includes('coffee') || t.includes('cafe') || t.includes('tea') || t.includes('chai') || t.includes('breakfast') || c.includes('cafe');
  }).length;
  const coffeeUnlocked = coffeeCount >= 3;

  // 2. Midnight Odyssey (late night expenses)
  const nightCount = activeExpenses.filter((e) => {
    const t = e.title.toLowerCase();
    return t.includes('night') || t.includes('midnight') || t.includes('bar') || t.includes('pub') || t.includes('party') || t.includes('dinner');
  }).length;
  const nightUnlocked = nightCount >= 2;

  // 3. Lightning Settlement (All debts cleared)
  const settlementUnlocked = isFullySettled && activeExpenses.length > 0;

  // 4. Apex Roadrunner (Transit exploration)
  const transitCount = activeExpenses.filter((e) => {
    const c = categories.find((cat) => cat.id === e.category);
    const catName = (c?.name || '').toLowerCase();
    return catName.includes('travel') || catName.includes('transit') || catName.includes('cab') || catName.includes('flight') || c?.icon === '✈️' || c?.icon === '🚗';
  }).length;
  const transitUnlocked = transitCount >= 3 || (trip.stops && trip.stops.length >= 3);

  // 5. Executive Gourmet (Food dominant)
  const foodSpend = activeExpenses.filter((e) => {
    const c = categories.find((cat) => cat.id === e.category);
    const catName = (c?.name || '').toLowerCase();
    return catName.includes('food') || catName.includes('dining') || c?.icon === '🍔' || c?.icon === '🍕';
  }).reduce((sum, e) => sum + e.amount, 0);

  const totalSpend = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
  const foodDominant = totalSpend > 0 && (foodSpend / totalSpend) >= 0.35;

  // 6. Squad Harmony (4+ members participating)
  const squadUnlocked = members.length >= 3;

  // 7. Visual Chronicler (Receipts/photos attached)
  const photoCount = activeExpenses.filter((e) => !!e.receiptImage || !!e.receiptPath).length;
  const photoUnlocked = photoCount >= 1;

  return [
    {
      id: 'caffeine',
      title: 'Caffeine Logistics',
      subtitle: 'Fueled the expedition with 3+ coffee, tea & breakfast stops.',
      icon: '☕',
      unlocked: coffeeUnlocked,
      progressText: `${coffeeCount}/3 Stops`,
      rarity: 'common',
    },
    {
      id: 'midnight',
      title: 'Midnight Odyssey',
      subtitle: 'Kept the squad vibes glowing into the late night hours.',
      icon: '🌙',
      unlocked: nightUnlocked,
      progressText: `${nightCount}/2 Night Outings`,
      rarity: 'rare',
    },
    {
      id: 'lightning_settle',
      title: 'Lightning Settlement',
      subtitle: 'Zero outstanding debts — 100% squared up and settled.',
      icon: '⚡',
      unlocked: !!settlementUnlocked,
      progressText: settlementUnlocked ? 'All Squared ✓' : 'Settlement Pending',
      rarity: 'legendary',
    },
    {
      id: 'apex_roadrunner',
      title: 'Apex Roadrunner',
      subtitle: 'Navigated 3+ major waypoints & transit legs across the route.',
      icon: '⛰️',
      unlocked: !!transitUnlocked,
      progressText: `${transitCount} Transit Legs`,
      rarity: 'rare',
    },
    {
      id: 'executive_gourmet',
      title: 'Executive Gourmet',
      subtitle: '35%+ of squad expedition spend invested in culinary tastings.',
      icon: '🍕',
      unlocked: foodDominant,
      progressText: totalSpend > 0 ? `${Math.round((foodSpend / totalSpend) * 100)}% Food Spend` : '0%',
      rarity: 'common',
    },
    {
      id: 'squad_harmony',
      title: 'Squad Power',
      subtitle: '3+ explorers united on a seamless group journey.',
      icon: '👑',
      unlocked: squadUnlocked,
      progressText: `${members.length} Squad Members`,
      rarity: 'common',
    },
    {
      id: 'visual_chronicler',
      title: 'Visual Chronicler',
      subtitle: 'Saved official receipts & travel polaroids into the ledger.',
      icon: '📸',
      unlocked: photoUnlocked,
      progressText: `${photoCount} Captured`,
      rarity: 'rare',
    },
  ];
}
