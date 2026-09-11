import { describe, it, expect } from 'vitest';
import {
  generateSmartPackingSuggestions,
  inferSeasonalClimate,
  generatePackingGuideNote,
} from './packingSuggestions';

describe('packingSuggestions', () => {
  it('generates beach and sunny suggestions for Goa trip', () => {
    const list = generateSmartPackingSuggestions({
      destination: 'Goa, India',
      durationDays: 4,
      weatherCondition: 'Sunny / Clear',
      avgTemp: 31,
    });

    const ids = list.map((i) => i.id);
    expect(ids).toContain('beach-swim');
    expect(ids).toContain('beach-sunscreen');
    expect(ids).toContain('beach-sunglasses');
    expect(ids).not.toContain('cold-jacket');
  });

  it('generates cold weather gear for mountain winter destination', () => {
    const list = generateSmartPackingSuggestions({
      destination: 'Manali, Himachal',
      durationDays: 5,
      weatherCondition: 'Chilly',
      avgTemp: 6,
    });

    const ids = list.map((i) => i.id);
    expect(ids).toContain('cold-jacket');
    expect(ids).toContain('cold-thermal');
    expect(ids).toContain('cold-beanie');
    // Trekking poles should be present and marked check-in only
    const trekkingPoles = list.find((i) => i.id === 'gear-trekking-poles');
    expect(trekkingPoles).toBeDefined();
    expect(trekkingPoles?.airplaneEligibility).toBe('checkin-only');
  });

  it('includes umbrella and rainwear when rain in weather forecast', () => {
    const list = generateSmartPackingSuggestions({
      destination: 'Mumbai',
      durationDays: 3,
      weatherCondition: 'Heavy rain & thunderstorms',
      avgTemp: 26,
    });

    const ids = list.map((i) => i.id);
    expect(ids).toContain('rain-umbrella');
    expect(ids).toContain('rain-bagcover');
  });

  it('includes universal adapter and passport copy for international trip', () => {
    const list = generateSmartPackingSuggestions({
      destination: 'Tokyo, Japan',
      durationDays: 7,
      isInternational: true,
    });

    const ids = list.map((i) => i.id);
    expect(ids).toContain('elec-adapter');
    expect(ids).toContain('doc-passport-copy');
  });

  it('strictly enforces ICAO / TSA aviation security luggage eligibility rules', () => {
    const list = generateSmartPackingSuggestions({
      destination: 'Singapore',
      durationDays: 4,
    });

    const powerbank = list.find((i) => i.id === 'elec-powerbank');
    expect(powerbank?.airplaneEligibility).toBe('cabin-only');
    expect(powerbank?.cabinNote).toContain('cabin only');

    const passport = list.find((i) => i.id === 'doc-id');
    expect(passport?.airplaneEligibility).toBe('cabin-only');

    const multitool = list.find((i) => i.id === 'gear-multitool');
    expect(multitool?.airplaneEligibility).toBe('checkin-only');
    expect(multitool?.cabinNote?.toLowerCase()).toContain('check-in');
  });

  it('correctly filters out check-in items when in carry-on only mode', () => {
    const list = generateSmartPackingSuggestions({
      destination: 'Manali, Himachal',
      durationDays: 3,
      luggageFilter: 'cabin-only',
    });

    const checkinItems = list.filter((i) => i.airplaneEligibility === 'checkin-only');
    expect(checkinItems.length).toBe(0);

    const ids = list.map((i) => i.id);
    expect(ids).not.toContain('gear-multitool');
    expect(ids).not.toContain('gear-trekking-poles');
    expect(ids).toContain('elec-powerbank');
  });

  it('infers winter climate for December trip when live forecast is unavailable', () => {
    const climate = inferSeasonalClimate('Shimla', '2026-12-15');
    expect(climate.isCold).toBe(true);
    expect(climate.estimatedTempC).toBeLessThanOrEqual(10);
  });

  it('generates a comprehensive markdown travel guide note', () => {
    const list = generateSmartPackingSuggestions({
      destination: 'Paris',
      durationDays: 5,
      isInternational: true,
    });

    const note = generatePackingGuideNote('Paris', '2026-10-01', '2026-10-06', list, '18°C Partly Cloudy');
    expect(note.title).toContain('Paris');
    expect(note.content).toContain('Destination:** Paris');
    expect(note.content).toContain('Airplane Carry-on (Cabin Bag)');
    expect(note.content).toContain('18°C Partly Cloudy');
  });
});
