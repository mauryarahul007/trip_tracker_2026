import { useEffect, useRef, useState } from 'react';
import type { Trip } from '../types';
import { useTripPhoto } from './TripStack';

interface Props {
  trip: Trip | null;
}

const VISIBLE_OPACITY = 0.4;

// Blurred, translucent backdrop behind the home screen showing whichever
// trip is currently front of the swipe stack. Reuses the same cached photo
// URL the card itself already fetched (fetchPlaceCoverImage dedupes by
// place name at module scope) -- no extra network requests, just an extra
// place to paint the same image. Two stacked layers crossfade on swipe
// instead of snapping, since background-image itself isn't animatable.
export function HomeAmbientBackdrop({ trip }: Props) {
  const photoUrl = useTripPhoto(trip?.destination);
  const [layers, setLayers] = useState<{ url: string; key: number }[]>([]);
  const nextKey = useRef(0);

  useEffect(() => {
    if (!photoUrl) return;
    setLayers((prev) => {
      if (prev[prev.length - 1]?.url === photoUrl) return prev;
      nextKey.current += 1;
      // Keep only the incoming layer plus the one it's crossfading over --
      // older ones are already invisible and just dead weight in the DOM.
      return [...prev.slice(-1), { url: photoUrl, key: nextKey.current }];
    });
  }, [photoUrl]);

  if (layers.length === 0) return null;

  return (
    <div className="home-ambient-backdrop" aria-hidden="true">
      {layers.map((layer, idx) => (
        <div
          key={layer.key}
          className="home-ambient-layer"
          style={{
            backgroundImage: `url("${layer.url}")`,
            opacity: idx === layers.length - 1 ? VISIBLE_OPACITY : 0,
          }}
        />
      ))}
    </div>
  );
}
