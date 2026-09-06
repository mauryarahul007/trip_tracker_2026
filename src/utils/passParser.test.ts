import { describe, it, expect } from 'vitest';
import { parseBookingText, parseAllBookingPasses, extractPassengers, extractReferenceCodes } from './passParser';

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

  it('parses real multi-leg Cleartrip IndiGo e-ticket itinerary', () => {
    const ticketText = `Trip ID : 260807634788
Baggage (per Adult/Child) – Check-in: 15KG (1 piece), Cabin: 7KG (1 piece)
Ms Upama Maurya
Mr RAHUL MAURYA
Bengaluru to Bagdogra Sat, 10 Oct 2026
IndiGo
6E - 537
Fare type: SAVER
BLR 10:15 11:30 HYD
Sat, 10 Oct 2026 1h 15min Sat, 10 Oct 2026
Bengaluru - Kempegowda
International Airport Terminal 1
Economy Hyderabad - Rajiv Gandhi
Short layover : 1h 55min.
IndiGo
6E - 149
Fare type: SAVER
HYD 13:25 15:45 IXB
Sat, 10 Oct 2026 2h 20min Sat, 10 Oct 2026
Hyderabad - Rajiv Gandhi
Economy Bagdogra - Bagdogra
Bagdogra to Bengaluru Sat, 17 Oct 2026
IndiGo
6E - 445
Fare type: SAVER
IXB 11:40 14:35 BLR
Sat, 17 Oct 2026 2h 55min Sat, 17 Oct 2026
Bagdogra - Bagdogra Economy Bengaluru - Kempegowda
TRAVELLERS AIRLINE PNR TICKET NO.
YI77GE
X89JTF
YI77GE
X89JTF`;

    const passes = parseAllBookingPasses(ticketText);
    expect(passes.length).toBe(3);

    // Segment 1: BLR -> HYD
    expect(passes[0].provider).toBe('IndiGo');
    expect(passes[0].origin).toBe('BLR');
    expect(passes[0].destination).toBe('HYD');
    expect(passes[0].title).toContain('6E-537');
    expect(passes[0].startDateTime).toContain('10:15');
    expect(passes[0].referenceCode).toBe('YI77GE');
    expect(passes[0].notes).toContain('Upama Maurya');
    expect(passes[0].notes).toContain('260807634788');

    // Segment 2: HYD -> IXB
    expect(passes[1].provider).toBe('IndiGo');
    expect(passes[1].origin).toBe('HYD');
    expect(passes[1].destination).toBe('IXB');
    expect(passes[1].title).toContain('6E-149');
    expect(passes[1].startDateTime).toContain('13:25');

    // Segment 3: IXB -> BLR
    expect(passes[2].provider).toBe('IndiGo');
    expect(passes[2].origin).toBe('IXB');
    expect(passes[2].destination).toBe('BLR');
    expect(passes[2].title).toContain('6E-445');
    expect(passes[2].startDateTime).toContain('11:40');

    // Passengers & PNR helpers
    const passengers = extractPassengers(ticketText);
    expect(passengers).toContain('Ms Upama Maurya');
    expect(passengers).toContain('Mr RAHUL MAURYA');

    const refs = extractReferenceCodes(ticketText);
    expect(refs.pnrList).toContain('YI77GE');
    expect(refs.pnrList).toContain('X89JTF');
    expect(refs.tripId).toBe('260807634788');
  });
});
