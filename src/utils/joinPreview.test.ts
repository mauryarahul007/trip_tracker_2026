import { describe, it, expect } from 'vitest';
import { mapJoinPreviewRow, toFirstName } from './joinPreview';

describe('joinPreview', () => {
  it('keeps only first names even if the RPC leaked a full name', () => {
    expect(toFirstName('Rahul Sharma')).toBe('Rahul');
    expect(toFirstName('  Mary Jane Watson  ')).toBe('Mary');
  });

  it('maps a public preview row without trip or member ids', () => {
    const preview = mapJoinPreviewRow({
      trip_name: 'Goa Weekend',
      start_date: '2026-10-12',
      end_date: '2026-10-15',
      member_first_names: ['Rahul Sharma', 'Priya', 'Alex'],
    });

    expect(preview).toEqual({
      tripName: 'Goa Weekend',
      startDate: '2026-10-12',
      endDate: '2026-10-15',
      memberFirstNames: ['Rahul', 'Priya', 'Alex'],
    });
    expect(preview).not.toHaveProperty('tripId');
  });

  it('returns null for an unknown or empty code result', () => {
    expect(mapJoinPreviewRow(null)).toBeNull();
    expect(mapJoinPreviewRow({ trip_name: null })).toBeNull();
    expect(mapJoinPreviewRow({ trip_name: '' })).toBeNull();
  });
});
