import { useEffect, useState } from 'react';
import type { Trip, TripStop } from '../types';
import { resolveTripStopCoordinates } from '../utils/geolocation';
import { useTripStore } from '../store/tripStore';

/**
 * Resolves a trip's stops to coordinates, parsing trip.destination as a
 * fallback when trip.stops is empty, and geocoding any stop missing lat/lng.
 */
export function useResolvedTripStops(
  trip: Trip | null | undefined
): (TripStop & { lat: number; lng: number })[] {
  const [resolvedStops, setResolvedStops] = useState<TripStop[]>(trip?.stops || []);
  const enableGeotagging = useTripStore((s) => s.enableGeotagging);

  useEffect(() => {
    let stopList: TripStop[] = trip?.stops && trip.stops.length > 0 ? [...trip.stops] : [];
    if (stopList.length === 0 && trip?.destination) {
      const parts = trip.destination.split(/[→\->,/|]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        stopList = parts.map((name) => ({ id: name, name }));
      }
    }

    if (stopList.length === 0) {
      setResolvedStops([]);
      return;
    }

    const needsGeocode = stopList.some((s) => typeof s.lat !== 'number' || typeof s.lng !== 'number');
    if (!needsGeocode) {
      setResolvedStops(stopList);
      return;
    }

    let isMounted = true;

    resolveTripStopCoordinates(stopList, { useDeviceLocation: enableGeotagging }).then((finalStops) => {
      if (isMounted) setResolvedStops(finalStops);
    });

    return () => {
      isMounted = false;
    };
  }, [trip?.id, trip?.destination, trip?.stops]);

  return resolvedStops.filter(
    (s): s is TripStop & { lat: number; lng: number } =>
      typeof s.lat === 'number' && typeof s.lng === 'number' && !isNaN(s.lat) && !isNaN(s.lng)
  );
}
