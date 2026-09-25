import { describe, expect, it } from 'vitest';
import { extractPrimaryCity, getItineraryRouteInfo } from './tripDestination';

describe('extractPrimaryCity', () => {
  it('extracts first city from arrow-separated multi-destination routes', () => {
    expect(extractPrimaryCity('Gangtok → Lachung → Pelling')).toEqual({
      primary: 'Gangtok',
      full: 'Gangtok → Lachung → Pelling',
    });
    expect(extractPrimaryCity('Meghalaya -> Arunachal Pradesh')).toEqual({
      primary: 'Meghalaya',
      full: 'Meghalaya -> Arunachal Pradesh',
    });
    expect(extractPrimaryCity('Manali — Shimla – Chandigarh')).toEqual({
      primary: 'Manali',
      full: 'Manali — Shimla – Chandigarh',
    });
  });

  it('extracts first city from comma, pipe, or slash separated destinations', () => {
    expect(extractPrimaryCity('Paris, Rome, Barcelona')).toEqual({
      primary: 'Paris',
      full: 'Paris, Rome, Barcelona',
    });
    expect(extractPrimaryCity('Kyoto / Osaka / Tokyo')).toEqual({
      primary: 'Kyoto',
      full: 'Kyoto / Osaka / Tokyo',
    });
  });

  it('preserves single destinations as both primary and full', () => {
    expect(extractPrimaryCity('Munnar')).toEqual({
      primary: 'Munnar',
      full: 'Munnar',
    });
    expect(extractPrimaryCity('Goa')).toEqual({
      primary: 'Goa',
      full: 'Goa',
    });
  });

  it('falls back to stops if destination is empty', () => {
    expect(extractPrimaryCity('', [{ name: 'Shimla' }, { name: 'Kullu' }])).toEqual({
      primary: 'Shimla',
      full: 'Shimla → Kullu',
    });
  });

  it('handles empty inputs gracefully', () => {
    expect(extractPrimaryCity('')).toEqual({
      primary: '',
      full: '',
    });
    expect(extractPrimaryCity(undefined)).toEqual({
      primary: '',
      full: '',
    });
  });
});

describe('getItineraryRouteInfo', () => {
  it('formats single destination properly', () => {
    const info = getItineraryRouteInfo('Manali');
    expect(info).toEqual({
      primary: 'Manali',
      full: 'Manali',
      segments: ['Manali'],
      stopsCount: 1,
      routeSummary: 'Manali',
      badgeSummary: 'Manali',
    });
  });

  it('formats 2-3 stops with full arrow path', () => {
    const info = getItineraryRouteInfo('Manali → Shimla → Chandigarh');
    expect(info).toEqual({
      primary: 'Manali',
      full: 'Manali → Shimla → Chandigarh',
      segments: ['Manali', 'Shimla', 'Chandigarh'],
      stopsCount: 3,
      routeSummary: 'Manali ➔ Shimla ➔ Chandigarh',
      badgeSummary: 'Manali (+2)',
    });
  });

  it('summarizes 4+ stops to avoid visual clutter', () => {
    const info = getItineraryRouteInfo('Delhi → Agra → Jaipur → Jodhpur → Udaipur');
    expect(info).toEqual({
      primary: 'Delhi',
      full: 'Delhi → Agra → Jaipur → Jodhpur → Udaipur',
      segments: ['Delhi', 'Agra', 'Jaipur', 'Jodhpur', 'Udaipur'],
      stopsCount: 5,
      routeSummary: 'Delhi ➔ Udaipur · 5 stops',
      badgeSummary: 'Delhi (+4)',
    });
  });

  it('handles empty or undefined destinations safely', () => {
    const info = getItineraryRouteInfo('');
    expect(info.stopsCount).toBe(0);
    expect(info.primary).toBe('');
    expect(info.routeSummary).toBe('');
  });
});
