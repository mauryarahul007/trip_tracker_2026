import { describe, it, expect } from 'vitest';
import { getFlightTooltipMessage, STORAGE_KEY } from './FlightAddExpenseTooltip';

describe('FlightAddExpenseTooltip', () => {
  it('defines persistent localStorage storage key', () => {
    expect(STORAGE_KEY).toBe('tt_flight_add_tooltip_dismissed_v1');
  });

  it('always shows a plain "Add expense" message regardless of trip state', () => {
    expect(getFlightTooltipMessage(0, 'Goa → Mumbai').text).toBe('Add expense');
    expect(getFlightTooltipMessage(0, '').text).toBe('Add expense');
    expect(getFlightTooltipMessage(3, 'Paris').text).toBe('Add expense');
  });
});
