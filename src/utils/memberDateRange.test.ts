import { describe, it, expect } from 'vitest';
import { isMemberPresentOnDate } from './memberDateRange';

describe('isMemberPresentOnDate', () => {
  it('is present when no dates are set', () => {
    expect(isMemberPresentOnDate({}, '2026-06-03')).toBe(true);
  });

  it('is absent before the join date', () => {
    expect(isMemberPresentOnDate({ joinDate: '2026-06-03' }, '2026-06-02')).toBe(false);
  });

  it('is present on the join date itself', () => {
    expect(isMemberPresentOnDate({ joinDate: '2026-06-03' }, '2026-06-03')).toBe(true);
  });

  it('is absent after the leave date', () => {
    expect(isMemberPresentOnDate({ leaveDate: '2026-06-03' }, '2026-06-04')).toBe(false);
  });

  it('is present on the leave date itself', () => {
    expect(isMemberPresentOnDate({ leaveDate: '2026-06-03' }, '2026-06-03')).toBe(true);
  });

  it('respects a full range', () => {
    const member = { joinDate: '2026-06-03', leaveDate: '2026-06-05' };
    expect(isMemberPresentOnDate(member, '2026-06-02')).toBe(false);
    expect(isMemberPresentOnDate(member, '2026-06-04')).toBe(true);
    expect(isMemberPresentOnDate(member, '2026-06-06')).toBe(false);
  });
});
