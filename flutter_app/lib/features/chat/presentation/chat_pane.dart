import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../notifications/application/activity_focus.dart';

import 'package:intl/intl.dart';

import '../../../app/auth_state.dart';
import '../../../core/flags/compass_flags.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/chat_event_text.dart';
import '../../../domain/logic/chat_poll.dart';
import '../../../domain/models/member.dart';
import '../../../domain/models/trip_message.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_avatar.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/ask_text.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../expenses/application/expenses_providers.dart';
import '../../expenses/presentation/widgets/expense_detail_sheet.dart';
import '../../travel/presentation/live_location_chat_banner.dart';
import '../../travel/presentation/live_location_share_modal.dart';
import '../application/chat_providers.dart';

class ChatPane extends ConsumerStatefulWidget {
  const ChatPane({required this.tripId, super.key});
  final String tripId;

  @override
  ConsumerState<ChatPane> createState() => _ChatPaneState();
}

class _ChatPaneState extends ConsumerState<ChatPane> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _focusKey = GlobalKey();
  String? _highlightId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        try {
          unawaited(ref.read(syncCoordinatorProvider).pull.syncTrip(widget.tripId));
        } catch (_) {}
      }
    });
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  /// Scroll to a message opened from Activity and flash it. Rows differ in height, so jump to an estimate
  /// until the row is built, then centre it exactly.
  Future<void> _reveal(List<TripMessage> ms, String id) async {
    final i = ms.indexWhere((m) => m.id == id);
    if (i < 0) return;
    setState(() => _highlightId = id);
    for (var t = 0; t < 8 && mounted; t++) {
      await WidgetsBinding.instance.endOfFrame;
      final ctx = _focusKey.currentContext;
      if (ctx != null && ctx.mounted) {
        await Scrollable.ensureVisible(ctx, alignment: 0.4, duration: const Duration(milliseconds: 250));
        break;
      }
      if (_scroll.hasClients) {
        _scroll.jumpTo((_scroll.position.maxScrollExtent * i / ms.length).clamp(0.0, _scroll.position.maxScrollExtent));
      }
    }
    await Future<void>.delayed(const Duration(seconds: 2));
    if (mounted) setState(() => _highlightId = null);
  }

  void _markSeen(List<TripMessage> messages) {
    final latest = latestVisible(messages);
    if (latest == null) return;
    final seen = ref.read(chatSeenProvider(widget.tripId));
    if (seen == latest.id) return;
    ref.read(chatSeenProvider(widget.tripId).notifier).mark(latest.id);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final messages = ref.watch(tripMessagesProvider(widget.tripId)).value ?? const <TripMessage>[];
    final members = {for (final m in ref.watch(tripMembersProvider(widget.tripId)).value ?? const <Member>[]) m.id: m};
    final me = ref.watch(myMemberIdProvider(widget.tripId));
    final dirty = ref.watch(dirtyIdsProvider).value ?? const <String>{};
    final showLiveBanner = ref.watch(flagProvider(('enableLiveLocationShare', widget.tripId))).value ?? false;
    final outboxTicksOn = ref.watch(flagProvider(('enableChatOfflineOutbox', widget.tripId))).value ?? false;
    final readReceiptsOn = ref.watch(flagProvider(('enableChatReadReceipts', widget.tripId))).value ?? false;
    final pages = ref.watch(compassFlagProvider((compassTripPagesFlag, widget.tripId)));
    final pollsOn = ref.watch(compassFlagProvider((tripPollsFlag, widget.tripId)));
    final reactionsOn = ref.watch(flagProvider(('enableChatReactionsAndReplies', widget.tripId))).value ?? false;
    final focus = ref.watch(activityFocusProvider);
    final focusId = focus?.kind == 'message' && messages.any((m) => m.id == focus!.id) ? focus!.id : null;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _markSeen(messages);
      if (focusId != null && ref.read(activityFocusProvider)?.id == focusId) {
        ref.read(activityFocusProvider.notifier).set(null);
        unawaited(_reveal(messages, focusId));
      }
    });

    return Column(
      key: const Key('tab-chat'),
      children: [
        if (showLiveBanner)
          LiveLocationChatBanner(
            tripId: widget.tripId,
            members: members.values.toList(),
            onShareMyLocation: () {
              final userId = ref.read(authStateProvider).user?.id ?? '';
              LiveLocationShareModal.show(context, tripId: widget.tripId, memberId: me ?? '', userId: userId);
            },
          ),
        Expanded(
          child: messages.isEmpty
              ? EmptyState(title: l10n.chatEmpty, subtitle: '', plain: true)
              : ListView.builder(
                  key: const Key('chat-list'),
                  controller: _scroll,
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                  itemCount: messages.length,
                  itemBuilder: (context, i) {
                    final m = messages[i];
                    final showDay = i == 0 || _day(messages[i - 1].createdAt) != _day(m.createdAt);
                    return Container(
                      key: m.id == _highlightId ? _focusKey : null,
                      decoration: BoxDecoration(
                        color: m.id == _highlightId ? context.tokens.primaryAccent.withValues(alpha: 0.15) : null,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (showDay)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              child: Center(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: context.tokens.bgSurface,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: context.tokens.borderColor.withValues(alpha: 0.6)),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.04),
                                        blurRadius: 4,
                                        offset: const Offset(0, 1),
                                      ),
                                    ],
                                  ),
                                  child: Text(
                                    _formatDayLabel(m.createdAt),
                                    style: TextStyle(
                                      fontFamily: AppTypography.fontMono,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.5,
                                      color: context.tokens.textSecondary,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          if (m.deletedAt != null)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Text(l10n.chatDeleted, style: const TextStyle(fontStyle: FontStyle.italic)),
                            )
                          else if (m.eventKind == 'poll' && pollsOn && pollFromPayload(m.payload) != null)
                            _pollCard(context, m, members[m.memberId]?.name ?? '')
                          else if (_isEvent(m))
                            pages
                                ? _eventLine(context, m, dirty.contains(m.id))
                                : _event(context, m, dirty.contains(m.id))
                          else
                            _bubble(
                              context,
                              m,
                              members[m.memberId]?.name ?? '',
                              m.memberId == me,
                              dirty.contains(m.id),
                              outboxTicksOn: outboxTicksOn,
                              readReceiptsOn: readReceiptsOn,
                              // Compass: avatar on the first message of a run, name shown once per run.
                              firstOfRun: pages && !(!showDay && i > 0 && _sameRun(messages[i - 1], m)),
                              showAvatar: pages,
                              reactionsOn: reactionsOn,
                            ),
                        ],
                      ),
                    );
                  },
                ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          child: Row(
            children: [
              if (pollsOn)
                IconButton(
                  key: const Key('chat-poll'),
                  tooltip: 'Create a poll',
                  onPressed: _newPoll,
                  icon: Icon(Icons.poll_outlined, color: context.tokens.textSecondary),
                ),
              Expanded(
                child: TextField(
                  key: const Key('chat-input'),
                  controller: _input,
                  decoration: InputDecoration(
                    hintText: l10n.chatHint,
                    filled: true,
                    fillColor: context.tokens.bgSurface,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(99), borderSide: BorderSide.none),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(99),
                      borderSide: BorderSide(color: context.tokens.borderColor),
                    ),
                  ),
                  onSubmitted: (_) => _send(),
                ),
              ),
              const SizedBox(width: 8),
              ValueListenableBuilder<TextEditingValue>(
                valueListenable: _input,
                builder: (context, v, _) => IconButton.filled(
                  tooltip: 'Send message',
                  key: const Key('chat-send'),
                  onPressed: _send,
                  style: IconButton.styleFrom(
                    minimumSize: const Size(48, 48),
                    backgroundColor: pages && v.text.trim().isEmpty
                        ? context.tokens.borderColor
                        : context.tokens.primaryAccent,
                  ),
                  icon: const Icon(Icons.send_rounded, size: 20),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  bool _isEvent(TripMessage m) => m.eventKind != null && m.eventKind != 'text';

  Widget _bubble(
    BuildContext context,
    TripMessage m,
    String name,
    bool mine,
    bool pending, {
    required bool outboxTicksOn,
    required bool readReceiptsOn,
    bool firstOfRun = true,
    bool showAvatar = false,
    bool reactionsOn = false,
  }) {
    final l10n = context.l10n;
    final timeStr = _formatTime(m.createdAt);

    Widget? statusIcon;
    if (mine) {
      if (pending) {
        statusIcon = Icon(
          Icons.access_time_rounded,
          size: 11,
          key: Key('chat-status-pending-${m.id}'),
          color: context.tokens.textMuted,
        );
      } else if (readReceiptsOn) {
        statusIcon = Icon(
          Icons.done_all_rounded,
          size: 14,
          key: Key('chat-status-read-${m.id}'),
          color: context.tokens.primaryAccent,
        );
      } else if (outboxTicksOn) {
        statusIcon = Icon(
          Icons.done_all_rounded,
          size: 14,
          key: Key('chat-status-sent-${m.id}'),
          color: context.tokens.textMuted,
        );
      }
    }

    final bubble = Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        key: Key('chat-bubble-${m.id}'),
        onLongPress: reactionsOn ? () => _reactSheet(m, mine) : (mine ? () => _edit(m) : null),
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 3),
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
          constraints: const BoxConstraints(maxWidth: 290),
          decoration: BoxDecoration(
            color: mine ? context.tokens.tones.mint.bg : context.tokens.bgSurface,
            boxShadow: mine ? null : context.tokens.shadowSm,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft: Radius.circular(mine ? 16 : 4),
              bottomRight: Radius.circular(mine ? 4 : 16),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!mine && name.isNotEmpty && firstOfRun)
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Text(
                    name,
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: context.tokens.primaryAccent),
                  ),
                ),
              Text(m.body, style: TextStyle(color: context.tokens.textPrimary, fontSize: 14.5)),
              const SizedBox(height: 2),
              Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (m.editedAt != null) ...[
                    Text(
                      'edited · ',
                      style: TextStyle(fontSize: 10, color: context.tokens.textMuted, fontStyle: FontStyle.italic),
                    ),
                  ],
                  if (timeStr.isNotEmpty)
                    Text(
                      timeStr,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontFamily: AppTypography.fontMono,
                        color: context.tokens.textMuted,
                      ),
                    ),
                  if (statusIcon != null) ...[
                    const SizedBox(width: 4),
                    statusIcon,
                  ] else if (pending) ...[
                    const SizedBox(width: 4),
                    Text(l10n.chatPending, style: const TextStyle(fontSize: 10)),
                  ],
                ],
              ),
              if (reactionsOn && m.reactions.isNotEmpty) _reactionChips(m),
            ],
          ),
        ),
      ),
    );
    if (!showAvatar || mine) return bubble;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        SizedBox(width: 30, child: firstOfRun ? AppAvatar(name: name, size: 26) : null),
        const SizedBox(width: 6),
        Flexible(child: bubble),
      ],
    );
  }

  Future<void> _newPoll() async {
    final draft = await AppSheet.show<_PollDraft>(
      context: context,
      title: 'Create a poll',
      builder: (_) => const _PollSheet(),
    );
    if (draft == null) return;
    final me = ref.read(myMemberIdProvider(widget.tripId));
    final members = ref.read(tripMembersProvider(widget.tripId)).value ?? const <Member>[];
    final memberId = me ?? (members.isEmpty ? null : members.first.id);
    if (memberId == null) return;
    final name = members.where((m) => m.id == memberId).map((m) => m.name).firstOrNull ?? '';
    await ref
        .read(messageRepositoryProvider)
        .sendPoll(
          tripId: widget.tripId,
          memberId: memberId,
          senderName: name,
          question: draft.question,
          options: draft.options,
        );
  }

  /// A poll in the chat: question, one tappable bar per option with its count, and Close for the person who asked.
  Widget _pollCard(BuildContext context, TripMessage m, String asker) {
    final t = context.tokens;
    final poll = pollFromPayload(m.payload)!;
    final me = _me;
    final mine = m.memberId == me;
    final voted = me == null ? null : poll.votedBy(me);
    final total = poll.totalVotes;
    return Center(
      child: Container(
        key: Key('poll-${m.id}'),
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(14),
        constraints: const BoxConstraints(maxWidth: 340),
        decoration: BoxDecoration(
          color: t.bgSurface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: t.borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              asker.isEmpty ? 'POLL' : 'POLL · ${asker.toUpperCase()}',
              style: TextStyle(fontSize: 11, letterSpacing: 1, fontWeight: FontWeight.w700, color: t.textMuted),
            ),
            const SizedBox(height: 4),
            Text(
              poll.question,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: t.textPrimary),
            ),
            const SizedBox(height: 10),
            for (final o in poll.options)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: InkWell(
                  key: Key('poll-${m.id}-${o.id}'),
                  borderRadius: BorderRadius.circular(12),
                  onTap: poll.closed || me == null
                      ? null
                      : () => ref.read(messageRepositoryProvider).vote(m.id, o.id, me),
                  child: Container(
                    constraints: const BoxConstraints(minHeight: 48),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: voted == o.id ? t.primaryAccent : t.borderColor,
                        width: voted == o.id ? 2 : 1,
                      ),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(11),
                      child: Stack(
                        alignment: Alignment.centerLeft,
                        children: [
                          Positioned.fill(
                            child: FractionallySizedBox(
                              alignment: Alignment.centerLeft,
                              widthFactor: total == 0 ? 0 : o.count / total,
                              child: ColoredBox(
                                color: (poll.leaders.contains(o.id) ? t.primaryAccent : t.textMuted).withValues(
                                  alpha: 0.16,
                                ),
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            child: Row(
                              children: [
                                if (voted == o.id)
                                  Padding(
                                    padding: const EdgeInsets.only(right: 6),
                                    child: Icon(Icons.check_circle_rounded, size: 18, color: t.primaryAccent),
                                  ),
                                Expanded(
                                  child: Text(o.text, style: TextStyle(color: t.textPrimary)),
                                ),
                                Text(
                                  '${o.count}',
                                  style: TextStyle(fontWeight: FontWeight.w700, color: t.textSecondary),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            Row(
              children: [
                Expanded(
                  child: Text(
                    poll.closed
                        ? 'Closed · $total vote${total == 1 ? '' : 's'}'
                        : '$total vote${total == 1 ? '' : 's'}',
                    style: TextStyle(fontSize: 12, color: t.textSecondary),
                  ),
                ),
                if (mine && !poll.closed)
                  TextButton(
                    key: Key('poll-close-${m.id}'),
                    style: TextButton.styleFrom(minimumSize: const Size(0, 44)),
                    onPressed: () => ref.read(messageRepositoryProvider).closePoll(m.id),
                    child: const Text('Close poll'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static const _emojis = ['👍', '❤️', '😂', '😮', '🙏'];

  String? get _me => ref.read(myMemberIdProvider(widget.tripId));

  Future<void> _toggleReaction(TripMessage m, String emoji) async {
    final me = _me;
    if (me == null) return;
    await ref.read(messageRepositoryProvider).react(m.id, emoji, me);
  }

  /// Emoji counts under a message; tap one to add or remove your own.
  Widget _reactionChips(TripMessage m) {
    final t = context.tokens;
    final me = _me;
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Wrap(
        spacing: 4,
        runSpacing: 4,
        children: [
          for (final e in m.reactions.entries)
            if (e.value.isNotEmpty)
              InkWell(
                key: Key('reaction-${m.id}-${e.key}'),
                borderRadius: BorderRadius.circular(99),
                onTap: () => _toggleReaction(m, e.key),
                child: Container(
                  constraints: const BoxConstraints(minHeight: 28),
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: e.value.contains(me) ? t.primaryAccent.withValues(alpha: 0.18) : t.bgSurface,
                    borderRadius: BorderRadius.circular(99),
                    border: Border.all(color: e.value.contains(me) ? t.primaryAccent : t.borderColor),
                  ),
                  child: Text('${e.key} ${e.value.length}', style: const TextStyle(fontSize: 12.5)),
                ),
              ),
        ],
      ),
    );
  }

  /// Long-press a message: pick a reaction (and Edit, for your own).
  Future<void> _reactSheet(TripMessage m, bool mine) async {
    final pick = await AppSheet.show<String>(
      context: context,
      builder: (sheetCtx) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              for (final e in _emojis)
                IconButton(
                  key: Key('react-pick-$e'),
                  iconSize: 30,
                  constraints: const BoxConstraints(minWidth: 52, minHeight: 52),
                  onPressed: () => Navigator.of(sheetCtx).pop(e),
                  icon: Text(e, style: const TextStyle(fontSize: 28)),
                ),
            ],
          ),
          if (mine)
            ListTile(
              key: const Key('react-edit'),
              leading: const Icon(Icons.edit_outlined),
              title: Text(context.l10n.chatEdit),
              onTap: () => Navigator.of(sheetCtx).pop('edit'),
            ),
          const SizedBox(height: 8),
        ],
      ),
    );
    if (pick == null) return;
    if (pick == 'edit') {
      await _edit(m);
    } else {
      await _toggleReaction(m, pick);
    }
  }

  bool _sameRun(TripMessage a, TripMessage b) =>
      !_isEvent(a) && !_isEvent(b) && a.deletedAt == null && a.memberId == b.memberId;

  /// Compass: an expense or payment as one small centered line, not a card.
  Widget _eventLine(BuildContext context, TripMessage m, bool pending) {
    final t = context.tokens;
    final expenseId = m.payload?['expenseId'] as String?;
    final isSettlement = m.eventKind?.contains('settle') ?? false;
    return Center(
      child: InkWell(
        key: Key('chat-event-${m.id}'),
        onTap: expenseId == null ? null : () => _openExpense(expenseId),
        borderRadius: BorderRadius.circular(99),
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 5),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          constraints: const BoxConstraints(maxWidth: 330, minHeight: 32),
          decoration: BoxDecoration(color: t.bgSurface.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(99)),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isSettlement ? Icons.handshake_outlined : Icons.receipt_long_outlined,
                size: 15,
                color: isSettlement ? t.colorSuccess : t.textSecondary,
              ),
              const SizedBox(width: 7),
              Flexible(
                child: Text(
                  tidyChatEvent(m.body),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12.5, color: t.textSecondary, fontWeight: FontWeight.w500),
                ),
              ),
              if (pending) Text('  ${context.l10n.chatPending}', style: TextStyle(fontSize: 10.5, color: t.textMuted)),
              if (expenseId != null) Icon(Icons.chevron_right_rounded, size: 16, color: t.textMuted),
            ],
          ),
        ),
      ),
    );
  }

  Widget _event(BuildContext context, TripMessage m, bool pending) {
    final expenseId = m.payload?['expenseId'] as String?;
    final isExpense = expenseId != null || (m.eventKind?.contains('expense') ?? false);
    final isSettlement = m.eventKind?.contains('settle') ?? false;

    return Align(
      alignment: Alignment.center,
      child: InkWell(
        key: Key('chat-event-${m.id}'),
        onTap: expenseId == null ? null : () => _openExpense(expenseId),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 6),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          constraints: const BoxConstraints(maxWidth: 340),
          decoration: BoxDecoration(
            color: context.tokens.bgSurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: context.tokens.borderColor),
            boxShadow: context.tokens.shadowSm,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: isSettlement
                      ? const Color(0xFF10B981).withValues(alpha: 0.12)
                      : context.tokens.primaryAccent.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(isSettlement ? '🤝' : (isExpense ? '🧾' : '📌'), style: const TextStyle(fontSize: 15)),
                ),
              ),
              const SizedBox(width: 10),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      m.body,
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: context.tokens.textPrimary),
                    ),
                    if (expenseId != null) ...[
                      const SizedBox(height: 2),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'View expense details',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: context.tokens.primaryAccent,
                            ),
                          ),
                          const SizedBox(width: 3),
                          Icon(Icons.arrow_forward_ios_rounded, size: 9, color: context.tokens.primaryAccent),
                        ],
                      ),
                    ],
                    if (pending)
                      Text(context.l10n.chatPending, style: TextStyle(fontSize: 10.5, color: context.tokens.textMuted)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _send() async {
    final body = _input.text.trim();
    if (body.isEmpty) return;
    final me = ref.read(myMemberIdProvider(widget.tripId));
    final members = ref.read(tripMembersProvider(widget.tripId)).value ?? const <Member>[];
    final memberId = me ?? (members.isEmpty ? null : members.first.id);
    if (memberId == null) return;
    final name = members.where((m) => m.id == memberId).map((m) => m.name).firstOrNull ?? '';
    _input.clear();
    await ref
        .read(messageRepositoryProvider)
        .send(tripId: widget.tripId, memberId: memberId, senderName: name, body: body);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _edit(TripMessage m) async {
    final next = await askText(context, context.l10n.chatEdit, initial: m.body);
    if (next == null) return;
    if (next.isEmpty) {
      await ref.read(messageRepositoryProvider).delete(m.id);
      return;
    }
    await ref.read(messageRepositoryProvider).edit(m.id, next);
  }

  void _openExpense(String expenseId) {
    final repo = ref.read(expenseRepositoryProvider);
    AppSheet.show<void>(
      context: context,
      builder: (sheetCtx) => ExpenseDetailSheet(
        tripId: widget.tripId,
        expenseId: expenseId,
        onEdit: () {
          Navigator.of(sheetCtx).pop();
          context.push('/trip/${widget.tripId}/expenses/$expenseId/edit');
        },
        onDelete: () {
          Navigator.of(sheetCtx).pop();
          final uid = ref.read(authStateProvider).userId ?? '';
          unawaited(repo.delete(expenseId, userId: uid));
        },
      ),
    );
  }

  String _formatDayLabel(int ms) {
    if (ms <= 0) return '';
    final d = DateTime.fromMillisecondsSinceEpoch(ms).toLocal();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(d.year, d.month, d.day);
    final diff = today.difference(target).inDays;

    if (diff == 0) return 'Today';
    if (diff == 1) return 'Yesterday';
    return DateFormat('EEE, d MMM y').format(d);
  }

  String _day(int ms) {
    final d = DateTime.fromMillisecondsSinceEpoch(ms);
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  String _formatTime(int ms) {
    if (ms <= 0) return '';
    final d = DateTime.fromMillisecondsSinceEpoch(ms).toLocal();
    final hour = d.hour % 12 == 0 ? 12 : d.hour % 12;
    final min = d.minute.toString().padLeft(2, '0');
    final period = d.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$min $period';
  }
}

class _PollDraft {
  const _PollDraft(this.question, this.options);
  final String question;
  final List<String> options;
}

/// Question plus 2 to 6 options.
class _PollSheet extends StatefulWidget {
  const _PollSheet();

  @override
  State<_PollSheet> createState() => _PollSheetState();
}

class _PollSheetState extends State<_PollSheet> {
  final _question = TextEditingController();
  final _options = [TextEditingController(), TextEditingController()];

  @override
  void dispose() {
    _question.dispose();
    for (final c in _options) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _valid => _question.text.trim().isNotEmpty && _options.where((c) => c.text.trim().isNotEmpty).length >= 2;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            key: const Key('poll-question'),
            controller: _question,
            autofocus: true,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(labelText: 'Question', hintText: 'Where shall we eat tonight?'),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 8),
          for (var i = 0; i < _options.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: TextField(
                key: Key('poll-option-$i'),
                controller: _options[i],
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(labelText: 'Option ${i + 1}'),
                onChanged: (_) => setState(() {}),
              ),
            ),
          if (_options.length < 6)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                key: const Key('poll-add-option'),
                onPressed: () => setState(() => _options.add(TextEditingController())),
                icon: const Icon(Icons.add_rounded),
                label: const Text('Add option'),
              ),
            ),
          const SizedBox(height: 8),
          FilledButton(
            key: const Key('poll-post'),
            style: FilledButton.styleFrom(minimumSize: const Size(0, 48)),
            onPressed: _valid
                ? () => Navigator.pop(context, _PollDraft(_question.text, [for (final c in _options) c.text]))
                : null,
            child: const Text('Post poll'),
          ),
        ],
      ),
    );
  }
}
