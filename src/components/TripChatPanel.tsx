import { useEffect, useMemo, useRef, useState } from 'react';
import { useTripStore } from '../store/tripStore';
import type { Member, TripMessage } from '../types';
import { deleteTripMessage, editTripMessage, fetchTripMessages, sendTripMessage, subscribeToTripMessages } from '../services/tripMessagesApi';
import { sendPushNotification } from '../services/pushApi';
import { triggerHaptic } from '../utils/haptics';
import { ActionSheet, type ActionSheetItem } from './common/ActionSheet';
import type { ConfirmRequest } from './ConfirmDialog';
import { IconEdit, IconTrash } from './Icons';

const CHAT_PUSH_PREVIEW_LENGTH = 80;
// Matches the server-side window enforced by edit_trip_message() (migration
// 0083) -- only hides the Edit action past this point, the RPC is the real
// enforcement so a stale client can't edit past its deadline either.
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const LONG_PRESS_MS = 450;
// Cancel the long-press if the pointer drifts (e.g. the list is being
// scrolled) instead of firing the menu mid-scroll.
const LONG_PRESS_MOVE_TOLERANCE = 10;

interface Props {
  tripId: string;
  members: Member[];
  isAdmin?: boolean;
  onComposerFocusChange?: (focused: boolean) => void;
  onRequestConfirm: (request: ConfirmRequest) => void;
}

export function TripChatPanel({ tripId, members, isAdmin, onComposerFocusChange, onRequestConfirm }: Props) {
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
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [editingMessage, setEditingMessage] = useState<TripMessage | null>(null);
  const [actionSheetMessage, setActionSheetMessage] = useState<TripMessage | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

    const unsubscribe = subscribeToTripMessages(tripId, {
      onInsert: (message) => {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      },
      // Covers both edits and soft-deletes -- both are plain UPDATEs on
      // trip_messages, the rendered bubble branches on deletedAt/editedAt.
      onUpdate: (message) => {
        setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
      },
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [tripId]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setDraft('');
    setSendError(null);
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !myMemberId || !userId || isSending) return;

    setIsSending(true);
    setSendError(null);
    triggerHaptic('light');
    try {
      if (editingMessage) {
        await editTripMessage(editingMessage.id, body);
        setEditingMessage(null);
        setDraft('');
      } else {
        await sendTripMessage(tripId, myMemberId, body);
        setDraft('');

        const senderName = memberById.get(myMemberId)?.name || 'Someone';
        const recipients = members
          .filter((m) => !m.archived && m.linkedUserId && m.linkedUserId !== userId)
          .map((m) => m.linkedUserId as string);
        const preview = body.length > CHAT_PUSH_PREVIEW_LENGTH ? `${body.slice(0, CHAT_PUSH_PREVIEW_LENGTH)}…` : body;
        // Best-effort, non-blocking -- sendPushNotification never throws.
        sendPushNotification(recipients, tripName, 'chat_message', { senderName, preview }, tripId);
      }
    } catch {
      // Chat has no offline outbox (unlike expenses) -- a failed send/edit
      // here means it was NOT saved, so surface it instead of silently
      // dropping the draft. Draft text is kept so the traveler can retry.
      setSendError(
        editingMessage
          ? 'Failed to update message. Tap Update to retry.'
          : navigator.onLine
            ? 'Message failed to send. Tap Send to retry.'
            : "You're offline — message will not send until you're back online."
      );
      triggerHaptic('warning');
    } finally {
      setIsSending(false);
    }
  };

  const handleRequestDelete = (message: TripMessage) => {
    onRequestConfirm({
      title: 'Delete message?',
      message: 'This will delete the message for everyone in the trip.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => {
        deleteTripMessage(message.id).catch(() => {
          setSendError('Failed to delete message.');
          triggerHaptic('warning');
        });
      },
    });
  };

  // Long-press (touch and mouse) on a bubble opens the Edit/Delete action
  // sheet -- mirrors WhatsApp's own gesture rather than a swipe, which this
  // app already uses elsewhere for "reply"-shaped actions, not this one.
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStart = useRef({ x: 0, y: 0 });
  const longPressMoved = useRef(false);

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleBubblePointerDown = (message: TripMessage) => (e: React.PointerEvent) => {
    longPressMoved.current = false;
    longPressStart.current = { x: e.clientX, y: e.clientY };
    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      if (!longPressMoved.current) {
        triggerHaptic('medium');
        setActionSheetMessage(message);
      }
    }, LONG_PRESS_MS);
  };

  const handleBubblePointerMove = (e: React.PointerEvent) => {
    const dx = e.clientX - longPressStart.current.x;
    const dy = e.clientY - longPressStart.current.y;
    if (Math.abs(dx) > LONG_PRESS_MOVE_TOLERANCE || Math.abs(dy) > LONG_PRESS_MOVE_TOLERANCE) {
      longPressMoved.current = true;
      clearLongPressTimer();
    }
  };

  const handleBubblePointerUp = () => {
    clearLongPressTimer();
  };

  useEffect(() => clearLongPressTimer, []);

  const actionSheetItems: ActionSheetItem[] = useMemo(() => {
    if (!actionSheetMessage) return [];
    const isMine = actionSheetMessage.memberId === myMemberId;
    // Mirrors edit_trip_message()'s check exactly (migration 0083): admin
    // bypasses the window regardless of authorship, sender is bound by it.
    const canEdit = Boolean(isAdmin) || (isMine && Date.now() - actionSheetMessage.createdAt < EDIT_WINDOW_MS);
    const canDelete = isMine || Boolean(isAdmin);

    const items: ActionSheetItem[] = [];
    if (canEdit) {
      items.push({
        id: 'edit',
        label: 'Edit',
        icon: <IconEdit size={16} />,
        onClick: () => {
          setEditingMessage(actionSheetMessage);
          setDraft(actionSheetMessage.body);
        },
      });
    }
    if (canDelete) {
      items.push({
        id: 'delete',
        label: 'Delete',
        icon: <IconTrash size={16} />,
        destructive: true,
        onClick: () => handleRequestDelete(actionSheetMessage),
      });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleRequestDelete is stable per render and not itself a dependency of what this list needs to react to
  }, [actionSheetMessage, myMemberId, isAdmin]);

  if (!myMemberId) {
    return (
      <div className="glass-card" style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        Join this trip as a member to use chat.
      </div>
    );
  }

  return (
    <div
      className="glass-card trip-chat-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0%',
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
        padding: 0,
        borderRadius: '16px 16px 0 0',
      }}
    >
      <div
        ref={listRef}
        className="trip-chat-list"
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
            const isDeleted = Boolean(message.deletedAt);
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
                  onPointerDown={isDeleted ? undefined : handleBubblePointerDown(message)}
                  onPointerMove={isDeleted ? undefined : handleBubblePointerMove}
                  onPointerUp={isDeleted ? undefined : handleBubblePointerUp}
                  onPointerCancel={isDeleted ? undefined : handleBubblePointerUp}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    padding: '8px 12px',
                    borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: isMine ? 'var(--primary-accent)' : 'var(--bg-surface-elevated, rgba(0,0,0,0.04))',
                    color: isMine ? '#fff' : 'var(--text-primary)',
                    fontSize: '13px',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                    fontStyle: isDeleted ? 'italic' : 'normal',
                    opacity: isDeleted ? 0.7 : 1,
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    touchAction: 'pan-y',
                  }}
                >
                  {isDeleted ? 'This message was deleted' : message.body}
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
                  {!isDeleted && message.editedAt ? ' · edited' : ''}
                </span>
              </div>
            );
          })
        )}
      </div>

      {editingMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 14px',
            fontSize: '11.5px',
            color: 'var(--text-secondary)',
            background: 'var(--bg-surface-elevated, rgba(0,0,0,0.03))',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <span>✏️ Editing message</span>
          <button
            type="button"
            onClick={handleCancelEdit}
            style={{ background: 'none', border: 'none', color: 'var(--primary-accent)', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', padding: '4px' }}
          >
            Cancel
          </button>
        </div>
      )}

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
        className={`trip-chat-composer${isInputFocused ? ' is-focused' : ''}`}
        style={{
          borderTop: sendError || editingMessage ? 'none' : '1px solid var(--border-color)',
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => {
            setIsInputFocused(true);
            onComposerFocusChange?.(true);
            if (window.scrollY !== 0) window.scrollTo(0, 0);
            const list = listRef.current;
            if (list) list.scrollTop = list.scrollHeight;
          }}
          onBlur={() => {
            setIsInputFocused(false);
            onComposerFocusChange?.(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
            if (e.key === 'Escape' && editingMessage) {
              handleCancelEdit();
            }
          }}
          placeholder={editingMessage ? 'Edit message...' : 'Message the squad...'}
          maxLength={2000}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '20px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-surface-elevated, rgba(0,0,0,0.02))',
            color: 'var(--text-primary)',
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
          {editingMessage ? 'Update' : 'Send'}
        </button>
      </div>

      <ActionSheet
        isOpen={Boolean(actionSheetMessage)}
        onClose={() => setActionSheetMessage(null)}
        items={actionSheetItems}
      />
    </div>
  );
}
