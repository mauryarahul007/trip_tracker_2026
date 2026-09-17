import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTripStore } from '../store/tripStore';
import type { Member, TripMessage } from '../types';
import {
  deleteTripMessage,
  editTripMessage,
  fetchTripMessages,
  sendTripMessage,
  subscribeToTripMessages,
  updateMessageReactions,
  updateMessagePin,
} from '../services/tripMessagesApi';
import { sendPushNotification } from '../services/pushApi';
import { triggerHaptic } from '../utils/haptics';
import { ActionSheet, type ActionSheetItem } from './common/ActionSheet';
import type { ConfirmRequest } from './ConfirmDialog';
import { IconEdit, IconTrash, IconClose } from './Icons';
import { LiveLocationChatBanner } from './LiveLocationChatBanner';
import {
  queueOfflineMessage,
  getOfflineMessagesForTrip,
  removeOfflineMessage,
  type QueuedChatMessage,
} from '../services/offlineChatStore';
import { newId } from '../utils/uuid';

const CHAT_PUSH_PREVIEW_LENGTH = 80;
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const LONG_PRESS_MS = 400;
const LONG_PRESS_MOVE_TOLERANCE = 10;
const SWIPE_REPLY_THRESHOLD = 45;
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '🙏', '🔥'];

interface Props {
  tripId: string;
  members: Member[];
  isAdmin?: boolean;
  onComposerFocusChange?: (focused: boolean) => void;
  onRequestConfirm: (request: ConfirmRequest) => void;
  onOpenLiveLocationShare?: () => void;
  onOpenExpenseFromChat?: (expenseId: string) => void;
}

export function TripChatPanel({ tripId, members, isAdmin, onComposerFocusChange, onRequestConfirm, onOpenLiveLocationShare, onOpenExpenseFromChat }: Props) {
  const userId = useTripStore((s) => s.userId);
  const tripName = useTripStore((s) => s.trips.find((t) => t.id === tripId)?.name) || 'Trip Tracker';
  const myMemberId = useMemo(
    () => members.find((m) => m.linkedUserId === userId)?.id ?? null,
    [members, userId]
  );

  const isSocialEnabled = useTripStore((s) => s.isFeatureEnabled('enableChatReactionsAndReplies', { tripId }));
  const isOutboxEnabled = useTripStore((s) => s.isFeatureEnabled('enableChatOfflineOutbox', { tripId }));

  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [editingMessage, setEditingMessage] = useState<TripMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<TripMessage | null>(null);
  const [actionSheetMessage, setActionSheetMessage] = useState<TripMessage | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // Load backend messages + offline queued messages
  const loadAllMessages = useCallback(async () => {
    try {
      const [serverRows, queuedRows] = await Promise.all([
        fetchTripMessages(tripId).catch(() => []),
        getOfflineMessagesForTrip(tripId).catch(() => []),
      ]);

      const queuedMapped: TripMessage[] = queuedRows.map((q) => ({
        id: q.id,
        tripId: q.tripId,
        memberId: q.memberId,
        body: q.body,
        replyToId: q.replyToId,
        replyToSenderName: q.replyToSenderName,
        replyToBody: q.replyToBody,
        createdAt: q.createdAt,
        status: 'sending',
      }));

      // Merge and deduplicate by ID
      const existingIds = new Set(serverRows.map((r) => r.id));
      const merged = [...serverRows];
      queuedMapped.forEach((q) => {
        if (!existingIds.has(q.id)) {
          merged.push(q);
        }
      });

      setMessages(merged.sort((a, b) => a.createdAt - b.createdAt));
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  // Auto-drain offline outbox when connection restores
  const drainOutbox = useCallback(async () => {
    if (!navigator.onLine) return;
    const queued = await getOfflineMessagesForTrip(tripId).catch(() => []);
    if (queued.length === 0) return;

    for (const q of queued) {
      try {
        const sent = await sendTripMessage(tripId, q.memberId, q.body, { replyToId: q.replyToId });
        await removeOfflineMessage(q.id);
        setMessages((prev) =>
          prev.map((m) => (m.id === q.id ? { ...sent, status: 'delivered' } : m))
        );
      } catch (err) {
        console.warn('[TripChatPanel] Failed to drain queued message:', err);
        break; // Retry later
      }
    }
  }, [tripId]);

  useEffect(() => {
    loadAllMessages();
    drainOutbox();

    const unsubscribe = subscribeToTripMessages(tripId, {
      onInsert: (message) => {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      },
      onUpdate: (message) => {
        setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
      },
    });

    const handleOnline = () => {
      drainOutbox();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, [tripId, loadAllMessages, drainOutbox]);

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

    const replyId = replyingToMessage?.id || null;
    const replySender = replyingToMessage ? memberById.get(replyingToMessage.memberId)?.name || 'Traveler' : null;
    const replyBody = replyingToMessage?.body || null;

    try {
      if (editingMessage) {
        await editTripMessage(editingMessage.id, body);
        setEditingMessage(null);
        setDraft('');
      } else {
        if (!navigator.onLine && isOutboxEnabled) {
          // Offline queue
          const tempId = newId();
          const queued: QueuedChatMessage = {
            id: tempId,
            tripId,
            memberId: myMemberId,
            body,
            replyToId: replyId,
            replyToSenderName: replySender,
            replyToBody: replyBody,
            createdAt: Date.now(),
            status: 'sending',
          };
          await queueOfflineMessage(queued);
          setMessages((prev) => [...prev, { ...queued }]);
          setDraft('');
          setReplyingToMessage(null);
          return;
        }

        const sent = await sendTripMessage(tripId, myMemberId, body, { replyToId: replyId });
        setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
        setDraft('');
        setReplyingToMessage(null);

        const senderName = memberById.get(myMemberId)?.name || 'Someone';
        const recipients = members
          .filter((m) => !m.archived && m.linkedUserId && m.linkedUserId !== userId)
          .map((m) => m.linkedUserId as string);
        const preview = body.length > CHAT_PUSH_PREVIEW_LENGTH ? `${body.slice(0, CHAT_PUSH_PREVIEW_LENGTH)}…` : body;
        sendPushNotification(recipients, tripName, 'chat_message', { senderName, preview }, tripId);
      }
    } catch {
      if (isOutboxEnabled && !editingMessage) {
        // Fallback to offline outbox if remote send fails
        const tempId = newId();
        const queued: QueuedChatMessage = {
          id: tempId,
          tripId,
          memberId: myMemberId,
          body,
          replyToId: replyId,
          replyToSenderName: replySender,
          replyToBody: replyBody,
          createdAt: Date.now(),
          status: 'sending',
        };
        await queueOfflineMessage(queued).catch(() => {});
        setMessages((prev) => [...prev, { ...queued }]);
        setDraft('');
        setReplyingToMessage(null);
      } else {
        setSendError(
          editingMessage
            ? 'Failed to update message. Tap Update to retry.'
            : navigator.onLine
              ? 'Message failed to send. Tap Send to retry.'
              : "You're offline — message will send once you're back online."
        );
        triggerHaptic('warning');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleReaction = async (message: TripMessage, emoji: string) => {
    if (!myMemberId) return;
    triggerHaptic('light');

    const currentReactions: Record<string, string[]> = { ...(message.reactions || {}) };
    const currentUsers = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
    const index = currentUsers.indexOf(myMemberId);

    if (index >= 0) {
      currentUsers.splice(index, 1);
    } else {
      currentUsers.push(myMemberId);
    }

    if (currentUsers.length === 0) {
      delete currentReactions[emoji];
    } else {
      currentReactions[emoji] = currentUsers;
    }

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, reactions: currentReactions } : m))
    );

    if (actionSheetMessage?.id === message.id) {
      setActionSheetMessage(null);
    }

    await updateMessageReactions(message.id, currentReactions);
  };

  const handleTogglePin = async (message: TripMessage) => {
    triggerHaptic('medium');
    const newPinState = !message.isPinned;
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, isPinned: newPinState } : m))
    );
    setActionSheetMessage(null);
    await updateMessagePin(message.id, newPinState);
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

  // Touch and pointer gestures for long-press & swipe-to-reply
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef({ x: 0, y: 0 });
  const swipedMessage = useRef<TripMessage | null>(null);

  const clearTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleBubblePointerDown = (message: TripMessage) => (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
    swipedMessage.current = null;
    clearTimer();
    longPressTimer.current = setTimeout(() => {
      triggerHaptic('medium');
      setActionSheetMessage(message);
    }, LONG_PRESS_MS);
  };

  const handleBubblePointerMove = (message: TripMessage) => (e: React.PointerEvent) => {
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;

    if (Math.abs(dy) > LONG_PRESS_MOVE_TOLERANCE) {
      clearTimer();
    }

    // Swipe right to reply gesture
    if (isSocialEnabled && dx > SWIPE_REPLY_THRESHOLD && !swipedMessage.current) {
      clearTimer();
      swipedMessage.current = message;
      triggerHaptic('light');
      setReplyingToMessage(message);
    }
  };

  const handleBubblePointerUp = () => {
    clearTimer();
    swipedMessage.current = null;
  };

  useEffect(() => clearTimer, []);

  const actionSheetItems: ActionSheetItem[] = useMemo(() => {
    if (!actionSheetMessage) return [];
    const isMine = actionSheetMessage.memberId === myMemberId;
    const isEventCard = actionSheetMessage.kind === 'expense_added';
    const canEdit = !isEventCard && (Boolean(isAdmin) || (isMine && Date.now() - actionSheetMessage.createdAt < EDIT_WINDOW_MS));
    const canDelete = isMine || Boolean(isAdmin);

    const items: ActionSheetItem[] = [];

    if (isSocialEnabled && !isEventCard) {
      items.push({
        id: 'reply',
        label: 'Reply',
        icon: <span>↩️</span>,
        onClick: () => {
          setReplyingToMessage(actionSheetMessage);
          setActionSheetMessage(null);
        },
      });

      if (isAdmin) {
        items.push({
          id: 'pin',
          label: actionSheetMessage.isPinned ? 'Unpin from top' : 'Pin notice to top',
          icon: <span>📌</span>,
          onClick: () => handleTogglePin(actionSheetMessage),
        });
      }
    }

    if (isEventCard && actionSheetMessage.payload?.expenseId && onOpenExpenseFromChat) {
      items.push({
        id: 'view-expense',
        label: 'View expense',
        icon: <span>💳</span>,
        onClick: () => {
          onOpenExpenseFromChat(actionSheetMessage.payload!.expenseId);
          setActionSheetMessage(null);
        },
      });
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionSheetMessage, myMemberId, isAdmin, isSocialEnabled, onOpenExpenseFromChat]);

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.isPinned && !m.deletedAt),
    [messages]
  );

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
      <LiveLocationChatBanner
        tripId={tripId}
        members={members}
        onShareMyLocation={onOpenLiveLocationShare}
      />

      {/* Pinned Announcements carousel */}
      {isSocialEnabled && pinnedMessages.length > 0 && (
        <div className="trip-chat-pin-carousel" role="region" aria-label="Pinned notices">
          <div className="trip-chat-pin-track">
            {pinnedMessages.map((pin, index) => (
              <button
                key={pin.id}
                type="button"
                className="trip-chat-pin-slide"
                onClick={() => {
                  const el = document.getElementById(`msg-${pin.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                <span aria-hidden="true">📌</span>
                <span className="trip-chat-pin-label">
                  Pinned{pinnedMessages.length > 1 ? ` ${index + 1}/${pinnedMessages.length}` : ''}
                </span>
                <span className="trip-chat-pin-body">{pin.body}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message List */}
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
          gap: '10px',
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
            const parentMsg = message.replyToId ? messages.find((m) => m.id === message.replyToId) : null;
            const isExpenseCard = message.kind === 'expense_added' && Boolean(message.payload?.expenseId);

            if (isExpenseCard && !isDeleted) {
              const payload = message.payload!;
              return (
                <div
                  key={message.id}
                  id={`msg-${message.id}`}
                  className="trip-chat-expense-card-wrap"
                  style={{ alignSelf: 'center', width: '100%', maxWidth: '320px' }}
                >
                  <button
                    type="button"
                    className="trip-chat-expense-card"
                    onClick={() => {
                      if (onOpenExpenseFromChat) onOpenExpenseFromChat(payload.expenseId);
                    }}
                    onPointerDown={handleBubblePointerDown(message)}
                    onPointerUp={handleBubblePointerUp}
                    onPointerCancel={handleBubblePointerUp}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <span className="trip-chat-expense-card-icon" aria-hidden="true">💳</span>
                    <span className="trip-chat-expense-card-text">
                      <span className="trip-chat-expense-card-who">
                        {isMine ? 'You' : (sender?.name || 'Traveler')} added
                      </span>
                      <span className="trip-chat-expense-card-title">{payload.title}</span>
                      <span className="trip-chat-expense-card-amount">
                        {payload.currency} {payload.amount.toFixed(2)}
                      </span>
                    </span>
                    <span className="trip-chat-expense-card-hint">Tap to view</span>
                  </button>
                </div>
              );
            }

            return (
              <div
                key={message.id}
                id={`msg-${message.id}`}
                style={{
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
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
                  onPointerMove={isDeleted ? undefined : handleBubblePointerMove(message)}
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
                    position: 'relative',
                  }}
                >
                  {parentMsg && (
                    <div
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: isMine ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.06)',
                        borderLeft: isMine ? '3px solid #fff' : '3px solid var(--primary-accent)',
                        marginBottom: '6px',
                        fontSize: '11px',
                        lineHeight: 1.3,
                      }}
                    >
                      <span style={{ fontWeight: 700, display: 'block', fontSize: '10px', color: isMine ? '#fff' : 'var(--primary-accent)' }}>
                        {memberById.get(parentMsg.memberId)?.name || 'Traveler'}
                      </span>
                      <span style={{ opacity: 0.9, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {parentMsg.body}
                      </span>
                    </div>
                  )}

                  {message.isPinned && (
                    <span style={{ fontSize: '10px', marginRight: '4px', opacity: 0.8 }} title="Pinned message">
                      📌
                    </span>
                  )}

                  {isDeleted ? 'This message was deleted' : message.body}
                </div>

                {/* Emoji Reaction Chips */}
                {isSocialEnabled && message.reactions && Object.keys(message.reactions).length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '3px',
                      marginTop: '2px',
                      alignSelf: isMine ? 'flex-end' : 'flex-start',
                      paddingLeft: isMine ? '0' : '4px',
                      paddingRight: isMine ? '4px' : '0',
                    }}
                  >
                    {Object.entries(message.reactions).map(([emoji, memberIds]) => {
                      if (!memberIds || memberIds.length === 0) return null;
                      const hasMyReaction = myMemberId ? memberIds.includes(myMemberId) : false;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(message, emoji)}
                          style={{
                            border: hasMyReaction ? '1px solid var(--primary-accent)' : '1px solid var(--border-color)',
                            borderRadius: '12px',
                            padding: '1px 6px',
                            fontSize: '11px',
                            background: hasMyReaction ? 'rgba(63, 203, 189, 0.15)' : 'var(--bg-card)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <span>{emoji}</span>
                          {memberIds.length > 1 && (
                            <span style={{ fontSize: '10px', fontWeight: 600 }}>{memberIds.length}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Timestamp & Status Indicator */}
                <span
                  style={{
                    fontSize: '9.5px',
                    color: 'var(--text-muted)',
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    padding: '0 4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {!isDeleted && message.editedAt ? ' · edited' : ''}

                  {isMine && isOutboxEnabled && (
                    <span style={{ fontSize: '10.5px' }}>
                      {message.status === 'sending' ? (
                        <span title="Queued offline">🕒</span>
                      ) : message.status === 'sent' ? (
                        <span title="Sent to server" style={{ color: 'var(--text-muted)' }}>✓</span>
                      ) : (
                        <span title="Delivered" style={{ color: 'var(--primary-accent)' }}>✓✓</span>
                      )}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Replying Quote Box */}
      {replyingToMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            background: 'var(--bg-secondary)',
            borderLeft: '3px solid var(--primary-accent)',
            fontSize: '12px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', marginRight: '8px' }}>
            <span style={{ fontWeight: 700, color: 'var(--primary-accent)', fontSize: '11px' }}>
              Replying to {memberById.get(replyingToMessage.memberId)?.name || 'Traveler'}
            </span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)' }}>
              {replyingToMessage.body}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingToMessage(null)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
          >
            <IconClose size={16} />
          </button>
        </div>
      )}

      {/* Editing State Box */}
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

      {/* Composer Input Bar */}
      <div
        className={`trip-chat-composer${isInputFocused ? ' is-focused' : ''}`}
        style={{
          borderTop: sendError || editingMessage || replyingToMessage ? 'none' : '1px solid var(--border-color)',
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
            if (e.key === 'Escape') {
              if (editingMessage) handleCancelEdit();
              if (replyingToMessage) setReplyingToMessage(null);
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
        header={
          isSocialEnabled && actionSheetMessage ? (
            <div className="wa-action-sheet-reactions" role="group" aria-label="Quick reactions">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="wa-action-sheet-reaction-btn"
                  aria-label={`React with ${emoji}`}
                  onClick={() => handleToggleReaction(actionSheetMessage, emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : undefined
        }
        items={actionSheetItems}
      />
    </div>
  );
}
