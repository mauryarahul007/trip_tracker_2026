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
    // 2 passengers (Ms Upama Maurya, Mr RAHUL MAURYA) x 3 flight legs = 6 passes
    expect(passes.length).toBe(6);

    // Segment 1 (BLR -> HYD) for Passenger 1
    expect(passes[0].provider).toBe('IndiGo');
    expect(passes[0].origin).toBe('BLR');
    expect(passes[0].destination).toBe('HYD');
    expect(passes[0].title).toContain('6E-537');
    expect(passes[0].title).toContain('Upama Maurya');
    expect(passes[0].passengerName).toBe('Upama Maurya');
    expect(passes[0].startDateTime).toContain('10:15');
    expect(passes[0].referenceCode).toBe('YI77GE');
    expect(passes[0].notes).toContain('260807634788');

    // Segment 1 (BLR -> HYD) for Passenger 2
    expect(passes[1].provider).toBe('IndiGo');
    expect(passes[1].origin).toBe('BLR');
    expect(passes[1].destination).toBe('HYD');
    expect(passes[1].passengerName).toBe('Rahul Maurya');
    expect(passes[1].referenceCode).toBe('YI77GE');

    // Segment 2 (HYD -> IXB) for Passenger 1
    expect(passes[2].provider).toBe('IndiGo');
    expect(passes[2].origin).toBe('HYD');
    expect(passes[2].destination).toBe('IXB');
    expect(passes[2].title).toContain('6E-149');
    expect(passes[2].startDateTime).toContain('13:25');
    expect(passes[2].passengerName).toBe('Upama Maurya');

    // Segment 3 (IXB -> BLR)
    expect(passes[4].origin).toBe('IXB');
    expect(passes[4].destination).toBe('BLR');
    expect(passes[4].title).toContain('6E-445');
    expect(passes[4].passengerName).toBe('Upama Maurya');
    expect(passes[5].passengerName).toBe('Rahul Maurya');

    // Passengers & PNR helpers
    const passengers = extractPassengers(ticketText);
    expect(passengers).toContain('Ms Upama Maurya');
    expect(passengers).toContain('Mr RAHUL MAURYA');

    const refs = extractReferenceCodes(ticketText);
    expect(refs.pnrList).toContain('YI77GE');
    expect(refs.pnrList).toContain('X89JTF');
    expect(refs.tripId).toBe('260807634788');
  });

  it('parses SmartBuy / Cleartrip numbered e-ticket (3 legs, 2 passengers, distinct return PNR)', () => {
    const smartBuyTicketText = `E-Ticket booked with Booking Confirmed
Booking ID : 44117860941262337908
CLEARTRIP Ref ID : 260807625554
Booked on: Fri, 07 Aug 2026 14:46:25
For any assistance regarding your booking, please contact CLEARTRIP :
Email: www.cleartrip.com/support
Call: +91 9595333333

Departure Flight
Bangalore to Hyderabad | Sat, 10 Oct 2026 PNR Number : K6BP5V
IndiGo   6E - 537
10:15 BLR
Sat, 10 Oct 2026
Kempegowda International
Airport
Terminal: 1
1 h 15 min
Economy
HYD 11:30
Sat, 10 Oct 2026
Rajiv Gandhi International
Terminal: NA

Hyderabad to Bagdogra | Sat, 10 Oct 2026 PNR Number : K6BP5V
IndiGo   6E - 149
13:25 HYD
Sat, 10 Oct 2026
Rajiv Gandhi International
Terminal: NA
2 h 20 min
Economy
IXB 15:45
Sat, 10 Oct 2026
Bagdogra
Terminal: NA

Return Flight
Bagdogra to Bangalore | Sat, 17 Oct 2026 PNR Number : H4SBKL
IndiGo   6E - 445
11:40 IXB
Sat, 17 Oct 2026
Bagdogra
Terminal: NA
2 h 55 min
Economy
BLR 14:35
Sat, 17 Oct 2026
Kempegowda International
Airport
Terminal: 1

Traveller Details
Passenger
Name
Sector Class/Cabin Seat No. Meal(Name) Extra Baggage
Travel
Insurance
Status
Ms. Asmita
Bhosale (Adult)
BLR-HYD | HYD-IXB <>
IXB-BLR
Economy - - - - Confirmed
Mr. Suyog
Gadhave (Adult)
BLR-HYD | HYD-IXB <>
IXB-BLR
Economy - - - - Confirmed

Barcode(s) for your journey
Ms. Asmita Bhosale (Adult)
BLR - HYD
HYD - IXB
IXB - BLR
Mr. Suyog Gadhave (Adult)
BLR - HYD
HYD - IXB
IXB - BLR

Fare Summary
Fare Details Amount(₹)
Base Fare ₹ 44,888
Total Tax ₹ 7938
CLEARTRIP Convenience Fee (Non-Refundable) ₹ 1,780
Total ₹ 54,606`;

    const passes = parseAllBookingPasses(smartBuyTicketText);

    // 2 passengers (Asmita Bhosale, Suyog Gadhave) x 3 flight segments = 6 passes
    expect(passes.length).toBe(6);

    // Leg 1: Bangalore -> Hyderabad (6E-537)
    expect(passes[0].provider).toBe('IndiGo');
    expect(passes[0].origin).toBe('BLR');
    expect(passes[0].destination).toBe('HYD');
    expect(passes[0].passengerName).toBe('Asmita Bhosale');
    expect(passes[0].referenceCode).toBe('K6BP5V');
    expect(passes[0].startDateTime).toContain('10:15');
    expect(passes[0].endDateTime).toContain('11:30');

    expect(passes[1].provider).toBe('IndiGo');
    expect(passes[1].origin).toBe('BLR');
    expect(passes[1].destination).toBe('HYD');
    expect(passes[1].passengerName).toBe('Suyog Gadhave');
    expect(passes[1].referenceCode).toBe('K6BP5V');

    // Leg 2: Hyderabad -> Bagdogra (6E-149)
    expect(passes[2].provider).toBe('IndiGo');
    expect(passes[2].origin).toBe('HYD');
    expect(passes[2].destination).toBe('IXB');
    expect(passes[2].passengerName).toBe('Asmita Bhosale');
    expect(passes[2].referenceCode).toBe('K6BP5V');
    expect(passes[2].startDateTime).toContain('13:25');
    expect(passes[2].endDateTime).toContain('15:45');

    expect(passes[3].provider).toBe('IndiGo');
    expect(passes[3].origin).toBe('HYD');
    expect(passes[3].destination).toBe('IXB');
    expect(passes[3].passengerName).toBe('Suyog Gadhave');
    expect(passes[3].referenceCode).toBe('K6BP5V');

    // Leg 3: Bagdogra -> Bangalore (6E-445) - note separate return PNR: H4SBKL
    expect(passes[4].provider).toBe('IndiGo');
    expect(passes[4].origin).toBe('IXB');
    expect(passes[4].destination).toBe('BLR');
    expect(passes[4].passengerName).toBe('Asmita Bhosale');
    expect(passes[4].referenceCode).toBe('H4SBKL');
    expect(passes[4].startDateTime).toContain('11:40');
    expect(passes[4].endDateTime).toContain('14:35');

    expect(passes[5].provider).toBe('IndiGo');
    expect(passes[5].origin).toBe('IXB');
    expect(passes[5].destination).toBe('BLR');
    expect(passes[5].passengerName).toBe('Suyog Gadhave');
    expect(passes[5].referenceCode).toBe('H4SBKL');

    // Passengers helper check
    const passengers = extractPassengers(smartBuyTicketText);
    expect(passengers.some((p) => p.includes('Asmita Bhosale'))).toBe(true);
    expect(passengers.some((p) => p.includes('Suyog Gadhave'))).toBe(true);

    // Reference codes check
    const refs = extractReferenceCodes(smartBuyTicketText);
    expect(refs.pnrList).toContain('K6BP5V');
    expect(refs.pnrList).toContain('H4SBKL');
    expect(refs.tripId).toBe('44117860941262337908');
  });

  it('parses MakeMyTrip / Goibibo multi-leg booking format', () => {
    const mmtTicketText = `Flight Booking Confirmed - MMT
Booking ID: NF281948201948
New Delhi to Mumbai | 15 Nov 2026 PNR: MMTBOM
IndiGo 6E 2051
Departure: DEL 08:30 hrs | Indira Gandhi Intl T1D
Arrival: BOM 10:45 hrs | Chhatrapati Shivaji T1

Mumbai to Goa | 15 Nov 2026 PNR: MMTBOM
Air India AI 621
Departure: BOM 14:00 hrs | T2
Arrival: GOI 15:15 hrs | Dabolim Airport

Traveller:
Mr Ramesh Sharma (Adult)`;

    const passes = parseAllBookingPasses(mmtTicketText);
    expect(passes.length).toBe(2);

    expect(passes[0].provider).toBe('IndiGo');
    expect(passes[0].origin).toBe('DEL');
    expect(passes[0].destination).toBe('BOM');
    expect(passes[0].startDateTime).toContain('08:30');
    expect(passes[0].passengerName).toBe('Ramesh Sharma');
    expect(passes[0].referenceCode).toBe('MMTBOM');

    expect(passes[1].provider).toBe('Air India');
    expect(passes[1].origin).toBe('BOM');
    expect(passes[1].destination).toBe('GOI');
    expect(passes[1].startDateTime).toContain('14:00');
    expect(passes[1].passengerName).toBe('Ramesh Sharma');
  });

  it('parses direct airline multi-leg itinerary (IndiGo / Air India flight anchor chunking)', () => {
    const directItinerary = `Booking Reference (PNR): 6EBOOK1
Itinerary Confirmation

Flight: 6E 537
Depart: BLR 10:15 | Sat, 10 Oct 2026
Arrive: HYD 11:30 | Sat, 10 Oct 2026
Seat: 14A

Flight: 6E 149
Depart: HYD 13:25 | Sat, 10 Oct 2026
Arrive: IXB 15:45 | Sat, 10 Oct 2026
Seat: 16C

Passenger:
Mr Vikram Malhotra`;

    const passes = parseAllBookingPasses(directItinerary);
    expect(passes.length).toBe(2);

    expect(passes[0].provider).toBe('IndiGo');
    expect(passes[0].origin).toBe('BLR');
    expect(passes[0].destination).toBe('HYD');
    expect(passes[0].startDateTime).toContain('10:15');
    expect(passes[0].passengerName).toBe('Vikram Malhotra');
    expect(passes[0].seatOrRoom).toBe('Seat 14A');
    expect(passes[0].referenceCode).toBe('6EBOOK1');

    expect(passes[1].provider).toBe('IndiGo');
    expect(passes[1].origin).toBe('HYD');
    expect(passes[1].destination).toBe('IXB');
    expect(passes[1].startDateTime).toContain('13:25');
    expect(passes[1].passengerName).toBe('Vikram Malhotra');
    expect(passes[1].seatOrRoom).toBe('Seat 16C');
  });
});


