import { describe, it, expect } from 'vitest';
import { getFlightTooltipMessage, STORAGE_KEY } from './FlightAddExpenseTooltip';

describe('FlightAddExpenseTooltip', () => {
  it('defines persistent localStorage storage key', () => {
    expect(STORAGE_KEY).toBe('tt_flight_add_tooltip_dismissed_v1');
  });

  it('shows contextual text: Add expense on Summary and Expenses, and Add member on Members', () => {
    expect(getFlightTooltipMessage(0, 'Goa → Mumbai', 'expenses').text).toBe('Add expense');
    expect(getFlightTooltipMessage(0, '', 'ledger').text).toBe('Add expense');
    expect(getFlightTooltipMessage(3, 'Paris', 'members').text).toBe('Add member');
  });

});
