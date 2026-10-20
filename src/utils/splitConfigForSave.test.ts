import { describe, expect, it } from 'vitest';
import { splitConfigForSave } from './splitConfigForSave';

describe('splitConfigForSave', () => {
  it('keeps Shares weights so an edit does not fall back to equal', () => {
    expect(splitConfigForSave('custom', { a: 2, b: 1 })).toEqual({ a: 2, b: 1 });
  });

  it('keeps the previous Shares map when an edit omits weights', () => {
    expect(splitConfigForSave('custom', undefined, { a: 2, b: 1 })).toEqual({ a: 2, b: 1 });
    expect(splitConfigForSave('custom', {}, { a: 3 })).toEqual({ a: 3 });
  });

  it('persists exact and percentage numbers', () => {
    expect(splitConfigForSave('exact', { a: 40, b: 60 })).toEqual({ a: 40, b: 60 });
    expect(splitConfigForSave('percentage', { a: 25, b: 75 })).toEqual({ a: 25, b: 75 });
  });

  it('does not store a config for equal splits', () => {
    expect(splitConfigForSave('equal', { a: 1 }, { a: 2 })).toBeUndefined();
    expect(splitConfigForSave('itemized', { a: 1 })).toBeUndefined();
  });
});
