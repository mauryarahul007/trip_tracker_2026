import { describe, expect, it } from 'vitest';
import { collectTripPhotoPlaces } from './tripPhotoPlaces';

describe('collectTripPhotoPlaces', () => {
  it('keeps a single destination as one place', () => {
    expect(collectTripPhotoPlaces('Sikkim')).toEqual(['Sikkim']);
    expect(collectTripPhotoPlaces('Sikkim Backpacking')).toEqual(['Sikkim Backpacking']);
  });

  it('splits a typed route into the places in order', () => {
    expect(collectTripPhotoPlaces('Gangtok → Lachung → Pelling')).toEqual([
      'Gangtok',
      'Lachung',
      'Pelling',
    ]);
    expect(collectTripPhotoPlaces('Gangtok, Pelling & Lachung')).toEqual([
      'Gangtok',
      'Pelling',
      'Lachung',
    ]);
  });

  it('adds route stops that are not already in the destination text', () => {
    expect(collectTripPhotoPlaces('Sikkim', ['Gangtok', 'Pelling', 'Lachung'])).toEqual([
      'Sikkim',
      'Gangtok',
      'Pelling',
      'Lachung',
    ]);
  });

  it('does not repeat a place that is both typed and a stop', () => {
    expect(
      collectTripPhotoPlaces('Gangtok → Pelling', ['gangtok', 'Pelling', 'Lachung'])
    ).toEqual(['Gangtok', 'Pelling', 'Lachung']);
  });

  it('returns nothing when there is no place', () => {
    expect(collectTripPhotoPlaces()).toEqual([]);
    expect(collectTripPhotoPlaces('  ', ['', ' '])).toEqual([]);
  });
});
