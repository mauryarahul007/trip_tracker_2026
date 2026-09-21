import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'tt-chat-mute-events:v1:';
const changeEvent = 'tt-chat-mute-events-change';

function keyFor(tripId: string): string {
  return `${PREFIX}${tripId}`;
}

export function getChatMuteEventCards(tripId: string): boolean {
  try {
    return localStorage.getItem(keyFor(tripId)) === '1';
  } catch {
    return false;
  }
}

export function setChatMuteEventCards(tripId: string, muted: boolean): void {
  try {
    localStorage.setItem(keyFor(tripId), muted ? '1' : '0');
    window.dispatchEvent(new Event(changeEvent));
  } catch {
    // storage blocked or full -- preference just won't persist
  }
}

export function useChatMuteEventCards(tripId: string): [boolean, (next: boolean) => void] {
  const [muted, setMuted] = useState(() => getChatMuteEventCards(tripId));

  useEffect(() => {
    setMuted(getChatMuteEventCards(tripId));
    const handler = () => setMuted(getChatMuteEventCards(tripId));
    window.addEventListener(changeEvent, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(changeEvent, handler);
      window.removeEventListener('storage', handler);
    };
  }, [tripId]);

  const set = useCallback((next: boolean) => {
    setChatMuteEventCards(tripId, next);
    setMuted(next);
  }, [tripId]);

  return [muted, set];
}
