import { useEffect, useState } from 'react';
import type { Trip } from '../types';
import { fetchPlaceCoverImage } from '../services/placeImageService';

interface Props {
  trip: Trip | null;
}

interface PlacePhoto {
  place: string;
  url: string;
}

export function AmbientPhotoBackdrop({ trip }: Props) {
  const [photos, setPhotos] = useState<PlacePhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Extract all distinct cities/places from stops and destination
  useEffect(() => {
    if (!trip) {
      setPhotos([]);
      return;
    }

    const places: string[] = [];
    if (trip.stops && trip.stops.length > 0) {
      trip.stops.forEach((s) => {
        if (s.name.trim()) places.push(s.name.trim());
      });
    } else if (trip.destination) {
      const parts = trip.destination.split(/[→\->,/|]/).map((p) => p.trim()).filter(Boolean);
      places.push(...parts);
    }

    // Deduplicate
    const uniquePlaces = Array.from(new Set(places));
    if (uniquePlaces.length === 0) {
      if (trip.coverImageUrl) {
        setPhotos([{ place: trip.name, url: trip.coverImageUrl }]);
      } else {
        setPhotos([]);
      }
      return;
    }

    let isMounted = true;

    // Fetch photos for all unique places
    Promise.all(
      uniquePlaces.map(async (place) => {
        try {
          const url = await fetchPlaceCoverImage(place);
          if (url) {
            return { place, url };
          }
        } catch {}
        return null;
      })
    ).then((resolved) => {
      if (!isMounted) return;
      const valid = resolved.filter((p): p is PlacePhoto => p !== null);
      if (valid.length > 0) {
        setPhotos(valid);
      } else if (trip.coverImageUrl) {
        setPhotos([{ place: trip.name, url: trip.coverImageUrl }]);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [trip?.id, trip?.destination, trip?.stops?.length]);

  // Slideshow interval: cycle every 6.5 seconds
  useEffect(() => {
    if (photos.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 6500);

    return () => clearInterval(timer);
  }, [photos.length]);

  if (photos.length === 0) return null;

  return (
    <div
      className="ambient-photo-backdrop-container"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {photos.map((photo, idx) => {
        const isActive = idx === currentIndex;
        return (
          <div
            key={photo.url + idx}
            style={{
              position: 'absolute',
              inset: '-20px',
              backgroundImage: `url(${photo.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              // 0.16 read as a flat color wash against the light Skyline
              // Escape theme -- the photo was loading successfully but
              // imperceptible. Bumped enough to actually show the place,
              // still subdued enough to keep foreground cards legible.
              opacity: isActive ? 0.5 : 0,
              filter: 'blur(4px) saturate(1.25)',
              transform: isActive ? 'scale(1.04) translateZ(0)' : 'scale(1.0) translateZ(0)',
              transition: 'opacity 1.4s ease-in-out, transform 8s ease-out',
              willChange: 'opacity, transform',
            }}
          />
        );
      })}

      {/* Subtle place indicator badge */}
      {photos.length > 0 && photos[currentIndex] && (
        <div
          style={{
            position: 'fixed',
            bottom: '72px',
            right: '16px',
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 9px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            pointerEvents: 'none',
            transition: 'opacity 0.5s ease',
          }}
        >
          <span>📍 {photos[currentIndex].place}</span>
          {photos.length > 1 && (
            <span style={{ opacity: 0.6, fontSize: '9.5px' }}>
              ({currentIndex + 1}/{photos.length})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
