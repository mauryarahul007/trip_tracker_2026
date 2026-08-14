import { describe, it, expect } from 'vitest';
import { autoSuggestCategory, getCategoryKeywords } from './categoryHelper';
import type { Category } from '../types';

describe('Category Auto-Suggestion & 200+ Keywords Engine', () => {
  const categories: Category[] = [
    { id: 'cat-food', name: 'Food & Dining', icon: '🍔', isCustom: false },
    { id: 'cat-stay', name: 'Stay & Hotel', icon: '🏨', isCustom: false },
    { id: 'cat-travel', name: 'Travel & Transport', icon: '✈️', isCustom: false },
    { id: 'cat-activities', name: 'Activities & Sightseeing', icon: '🎟️', isCustom: false },
    { id: 'cat-shopping', name: 'Shopping', icon: '🛍️', isCustom: false },
    { id: 'cat-misc', name: 'Misc & Others', icon: '📦', isCustom: false },
    { id: 'custom-1', name: 'Adventure Sports', icon: '🏄', isCustom: true, keywords: ['skydiving', 'paragliding', 'dosa'] },
  ];

  it('suggests travel category for top 50 travel items and brands', () => {
    expect(autoSuggestCategory('Uber ride to airport', categories)).toBe('cat-travel');
    expect(autoSuggestCategory('Ola cab', categories)).toBe('cat-travel');
    expect(autoSuggestCategory('Petrol fill up', categories)).toBe('cat-travel');
    expect(autoSuggestCategory('Diesel for car', categories)).toBe('cat-travel');
    expect(autoSuggestCategory('Highway toll gate', categories)).toBe('cat-travel');
    expect(autoSuggestCategory('Fastag recharge', categories)).toBe('cat-travel');
    expect(autoSuggestCategory('Indigo flight ticket', categories)).toBe('cat-travel');
    expect(autoSuggestCategory('Train ticket', categories)).toBe('cat-travel');
  });

  it('suggests food category for top 50 food items and brands', () => {
    expect(autoSuggestCategory('Milk for tea', categories)).toBe('cat-food');
    expect(autoSuggestCategory('Maggi noodles late night', categories)).toBe('cat-food');
    expect(autoSuggestCategory('Maggie packet', categories)).toBe('cat-food');
    expect(autoSuggestCategory('Bread and butter', categories)).toBe('cat-food');
    expect(autoSuggestCategory('Eggs breakfast', categories)).toBe('cat-food');
    expect(autoSuggestCategory('Beer cans for party', categories)).toBe('cat-food');
    expect(autoSuggestCategory('Swiggy dinner delivery', categories)).toBe('cat-food');
    expect(autoSuggestCategory('Zomato order', categories)).toBe('cat-food');
    expect(autoSuggestCategory('Starbucks cold brew', categories)).toBe('cat-food');
    expect(autoSuggestCategory('McDonalds meal', categories)).toBe('cat-food');
    expect(autoSuggestCategory('Domino\'s pizza', categories)).toBe('cat-food');
  });

  it('suggests stay category for accommodations and brands', () => {
    expect(autoSuggestCategory('Airbnb villa in Goa', categories)).toBe('cat-stay');
    expect(autoSuggestCategory('Booking.com reservation', categories)).toBe('cat-stay');
    expect(autoSuggestCategory('Hotel room deposit', categories)).toBe('cat-stay');
    expect(autoSuggestCategory('Hostel dorm stay', categories)).toBe('cat-stay');
    expect(autoSuggestCategory('Zostel booking', categories)).toBe('cat-stay');
    expect(autoSuggestCategory('Resort city tax', categories)).toBe('cat-stay');
  });

  it('suggests activities, shopping, and misc items', () => {
    expect(autoSuggestCategory('Museum entry tickets', categories)).toBe('cat-activities');
    expect(autoSuggestCategory('Safari guide tip', categories)).toBe('cat-activities');
    expect(autoSuggestCategory('Scuba diving in coral reef', categories)).toBe('cat-activities');
    expect(autoSuggestCategory('Zara jacket shopping', categories)).toBe('cat-shopping');
    expect(autoSuggestCategory('Decathlon backpack', categories)).toBe('cat-shopping');
    expect(autoSuggestCategory('Apollo pharmacy medicine', categories)).toBe('cat-misc');
    expect(autoSuggestCategory('Airport esim data recharge', categories)).toBe('cat-misc');
  });

  it('prioritizes Brand matches over Item matches (Brand > Item)', () => {
    // "Swiggy petrol" has brand Swiggy (Food) vs item petrol (Travel) -> Food wins
    expect(autoSuggestCategory('Swiggy petrol reimbursement', categories)).toBe('cat-food');

    // "Shell coffee" has brand Shell (Travel) vs item coffee (Food) -> Travel wins
    expect(autoSuggestCategory('Shell coffee and fuel', categories)).toBe('cat-travel');
  });

  it('suggests custom category with custom keywords', () => {
    // Custom category has 'skydiving' and 'dosa'
    expect(autoSuggestCategory('Skydiving at palm beach', categories)).toBe('custom-1');
    expect(autoSuggestCategory('Masala dosa lunch', categories)).toBe('custom-1');
  });

  it('retrieves default keywords dataset for a category via getCategoryKeywords', () => {
    const foodCat = categories[0];
    const dataset = getCategoryKeywords(foodCat);
    expect(dataset.brands.length).toBeGreaterThan(15);
    expect(dataset.items.length).toBeGreaterThan(20);
    expect(dataset.brands).toContain('swiggy');
    expect(dataset.items).toContain('milk');
  });

  it('returns null if no keywords or category names match', () => {
    expect(autoSuggestCategory('Unrelated mysterious expenditure #42', categories)).toBeNull();
  });
});
