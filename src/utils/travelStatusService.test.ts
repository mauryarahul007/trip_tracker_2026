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
    expect(status?.airlineName).toBe('IndiGo');
    expect(status?.googleStatusUrl).toContain('6E%202132');
    expect(status?.flightradar24Url).toContain('6e2132');
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
    expect(status?.airlineName).toBe('Air India');
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
