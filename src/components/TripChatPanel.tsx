import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useTripStore } from '../store/tripStore';
import type {
  Member,
  TripMessage,
  TripMessageExpenseLinkPayload,
  TripMessageExpensePayload,
  TripMessageKind,
  TripMessageMediaPayload,
} from '../types';
import {
  deleteTripMessage,
  editTripMessage,
  fetchTripMessages,
  sendExpenseLinkMessage,
  sendImageMessage,
  sendTripMessage,
  sendVoiceNoteMessage,
  subscribeToTripMessages,
  updateMessageReactions,
  updateMessagePin,
} from '../services/tripMessagesApi';
import { getChatMediaSignedUrl, uploadChatMedia, uploadChatMediaDataUrl } from '../services/chatMediaApi';
import {
  fetchReadCursors,
  subscribeToReadCursors,
  upsertReadCursor,
  type TripChatReadCursor,
} from '../services/chatReadCursorApi';
import { supabase } from '../services/supabaseClient';
import { sendPushNotification } from '../services/pushApi';
import { triggerHaptic } from '../utils/haptics';
import { compressDataUrlToDataUrl, compressImageToDataUrl } from '../utils/image';
import { parseQuickExpense, type ParsedQuickExpense } from '../utils/expenseQuickParser';
import { ActionSheet, type ActionSheetItem } from './common/ActionSheet';
import type { ConfirmRequest } from './ConfirmDialog';
import { IconEdit, IconTrash, IconClose } from './Icons';
import { LiveLocationChatBanner } from './LiveLocationChatBanner';
import { ExpenseSplitExplainSheet, type SplitShareRow } from './ExpenseSplitExplainSheet';
import { TripbotConfirmSheet } from './TripbotConfirmSheet';
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
const VOICE_MAX_MS = 60_000;
const TYPING_DEBOUNCE_MS = 400;
const TYPING_CLEAR_MS = 2500;
const TRIPBOT_RE = /^@tripbot\s+/i;

const EVENT_CARD_KINDS = new Set<TripMessageKind>([
  'expense_added',
  'settlement_recorded',
  'expense_disputed',
  'expense_dispute_resolved',
  'expense_link',
]);

interface Props {
  tripId: string;
  members: Member[];
  isAdmin?: boolean;
  onComposerFocusChange?: (focused: boolean) => void;
  onRequestConfirm: (request: ConfirmRequest) => void;
  onOpenLiveLocationShare?: () => void;
  onOpenExpenseFromChat?: (expenseId: string) => void;
}

function isExpensePayload(p: TripMessage['payload']): p is TripMessageExpensePayload {
  return Boolean(p && 'expenseId' in p && 'title' in p && typeof (p as TripMessageExpensePayload).amount === 'number');
}

function isMediaPayload(p: TripMessage['payload']): p is TripMessageMediaPayload {
  return Boolean(p && 'storagePath' in p && 'mimeType' in p);
}

function isLinkPayload(p: TripMessage['payload']): p is TripMessageExpenseLinkPayload {
  return Boolean(p && 'expenseId' in p && 'title' in p && !('storagePath' in p));
}

function ChatMediaImage({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getChatMediaSignedUrl(path)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);
  if (!url) return <div className="trip-chat-media-placeholder">Loading image…</div>;
  return <img src={url} alt={alt} className="trip-chat-media-image" loading="lazy" />;
}

function ChatVoicePlayer({ path, durationMs }: { path: string; durationMs?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getChatMediaSignedUrl(path)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);
  const secs = durationMs ? Math.round(durationMs / 1000) : null;
  return (
    <div className="trip-chat-voice-bubble">
      <span aria-hidden="true">🎤</span>
      {url ? <audio controls preload="none" src={url} className="trip-chat-voice-audio" /> : <span>Loading…</span>}
      {secs != null ? <span className="trip-chat-voice-duration">{secs}s</span> : null}
    </div>
  );
}

export function TripChatPanel({
  tripId,
  members,
  isAdmin,
  onComposerFocusChange,
  onRequestConfirm,
  onOpenLiveLocationShare,
  onOpenExpenseFromChat,
}: Props) {
  const userId = useTripStore((s) => s.userId);
  const trip = useTripStore((s) => s.trips.find((t) => t.id === tripId));
  const tripName = trip?.name || 'Trip Tracker';
  const baseCurrency = trip?.baseCurrency || 'INR';
  const categories = useTripStore((s) => s.categories);
  const expenses = useTripStore((s) => s.expenses.filter((e) => e.tripId === tripId && !e.deletedAt));
  const addExpense = useTripStore((s) => s.addExpense);
  const isFeatureEnabled = useTripStore((s) => s.isFeatureEnabled);

  const myMemberId = useMemo(
    () => members.find((m) => m.linkedUserId === userId)?.id ?? null,
    [members, userId]
  );

  const isSocialEnabled = isFeatureEnabled('enableChatReactionsAndReplies', { tripId });
  const isOutboxEnabled = isFeatureEnabled('enableChatOfflineOutbox', { tripId });
  const explainEnabled = isFeatureEnabled('enableExplainThisNumber', { tripId });
  const attachmentsEnabled = isFeatureEnabled('enableChatAttachments', { tripId });
  const voiceEnabled = isFeatureEnabled('enableChatVoiceNotes', { tripId });
  const typingEnabled = isFeatureEnabled('enableChatTypingIndicators', { tripId });
  const readReceiptsEnabled = isFeatureEnabled('enableChatReadReceipts', { tripId });
  const tripbotEnabled = isFeatureEnabled('enableTripbotNlExpenses', { tripId });

  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [editingMessage, setEditingMessage] = useState<TripMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<TripMessage | null>(null);
  const [actionSheetMessage, setActionSheetMessage] = useState<TripMessage | null>(null);
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);
  const [expensePickOpen, setExpensePickOpen] = useState(false);
  const [explainShares, setExplainShares] = useState<SplitShareRow[] | null>(null);
  const [explainTitle, setExplainTitle] = useState('');
  const [tripbotParsed, setTripbotParsed] = useState<ParsedQuickExpense | null>(null);
  const [tripbotSubmitting, setTripbotSubmitting] = useState(false);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [readCursors, setReadCursors] = useState<TripChatReadCursor[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const recordStartedAtRef = useRef(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordMaxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const visibleMembers = useMemo(() => members.filter((m) => !m.archived), [members]);

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

      const existingIds = new Set(serverRows.map((r) => r.id));
      const merged = [...serverRows];
      queuedMapped.forEach((q) => {
        if (!existingIds.has(q.id)) merged.push(q);
      });

      setMessages(merged.sort((a, b) => a.createdAt - b.createdAt));
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  const drainOutbox = useCallback(async () => {
    if (!navigator.onLine) return;
    const queued = await getOfflineMessagesForTrip(tripId).catch(() => []);
    if (queued.length === 0) return;

    for (const q of queued) {
      try {
        const sent = await sendTripMessage(tripId, q.memberId, q.body, { replyToId: q.replyToId });
        await removeOfflineMessage(q.id);
        setMessages((prev) => prev.map((m) => (m.id === q.id ? { ...sent, status: 'delivered' } : m)));
      } catch (err) {
        console.warn('[TripChatPanel] Failed to drain queued message:', err);
        break;
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

  // Read cursors
  useEffect(() => {
    if (!readReceiptsEnabled) {
      setReadCursors([]);
      return;
    }
    void fetchReadCursors(tripId).then(setReadCursors);
    return subscribeToReadCursors(tripId, setReadCursors);
  }, [tripId, readReceiptsEnabled]);

  // Upsert own cursor when viewing / on new messages
  useEffect(() => {
    if (!readReceiptsEnabled || !myMemberId || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (!last || last.deletedAt) return;
    void upsertReadCursor(tripId, myMemberId, last.id);
  }, [tripId, myMemberId, readReceiptsEnabled, messages]);

  // Typing indicators (broadcast)
  useEffect(() => {
    if (!typingEnabled || !myMemberId) {
      typingChannelRef.current = null;
      return;
    }

    const channelName = `trip_chat_typing:${tripId}`;
    try {
      for (const existing of supabase.getChannels()) {
        if (existing.topic === channelName || existing.topic.endsWith(`:${channelName}`)) {
          void supabase.removeChannel(existing);
        }
      }
    } catch (err) {
      console.warn('[TripChatPanel] typing channel cleanup skipped:', err);
      return;
    }

    const channel = supabase.channel(channelName);
    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const peerId = payload?.memberId as string | undefined;
        const name = (payload?.name as string) || 'Someone';
        if (!peerId || peerId === myMemberId) return;
        setTypingNames((prev) => (prev.includes(name) ? prev : [...prev, name]));
        const existingClear = typingClearRef.current.get(peerId);
        if (existingClear) clearTimeout(existingClear);
        typingClearRef.current.set(
          peerId,
          setTimeout(() => {
            setTypingNames((prev) => prev.filter((n) => n !== name));
            typingClearRef.current.delete(peerId);
          }, TYPING_CLEAR_MS)
        );
      })
      .subscribe();

    typingChannelRef.current = channel;
    return () => {
      typingChannelRef.current = null;
      void supabase.removeChannel(channel);
      typingClearRef.current.forEach((t) => clearTimeout(t));
      typingClearRef.current.clear();
    };
  }, [tripId, typingEnabled, myMemberId]);

  const broadcastTyping = useCallback(() => {
    if (!typingEnabled || !myMemberId || !typingChannelRef.current) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      void typingChannelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { memberId: myMemberId, name: memberById.get(myMemberId)?.name || 'Traveler' },
      });
    }, TYPING_DEBOUNCE_MS);
  }, [typingEnabled, myMemberId, memberById]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, typingNames.length]);

  const isMessageReadByPeers = useCallback(
    (message: TripMessage) => {
      if (!readReceiptsEnabled || !myMemberId) return false;
      return readCursors.some(
        (c) => c.memberId !== myMemberId && c.lastReadAt >= message.createdAt
      );
    },
    [readCursors, readReceiptsEnabled, myMemberId]
  );

  const openExplainForMessage = (message: TripMessage) => {
    const payload = message.payload;
    if (!isExpensePayload(payload)) return;
    const expense = expenses.find((e) => e.id === payload.expenseId);
    const currency = expense?.currency || payload.currency || baseCurrency;
    const shares: SplitShareRow[] = expense
      ? Object.entries(expense.resolvedShares || {}).map(([memberId, amount]) => ({
          memberId,
          name: memberById.get(memberId)?.name || 'Traveler',
          amount,
          currency,
        }))
      : [];
    setExplainTitle(payload.title);
    setExplainShares(shares);
    setActionSheetMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setDraft('');
    setSendError(null);
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !myMemberId || !userId || isSending) return;

    // @tripbot intercept
    if (tripbotEnabled && !editingMessage && TRIPBOT_RE.test(body)) {
      const nl = body.replace(TRIPBOT_RE, '').trim();
      const parsed = parseQuickExpense(nl, categories, expenses, visibleMembers);
      if (!parsed || parsed.amount == null || parsed.amount <= 0) {
        setSendError('Could not parse that @tripbot expense. Try e.g. @tripbot Dinner 450 food');
        triggerHaptic('warning');
        return;
      }
      setTripbotParsed(parsed);
      return;
    }

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

  const handleTripbotConfirm = async () => {
    if (!tripbotParsed || !myMemberId) return;
    const parsed = tripbotParsed;
    if (parsed.amount == null || parsed.amount <= 0) return;

    const payer = parsed.paidById || myMemberId;
    const splitMembers =
      parsed.splitMemberIds && parsed.splitMemberIds.length > 0
        ? parsed.splitMemberIds
        : visibleMembers.map((m) => m.id);

    setTripbotSubmitting(true);
    try {
      await addExpense({
        title: parsed.title || 'Quick Expense',
        amount: parsed.amount,
        currency: parsed.currency || baseCurrency,
        category: parsed.categoryId || categories[0]?.id || 'cat-misc',
        date: parsed.date || new Date().toISOString().slice(0, 10),
        paidBy: payer,
        splitMode: 'equal',
        splitMemberIds: splitMembers,
        splitConfig: {},
      });
      setDraft('');
      setTripbotParsed(null);
      triggerHaptic('success');
    } catch {
      setSendError('Failed to add expense from @tripbot.');
      triggerHaptic('warning');
    } finally {
      setTripbotSubmitting(false);
    }
  };

  const appendLocalMessage = (msg: TripMessage) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  };

  const handleSendImageDataUrl = async (dataUrl: string) => {
    if (!myMemberId) return;
    setIsSending(true);
    setSendError(null);
    try {
      const messageId = newId();
      const { path, mimeType } = await uploadChatMediaDataUrl(tripId, messageId, dataUrl);
      const sent = await sendImageMessage(tripId, myMemberId, { storagePath: path, mimeType }, { id: messageId });
      if (sent) appendLocalMessage(sent);
      else setSendError('Photo uploaded but chat card failed. Schema may need migration 0096.');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send photo.');
      triggerHaptic('warning');
    } finally {
      setIsSending(false);
      setAttachSheetOpen(false);
    }
  };

  const handlePickGallery = async () => {
    setAttachSheetOpen(false);
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await Camera.getPhoto({
          quality: 85,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
        });
        if (photo.dataUrl) {
          const compressed = await compressDataUrlToDataUrl(photo.dataUrl);
          await handleSendImageDataUrl(compressed);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (message !== 'User cancelled photos app') {
          setSendError('Could not open gallery.');
        }
      }
      return;
    }
    fileInputRef.current?.click();
  };

  const handlePickCamera = async () => {
    setAttachSheetOpen(false);
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await Camera.getPhoto({
          quality: 85,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });
        if (photo.dataUrl) {
          const compressed = await compressDataUrlToDataUrl(photo.dataUrl);
          await handleSendImageDataUrl(compressed);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (message !== 'User cancelled photos app') {
          setSendError('Could not open camera.');
        }
      }
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChosen = async (file: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file);
      await handleSendImageDataUrl(dataUrl);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to process image.');
    }
  };

  const handleAttachExpense = async (expenseId: string) => {
    if (!myMemberId) return;
    const expense = expenses.find((e) => e.id === expenseId);
    if (!expense) return;
    setExpensePickOpen(false);
    setIsSending(true);
    try {
      const sent = await sendExpenseLinkMessage(tripId, myMemberId, {
        expenseId: expense.id,
        title: expense.title,
        amount: expense.amount,
        currency: expense.currency,
      });
      if (sent) appendLocalMessage(sent);
    } catch {
      setSendError('Failed to attach expense.');
    } finally {
      setIsSending(false);
    }
  };

  const stopVoiceRecording = useCallback(async (cancel = false) => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (recordMaxTimerRef.current) {
      clearTimeout(recordMaxTimerRef.current);
      recordMaxTimerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordSeconds(0);

    if (!recorder) return;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      if (recorder.state !== 'inactive') recorder.stop();
      else resolve();
    });

    recorder.stream.getTracks().forEach((t) => t.stop());
    if (cancel) {
      mediaChunksRef.current = [];
      return;
    }

    const chunks = mediaChunksRef.current;
    mediaChunksRef.current = [];
    if (!myMemberId || chunks.length === 0) return;

    const mimeType = recorder.mimeType || 'audio/webm';
    const blob = new Blob(chunks, { type: mimeType });
    const durationMs = Math.min(VOICE_MAX_MS, Date.now() - recordStartedAtRef.current);

    setIsSending(true);
    try {
      const messageId = newId();
      const path = await uploadChatMedia(tripId, messageId, blob, mimeType);
      const sent = await sendVoiceNoteMessage(
        tripId,
        myMemberId,
        { storagePath: path, mimeType, durationMs },
        { id: messageId }
      );
      if (sent) appendLocalMessage(sent);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send voice note.');
      triggerHaptic('warning');
    } finally {
      setIsSending(false);
    }
  }, [myMemberId, tripId]);

  const startVoiceRecording = async () => {
    if (!voiceEnabled || !myMemberId || isSending || isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) mediaChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recordStartedAtRef.current = Date.now();
      setIsRecording(true);
      setRecordSeconds(0);
      triggerHaptic('medium');
      recorder.start(250);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds(Math.floor((Date.now() - recordStartedAtRef.current) / 1000));
      }, 250);
      recordMaxTimerRef.current = setTimeout(() => {
        void stopVoiceRecording(false);
      }, VOICE_MAX_MS);
    } catch {
      setSendError('Microphone permission is required for voice notes.');
      triggerHaptic('warning');
    }
  };

  const handleToggleReaction = async (message: TripMessage, emoji: string) => {
    if (!myMemberId) return;
    triggerHaptic('light');

    const currentReactions: Record<string, string[]> = { ...(message.reactions || {}) };
    const currentUsers = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
    const index = currentUsers.indexOf(myMemberId);

    if (index >= 0) currentUsers.splice(index, 1);
    else currentUsers.push(myMemberId);

    if (currentUsers.length === 0) delete currentReactions[emoji];
    else currentReactions[emoji] = currentUsers;

    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, reactions: currentReactions } : m)));
    if (actionSheetMessage?.id === message.id) setActionSheetMessage(null);
    await updateMessageReactions(message.id, currentReactions);
  };

  const handleTogglePin = async (message: TripMessage) => {
    triggerHaptic('medium');
    const newPinState = !message.isPinned;
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, isPinned: newPinState } : m)));
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
    if (Math.abs(dy) > LONG_PRESS_MOVE_TOLERANCE) clearTimer();
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
  useEffect(
    () => () => {
      void stopVoiceRecording(true);
    },
    [stopVoiceRecording]
  );

  const actionSheetItems: ActionSheetItem[] = useMemo(() => {
    if (!actionSheetMessage) return [];
    const isMine = actionSheetMessage.memberId === myMemberId;
    const kind = actionSheetMessage.kind || 'text';
    const isEventCard = EVENT_CARD_KINDS.has(kind) || kind === 'image' || kind === 'voice_note';
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

    const expenseId =
      (isExpensePayload(actionSheetMessage.payload) && actionSheetMessage.payload.expenseId) ||
      (isLinkPayload(actionSheetMessage.payload) && actionSheetMessage.payload.expenseId) ||
      null;

    if (expenseId && onOpenExpenseFromChat) {
      items.push({
        id: 'view-expense',
        label: 'View expense',
        icon: <span>💳</span>,
        onClick: () => {
          onOpenExpenseFromChat(expenseId);
          setActionSheetMessage(null);
        },
      });
    }

    if (explainEnabled && kind === 'expense_added' && isExpensePayload(actionSheetMessage.payload)) {
      items.push({
        id: 'explain-split',
        label: 'Why this split?',
        icon: <span>🧮</span>,
        onClick: () => openExplainForMessage(actionSheetMessage),
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
  }, [actionSheetMessage, myMemberId, isAdmin, isSocialEnabled, onOpenExpenseFromChat, explainEnabled, expenses]);

  const attachSheetItems: ActionSheetItem[] = useMemo(
    () => [
      {
        id: 'camera',
        label: 'Camera',
        icon: <span>📷</span>,
        onClick: () => {
          void handlePickCamera();
        },
      },
      {
        id: 'gallery',
        label: 'Gallery',
        icon: <span>🖼️</span>,
        onClick: () => {
          void handlePickGallery();
        },
      },
      {
        id: 'expense',
        label: 'Attach expense',
        icon: <span>💳</span>,
        onClick: () => {
          setAttachSheetOpen(false);
          setExpensePickOpen(true);
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const expensePickItems: ActionSheetItem[] = useMemo(
    () =>
      expenses
        .filter((e) => !e.isSettlement)
        .slice(0, 20)
        .map((e) => ({
          id: e.id,
          label: e.title,
          subtitle: `${e.currency} ${e.amount.toFixed(2)}`,
          onClick: () => {
            void handleAttachExpense(e.id);
          },
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses]
  );

  const pinnedMessages = useMemo(() => messages.filter((m) => m.isPinned && !m.deletedAt), [messages]);

  const renderEventCard = (message: TripMessage) => {
    const kind = message.kind || 'text';
    const isMine = message.memberId === myMemberId;
    const sender = memberById.get(message.memberId);
    const payload = message.payload;

    if (kind === 'image' && isMediaPayload(payload)) {
      return (
        <div key={message.id} id={`msg-${message.id}`} className="trip-chat-media-wrap" style={{ alignSelf: isMine ? 'flex-end' : 'flex-start' }}>
          <div
            className="trip-chat-media-card"
            onPointerDown={handleBubblePointerDown(message)}
            onPointerUp={handleBubblePointerUp}
            onPointerCancel={handleBubblePointerUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            <ChatMediaImage path={payload.storagePath} alt="Chat photo" />
          </div>
        </div>
      );
    }

    if (kind === 'voice_note' && isMediaPayload(payload)) {
      return (
        <div key={message.id} id={`msg-${message.id}`} className="trip-chat-media-wrap" style={{ alignSelf: isMine ? 'flex-end' : 'flex-start' }}>
          <div
            className={`trip-chat-voice-card${isMine ? ' is-mine' : ''}`}
            onPointerDown={handleBubblePointerDown(message)}
            onPointerUp={handleBubblePointerUp}
            onPointerCancel={handleBubblePointerUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            {!isMine && <span className="trip-chat-voice-sender">{sender?.name || 'Traveler'}</span>}
            <ChatVoicePlayer path={payload.storagePath} durationMs={payload.durationMs} />
          </div>
        </div>
      );
    }

    const expensePayload = isExpensePayload(payload) ? payload : isLinkPayload(payload) ? payload : null;
    if (!expensePayload) return null;

    let variant = 'expense';
    let icon = '💳';
    let whoLabel = `${isMine ? 'You' : sender?.name || 'Traveler'} added`;
    if (kind === 'settlement_recorded') {
      variant = 'settlement';
      icon = '🤝';
      whoLabel = `${isMine ? 'You' : sender?.name || 'Traveler'} recorded settlement`;
    } else if (kind === 'expense_disputed') {
      variant = 'dispute';
      icon = '⚠️';
      whoLabel = `${isMine ? 'You' : sender?.name || 'Traveler'} disputed`;
    } else if (kind === 'expense_dispute_resolved') {
      variant = 'resolved';
      icon = '✅';
      whoLabel = `Dispute resolved`;
    } else if (kind === 'expense_link') {
      variant = 'link';
      icon = '🔗';
      whoLabel = `${isMine ? 'You' : sender?.name || 'Traveler'} linked`;
    }

    const amount =
      typeof expensePayload.amount === 'number' && expensePayload.currency
        ? `${expensePayload.currency} ${expensePayload.amount.toFixed(2)}`
        : null;
    const note = isExpensePayload(payload) ? payload.note : undefined;

    return (
      <div
        key={message.id}
        id={`msg-${message.id}`}
        className="trip-chat-expense-card-wrap"
        style={{ alignSelf: 'center', width: '100%', maxWidth: '320px' }}
      >
        <button
          type="button"
          className={`trip-chat-expense-card trip-chat-expense-card--${variant}`}
          onClick={() => {
            if (onOpenExpenseFromChat && expensePayload.expenseId) onOpenExpenseFromChat(expensePayload.expenseId);
          }}
          onPointerDown={handleBubblePointerDown(message)}
          onPointerUp={handleBubblePointerUp}
          onPointerCancel={handleBubblePointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          <span className="trip-chat-expense-card-icon" aria-hidden="true">
            {icon}
          </span>
          <span className="trip-chat-expense-card-text">
            <span className="trip-chat-expense-card-who">{whoLabel}</span>
            <span className="trip-chat-expense-card-title">{expensePayload.title}</span>
            {amount ? <span className="trip-chat-expense-card-amount">{amount}</span> : null}
            {note ? <span className="trip-chat-expense-card-note">{note}</span> : null}
          </span>
          <span className="trip-chat-expense-card-hint">Tap to view</span>
        </button>
      </div>
    );
  };

  if (!myMemberId) {
    return (
      <div className="glass-card" style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        Join this trip as a member to use chat.
      </div>
    );
  }

  const typingLine =
    typingEnabled && typingNames.length > 0
      ? typingNames.length === 1
        ? `${typingNames[0]} is typing…`
        : `${typingNames.slice(0, 2).join(', ')} are typing…`
      : null;

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
      <LiveLocationChatBanner tripId={tripId} members={members} onShareMyLocation={onOpenLiveLocationShare} />

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
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px', padding: '20px' }}>Loading chat...</div>
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
            const kind = message.kind || 'text';
            const isStructured =
              !isDeleted &&
              (EVENT_CARD_KINDS.has(kind) || kind === 'image' || kind === 'voice_note') &&
              Boolean(message.payload);

            if (isStructured) {
              return renderEventCard(message);
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
                          {memberIds.length > 1 && <span style={{ fontSize: '10px', fontWeight: 600 }}>{memberIds.length}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

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

                  {isMine && isOutboxEnabled && !readReceiptsEnabled && (
                    <span style={{ fontSize: '10.5px' }}>
                      {message.status === 'sending' ? (
                        <span title="Queued offline">🕒</span>
                      ) : message.status === 'sent' ? (
                        <span title="Sent to server" style={{ color: 'var(--text-muted)' }}>
                          ✓
                        </span>
                      ) : (
                        <span title="Delivered" style={{ color: 'var(--primary-accent)' }}>
                          ✓✓
                        </span>
                      )}
                    </span>
                  )}

                  {isMine && readReceiptsEnabled && !isDeleted && (
                    <span
                      className={`trip-chat-read-ticks${isMessageReadByPeers(message) ? ' is-read' : ''}`}
                      title={isMessageReadByPeers(message) ? 'Read' : 'Sent'}
                    >
                      ✓✓
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>

      {typingLine && <div className="trip-chat-typing-line">{typingLine}</div>}

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
        className={`trip-chat-composer${isInputFocused ? ' is-focused' : ''}${isRecording ? ' is-recording' : ''}`}
        style={{
          borderTop: sendError || editingMessage || replyingToMessage || typingLine ? 'none' : '1px solid var(--border-color)',
        }}
      >
        {attachmentsEnabled && !editingMessage && (
          <button
            type="button"
            className="trip-chat-attach-btn"
            aria-label="Attach"
            disabled={isSending || isRecording}
            onClick={() => setAttachSheetOpen(true)}
          >
            +
          </button>
        )}

        {isRecording ? (
          <div className="trip-chat-recording-status" aria-live="polite">
            Recording… {recordSeconds}s / 60s
          </div>
        ) : (
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              broadcastTyping();
            }}
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
            placeholder={
              editingMessage
                ? 'Edit message...'
                : tripbotEnabled
                  ? 'Message or @tripbot Dinner 450…'
                  : 'Message the squad...'
            }
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
        )}

        {voiceEnabled && !editingMessage && !draft.trim() ? (
          <button
            type="button"
            className={`trip-chat-voice-btn${isRecording ? ' is-active' : ''}`}
            aria-label={isRecording ? 'Release to send voice note' : 'Hold to record voice note'}
            disabled={isSending}
            onPointerDown={(e) => {
              e.preventDefault();
              void startVoiceRecording();
            }}
            onPointerUp={() => {
              void stopVoiceRecording(false);
            }}
            onPointerCancel={() => {
              void stopVoiceRecording(true);
            }}
            onPointerLeave={() => {
              if (isRecording) void stopVoiceRecording(false);
            }}
          >
            🎤
          </button>
        ) : (
          <button
            type="button"
            className="gradient-btn"
            disabled={!draft.trim() || isSending || isRecording}
            onClick={handleSend}
            style={{ borderRadius: '20px', padding: '10px 18px', fontSize: '13px', fontWeight: 700 }}
          >
            {editingMessage ? 'Update' : 'Send'}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={undefined}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = '';
          void handleFileChosen(file);
        }}
      />

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

      <ActionSheet
        isOpen={attachSheetOpen}
        onClose={() => setAttachSheetOpen(false)}
        title="Attach"
        items={attachSheetItems}
      />

      <ActionSheet
        isOpen={expensePickOpen}
        onClose={() => setExpensePickOpen(false)}
        title="Attach expense"
        description={expensePickItems.length === 0 ? 'No expenses on this trip yet.' : undefined}
        items={expensePickItems}
      />

      <ExpenseSplitExplainSheet
        isOpen={explainShares !== null}
        onClose={() => setExplainShares(null)}
        title={explainTitle}
        shares={explainShares || []}
      />

      <TripbotConfirmSheet
        isOpen={Boolean(tripbotParsed)}
        onClose={() => setTripbotParsed(null)}
        onConfirm={() => {
          void handleTripbotConfirm();
        }}
        parsed={tripbotParsed}
        isSubmitting={tripbotSubmitting}
        baseCurrency={baseCurrency}
      />
    </div>
  );
}
