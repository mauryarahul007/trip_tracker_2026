import type { Member } from '../types';

/**
 * True when a member's optional joinDate/leaveDate range includes the given
 * expense date. Members with no dates set are always present (the default
 * for every existing member -- this only narrows participation when a date
 * range has actually been configured).
 */
export function isMemberPresentOnDate(member: Pick<Member, 'joinDate' | 'leaveDate'>, expenseDate: string): boolean {
  if (member.joinDate && expenseDate < member.joinDate) return false;
  if (member.leaveDate && expenseDate > member.leaveDate) return false;
  return true;
}
