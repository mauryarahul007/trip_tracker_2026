import { describe, it, expect } from 'vitest';
import { autoSuggestCategory } from './categoryHelper';
import type { Category } from '../types';

describe('Category Auto-Suggestion', () => {
  const categories: Category[] = [
    { id: 'cat-food', name: 'Food & Dining', icon: '🍔', isCustom: false },
    { id: 'cat-stay', name: 'Stay & Hotel', icon: '🏨', isCustom: false },
    { id: 'cat-travel', name: 'Travel & Transport', icon: '✈️', isCustom: false },
    { id: 'cat-activities', name: 'Activities & Sightseeing', icon: '🎟️', isCustom: false },
    { id: 'cat-shopping', name: 'Shopping', icon: '🛍️', isCustom: false },
    { id: 'cat-misc', name: 'Misc & Others', icon: '📦', isCustom: false },
    { id: 'custom-1', name: 'Fuel & Oil', icon: '⛽', isCustom: true },
  ];

  it('suggests travel category for uber', () => {
    expect(autoSuggestCategory('Uber ride to airport', categories)).toBe('cat-travel');
    expect(autoSuggestCategory('uber', categories)).toBe('cat-travel');
    expect(autoSuggestCategory('UBER', categories)).toBe('cat-travel');
  });

  it('suggests food category for restaurants and brands', () => {
    expect(autoSuggestCategory('McDonalds dinner', categories)).toBe('cat-food');
    expect(autoSuggestCategory('Starbucks coffee', categories)).toBe('cat-food');
    expect(autoSuggestCategory('kfc lunch', categories)).toBe('cat-food');
  });

  it('suggests stay category for hotels', () => {
    expect(autoSuggestCategory('Airbnb booking London', categories)).toBe('cat-stay');
    expect(autoSuggestCategory('hotel stay', categories)).toBe('cat-stay');
  });

  it('suggests custom category if the category name itself matches', () => {
    // Custom category "Fuel & Oil" contains "fuel" which matches "Fuel for car"
    expect(autoSuggestCategory('Fuel for car', categories)).toBe('custom-1');
  });

  it('returns null if no keywords match', () => {
    expect(autoSuggestCategory('random expense title', categories)).toBeNull();
  });
});
