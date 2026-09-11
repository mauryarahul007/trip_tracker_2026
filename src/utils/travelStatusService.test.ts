import { describe, it, expect } from 'vitest';
import { extractFlightStatus, extractTrainStatus, getTravelStatusInfo } from './travelStatusService';
import type { TravelPass } from '../types';

describe('travelStatusService', () => {
  it('extracts flight status info for IndiGo 6E 2132', () => {
    const flightPass: Partial<TravelPass> = {
      type: 'flight',
      title: 'Flight to Goa',
      legIdentifier: '6E 2132',
      origin: 'DEL',
      destination: 'GOI',
      startDateTime: '2026-09-15T10:30',
    };

    const status = extractFlightStatus(flightPass);
    expect(status).not.toBeNull();
    expect(status?.carrierCode).toBe('6E');
    expect(status?.flightNumber).toBe('2132');
    expect(status?.fullFlightCode).toBe('6E-2132');
    expect(status?.airlineName).toBe('IndiGo');
    expect(status?.googleStatusUrl).toContain('6E-2132');
    expect(status?.flightradar24Url).toContain('6e2132');
    expect(status?.flightAwareUrl).toContain('IGO2132');
  });

  it('extracts flight status info for Air India AI 101 from reference code', () => {
    const flightPass: Partial<TravelPass> = {
      type: 'flight',
      title: 'Flight to New York',
      referenceCode: 'AI101',
      provider: 'Air India',
    };

    const status = extractFlightStatus(flightPass);
    expect(status).not.toBeNull();
    expect(status?.carrierCode).toBe('AI');
    expect(status?.flightNumber).toBe('101');
    expect(status?.fullFlightCode).toBe('AI-101');
    expect(status?.airlineName).toBe('Air India');
    expect(status?.flightAwareUrl).toContain('AIC101');
  });

  it('extracts train status info for 10-digit PNR', () => {
    const trainPass: Partial<TravelPass> = {
      type: 'train',
      title: 'Vande Bharat Express',
      bookingId: '2849182391',
      legIdentifier: '20608',
      origin: 'SBC',
      destination: 'MAS',
    };

    const status = extractTrainStatus(trainPass);
    expect(status).not.toBeNull();
    expect(status?.pnr).toBe('2849182391');
    expect(status?.trainNumber).toBe('20608');
    expect(status?.confirmTktUrl).toContain('2849182391');
    expect(status?.googleLiveTrainUrl).toContain('20608');
  });

  it('handles formatted PNR with spaces or dashes', () => {
    const trainPass: Partial<TravelPass> = {
      type: 'train',
      title: 'Rajdhani Express',
      referenceCode: 'PNR: 284-918-2391',
    };

    const status = extractTrainStatus(trainPass);
    expect(status).not.toBeNull();
    expect(status?.pnr).toBe('2849182391');
  });

  it('extracts hyphenated flight code 6E-537 correctly with carrier and flight number', () => {
    const flightPass: Partial<TravelPass> = {
      type: 'flight',
      title: 'Rahul · IndiGo 6E-537 (BLR ➔ HYD)',
      legIdentifier: '6E537_BLR_HYD',
      origin: 'BLR',
      destination: 'HYD',
    };

    const status = extractFlightStatus(flightPass);
    expect(status).not.toBeNull();
    expect(status?.carrierCode).toBe('6E');
    expect(status?.flightNumber).toBe('537');
    expect(status?.fullFlightCode).toBe('6E-537');
    expect(status?.airlineName).toBe('IndiGo');
    expect(status?.googleStatusUrl).toContain('6E-537');
    expect(status?.flightradar24Url).toContain('6e537');
    expect(status?.flightAwareUrl).toContain('IGO537');
    expect(status?.flightStatsUrl).toContain('6E/537');
  });

  it('handles spaces around hyphen like 6E - 537 and title fallback', () => {
    const flightPass: Partial<TravelPass> = {
      type: 'flight',
      title: 'IndiGo 6E - 537 flight to Mumbai',
    };

    const status = extractFlightStatus(flightPass);
    expect(status).not.toBeNull();
    expect(status?.carrierCode).toBe('6E');
    expect(status?.flightNumber).toBe('537');
    expect(status?.fullFlightCode).toBe('6E-537');
    expect(status?.flightradar24Url).toContain('6e537');
    expect(status?.flightAwareUrl).toContain('IGO537');
  });

  it('resolves flight number from provider hint when code is omitted', () => {
    const flightPass: Partial<TravelPass> = {
      type: 'flight',
      title: 'Flight 537',
      provider: 'IndiGo',
    };

    const status = extractFlightStatus(flightPass);
    expect(status).not.toBeNull();
    expect(status?.carrierCode).toBe('6E');
    expect(status?.flightNumber).toBe('537');
    expect(status?.fullFlightCode).toBe('6E-537');
    expect(status?.airlineName).toBe('IndiGo');
  });

  it('returns null for stay or activity passes without flight/train info', () => {
    const stayPass: TravelPass = {
      id: 'p-1',
      tripId: 't-1',
      type: 'stay',
      title: 'Taj Exotica',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(getTravelStatusInfo(stayPass)).toBeNull();
  });
});

