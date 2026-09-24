import { describe, expect, it } from 'vitest';
import { extractPrimaryCity } from './tripDestination';

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
