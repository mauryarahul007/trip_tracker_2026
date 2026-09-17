import { getCurrentGPSPosition } from '../utils/geolocation';
import { updateLocationShare } from './locationShareApi';

const HEARTBEAT_MS = 60 * 1000;

let activeTripId: string | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let visibilityBound = false;

async function tick(tripId: string): Promise<void> {
  const pos = await getCurrentGPSPosition();
  if (pos) {
    await updateLocationShare(tripId, pos.lat, pos.lng).catch(() => {});
  }
}

function onVisibilityChange(): void {
  if (document.visibilityState !== 'visible' || !activeTripId) return;
  void tick(activeTripId);
}

/**
 * App-foreground live-location heartbeat. Survives closing the share modal
 * while the app stays open. Pauses naturally when the tab is hidden (browsers
 * throttle timers); fires an immediate update when the tab becomes visible again.
 * Does not provide OS-level background GPS.
 */
export function startLiveLocationHeartbeat(tripId: string): void {
  if (activeTripId === tripId && intervalId) {
    void tick(tripId);
    return;
  }
  stopLiveLocationHeartbeat();
  activeTripId = tripId;
  void tick(tripId);
  intervalId = setInterval(() => {
    if (activeTripId) void tick(activeTripId);
  }, HEARTBEAT_MS);
  if (!visibilityBound && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
    visibilityBound = true;
  }
}

export function stopLiveLocationHeartbeat(tripId?: string): void {
  if (tripId && activeTripId && tripId !== activeTripId) return;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  activeTripId = null;
}

export function getLiveLocationHeartbeatTripId(): string | null {
  return activeTripId;
}
