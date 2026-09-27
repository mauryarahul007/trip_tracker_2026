import { lazy, Suspense, useEffect, useState } from 'react';
import type { Trip } from '../types';
import { lazyImport } from '../utils/lazyImport';
import { useTripPhoto } from './TripStack';

const TripMapHero = lazy(lazyImport(() =>
  import('./TripMapHero').then((m) => ({ default: m.TripMapHero }))
));

type Props = {
  trip: Trip | null;
  onToneChange: (tone: 'light' | 'dark') => void;
};

// The live map (maplibre, ~1MB) used to load the instant a trip opened,
// competing with the trip's own data. Now the destination photo -- already
// cached from the trip card -- paints first, and the map mounts once the
// browser is idle underneath the photo, and the photo fades away only once
// the map has drawn tiles ('load') -- never a blank map frame in between.
// A trip with no resolvable stops never loads a map, so it keeps the photo.
export function DeferredTripMapHero({ trip, onToneChange }: Props) {
  const [mapReady, setMapReady] = useState(false);
  const [mapDrawn, setMapDrawn] = useState(false);
  const photoUrl = useTripPhoto(trip?.destination, trip?.coverImageUrl, trip?.name);

  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setMapReady(true), { timeout: 1200 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setMapReady(true), 300);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      {mapReady && (
        <Suspense fallback={null}>
          <TripMapHero trip={trip} onToneChange={onToneChange} onReady={() => setMapDrawn(true)} />
        </Suspense>
      )}
      <div
        className={`trip-map-hero trip-photo-hero${mapDrawn ? ' is-hidden' : ''}`}
        style={photoUrl ? { backgroundImage: `url("${photoUrl}")` } : undefined}
        aria-hidden="true"
      />
    </>
  );
}
