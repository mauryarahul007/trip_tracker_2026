import { useEffect, useMemo, useRef, useState } from 'react';
import { useTripStore } from '../store/tripStore';
import type { Member, TripMessage } from '../types';
import { fetchTripMessages, sendTripMessage, subscribeToTripMessages } from '../services/tripMessagesApi';
import { sendPushNotification } from '../services/pushApi';
import { triggerHaptic } from '../utils/haptics';

const CHAT_PUSH_PREVIEW_LENGTH = 80;

interface Props {
  tripId: string;
  members: Member[];
}

export function TripChatPanel({ tripId, members }: Props) {
  const userId = useTripStore((s) => s.userId);
  const tripName = useTripStore((s) => s.trips.find((t) => t.id === tripId)?.name) || 'Trip Tracker';
  const myMemberId = useMemo(
    () => members.find((m) => m.linkedUserId === userId)?.id ?? null,
    [members, userId]
  );

  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchTripMessages(tripId)
      .then((rows) => {
        if (isMounted) setMessages(rows);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    const unsubscribe = subscribeToTripMessages(tripId, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [tripId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !myMemberId || !userId || isSending) return;

    setIsSending(true);
    setSendError(null);
    triggerHaptic('light');
    try {
      await sendTripMessage(tripId, myMemberId, body);
      setDraft('');

      const senderName = memberById.get(myMemberId)?.name || 'Someone';
      const recipients = members
        .filter((m) => !m.archived && m.linkedUserId && m.linkedUserId !== userId)
        .map((m) => m.linkedUserId as string);
      const preview = body.length > CHAT_PUSH_PREVIEW_LENGTH ? `${body.slice(0, CHAT_PUSH_PREVIEW_LENGTH)}…` : body;
      // Best-effort, non-blocking -- sendPushNotification never throws.
      sendPushNotification(recipients, tripName, 'chat_message', { senderName, preview }, tripId);
    } catch {
      // Chat has no offline outbox (unlike expenses) -- a failed send here
      // means the message was NOT saved, so surface it instead of silently
      // dropping the draft. Draft text is kept so the traveler can retry.
      setSendError(navigator.onLine ? 'Message failed to send. Tap Send to retry.' : "You're offline — message will not send until you're back online.");
      triggerHaptic('warning');
    } finally {
      setIsSending(false);
    }
  };

  if (!myMemberId) {
    return (
      <div className="glass-card" style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        Join this trip as a member to use chat.
      </div>
    );
  }

  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'min(64dvh, 560px)',
        overflow: 'hidden',
        padding: 0,
      }}
    >
      <div
        style={{
          flex: '1 1 auto',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minHeight: 0,
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px', padding: '20px' }}>
            Loading chat...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px', padding: '20px' }}>
            No messages yet. Say hi to the squad 👋
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.memberId === myMemberId;
            const sender = memberById.get(message.memberId);
            return (
              <div
                key={message.id}
                style={{
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  maxWidth: '78%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {!isMine && (
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--primary-accent)', paddingLeft: '10px' }}>
                    {sender?.name || 'Traveler'}
                  </span>
                )}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: isMine ? 'var(--primary-accent)' : 'var(--bg-surface-elevated, rgba(0,0,0,0.04))',
                    color: isMine ? '#fff' : 'var(--text-primary)',
                    fontSize: '13px',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                  }}
                >
                  {message.body}
                </div>
                <span
                  style={{
                    fontSize: '9.5px',
                    color: 'var(--text-muted)',
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    padding: '0 4px',
                  }}
                >
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {sendError && (
        <div
          style={{
            padding: '6px 14px',
            fontSize: '11px',
            color: '#dc2626',
            background: 'rgba(220, 38, 38, 0.08)',
            borderTop: '1px solid rgba(220, 38, 38, 0.2)',
          }}
        >
          ⚠️ {sendError}
        </div>
      )}

      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          gap: '8px',
          padding: '10px 14px calc(10px + env(safe-area-inset-bottom, 8px))',
          borderTop: sendError ? 'none' : '1px solid var(--border-color)',
          background: 'var(--bg-surface, #fff)',
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Message the squad..."
          maxLength={2000}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '20px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-surface-elevated, rgba(0,0,0,0.02))',
            color: 'var(--text-primary)',
            // 16px minimum -- iOS Safari/Chrome (WebKit) auto-zooms the whole
            // page on focusing a text input with a computed font-size below
            // 16px, then zooms back out on blur. That zoom-in/out is what
            // reads as "alignment completely changes while typing" and is
            // iOS-only since Android Chrome has no such focus-zoom behavior.
            fontSize: '16px',
          }}
        />
        <button
          type="button"
          className="gradient-btn"
          disabled={!draft.trim() || isSending}
          onClick={handleSend}
          style={{ borderRadius: '20px', padding: '10px 18px', fontSize: '13px', fontWeight: 700 }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
