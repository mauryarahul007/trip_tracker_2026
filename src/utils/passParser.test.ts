import { describe, it, expect } from 'vitest';
import { parseBookingText } from './passParser';

describe('passParser', () => {
  it('parses flight booking SMS with PNR and route', () => {
    const raw = 'IndiGo: Flight 6E-204 from DEL to GOI on 15 Oct at 08:30 AM is confirmed. PNR: ABC123. Terminal 3.';
    const res = parseBookingText(raw);

    expect(res.type).toBe('flight');
    expect(res.provider).toBe('IndiGo');
    expect(res.referenceCode).toBe('ABC123');
    expect(res.origin).toBe('DEL');
    expect(res.destination).toBe('GOI');
    expect(res.startDateTime).toBe('15 Oct at 08:30 AM');
  });

  it('parses hotel booking confirmation', () => {
    const raw = 'Booking.com: Your reservation at Taj Exotica Resort is confirmed. Confirmation code: 9876543. Check-in on 20-Oct-2026.';
    const res = parseBookingText(raw);

    expect(res.type).toBe('stay');
    expect(res.provider).toBe('Booking.com');
    expect(res.referenceCode).toBe('9876543');
    expect(res.title).toContain('Taj Exotica');
  });

  it('parses train booking with IRCTC and seat details', () => {
    const raw = 'IRCTC: Train 12951 from NDLS to MMCT. PNR: 24589102. Seat B3 24.';
    const res = parseBookingText(raw);

    expect(res.type).toBe('train');
    expect(res.provider).toBe('IRCTC');
    expect(res.referenceCode).toBe('24589102');
    expect(res.seatOrRoom).toBe('Seat B3');
  });

  it('parses generic activity booking', () => {
    const raw = 'GetYourGuide: Sunset Sailing Cruise in Goa on 18 Oct at 05:00 PM. Booking ref: GYG9988.';
    const res = parseBookingText(raw);

    expect(res.type).toBe('activity');
    expect(res.provider).toBe('GetYourGuide');
    expect(res.referenceCode).toBe('GYG9988');
    expect(res.startDateTime).toBe('18 Oct at 05:00 PM');
  });
});
