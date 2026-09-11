import { describe, it, expect } from 'vitest';
import { inferCategoryId, getTimeOfDayChips, getPredictiveQuickChips } from './predictiveExpenses';
import type { Category, Expense } from '../types';

describe('predictiveExpenses', () => {
  const categories: Category[] = [
    { id: 'cat-food', name: 'Food & Drinks', icon: '🍽️', isCustom: false },
    { id: 'cat-transport', name: 'Transport', icon: '🚕', isCustom: false },
    { id: 'cat-stay', name: 'Stay & Hotels', icon: '🏨', isCustom: false },
    { id: 'cat-entertainment', name: 'Entertainment', icon: '🎟️', isCustom: false },
    { id: 'cat-groceries', name: 'Groceries', icon: '🛒', isCustom: false },
  ];

  it('infers category from title keywords correctly', () => {
    expect(inferCategoryId('Morning Coffee and Croissant', categories)).toBe('cat-food');
    expect(inferCategoryId('Uber to airport terminal 2', categories)).toBe('cat-transport');
    expect(inferCategoryId('Taj Hotel room service', categories)).toBe('cat-stay');
    expect(inferCategoryId('Museum entry tickets for 2', categories)).toBe('cat-entertainment');
    expect(inferCategoryId('Supermarket water bottles', categories)).toBe('cat-groceries');
    expect(inferCategoryId('Unknown Misc payment', categories)).toBeUndefined();
  });

  it('returns morning chips between 5 AM and 11:30 AM', () => {
    const morningTime = new Date('2026-09-12T08:30:00');
    const chips = getTimeOfDayChips(morningTime);
    expect(chips.some((c) => c.label.includes('Coffee'))).toBe(true);
    expect(chips.some((c) => c.label.includes('Breakfast'))).toBe(true);
  });

  it('returns afternoon chips between 11:30 AM and 5 PM', () => {
    const afternoonTime = new Date('2026-09-12T13:30:00');
    const chips = getTimeOfDayChips(afternoonTime);
    expect(chips.some((c) => c.label.includes('Lunch'))).toBe(true);
  });

  it('returns evening chips between 5 PM and 5 AM', () => {
    const eveningTime = new Date('2026-09-12T20:00:00');
    const chips = getTimeOfDayChips(eveningTime);
    expect(chips.some((c) => c.label.includes('Dinner'))).toBe(true);
  });

  it('learns frequent trip expenses and prioritizes them as quick chips', () => {
    const tripExpenses: Partial<Expense>[] = [
      { id: 'e-1', title: 'Tuk Tuk ride', category: 'cat-transport' },
      { id: 'e-2', title: 'Tuk Tuk ride', category: 'cat-transport' },
      { id: 'e-3', title: 'Coconut Water', category: 'cat-food' },
      { id: 'e-4', title: 'Coconut Water', category: 'cat-food' },
      { id: 'e-5', title: 'Single dinner', category: 'cat-food' },
    ];

    const chips = getPredictiveQuickChips(categories, tripExpenses as Expense[]);
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.some((c) => c.title.toLowerCase().includes('tuk tuk'))).toBe(true);
    expect(chips.some((c) => c.title.toLowerCase().includes('coconut water'))).toBe(true);
  });
});
