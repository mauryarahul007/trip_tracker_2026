import { describe, it, expect } from 'vitest';
import { getFlightTooltipMessage, STORAGE_KEY } from './FlightAddExpenseTooltip';

describe('FlightAddExpenseTooltip', () => {
  it('defines persistent localStorage storage key', () => {
    expect(STORAGE_KEY).toBe('tt_flight_add_tooltip_dismissed_v1');
  });

  it('generates takeoff message with destination for 0 expenses', () => {
    const msg = getFlightTooltipMessage(0, 'Goa → Mumbai');
    expect(msg.badge).toBe('✈️ Takeoff');
    expect(msg.text).toBe('Ready for Goa? Log your 1st expense!');
  });

  it('generates generic takeoff message when no destination is provided', () => {
    const msg = getFlightTooltipMessage(0, '');
    expect(msg.badge).toBe('✈️ Takeoff');
    expect(msg.text).toBe('Ready for takeoff? Tap + to log an expense!');
  });

  it('generates quick add message when expenses already exist', () => {
    const msg = getFlightTooltipMessage(3, 'Paris');
    expect(msg.badge).toBe('⚡ Quick Add');
    expect(msg.text).toBe('Tap + to split flights, stay or food');
  });
});
