import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../app/auth_state.dart';
import '../../../data/providers.dart';
import '../../../domain/models/member.dart';
import '../../../domain/models/trip_message.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/ask_text.dart';
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
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _markSeen(messages);
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
              ? Center(child: Text(l10n.chatEmpty))
              : ListView.builder(
                  key: const Key('chat-list'),
                  controller: _scroll,
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                  itemCount: messages.length,
                  itemBuilder: (context, i) {
                    final m = messages[i];
                    final showDay = i == 0 || _day(messages[i - 1].createdAt) != _day(m.createdAt);
                    return Column(
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
                        else if (_isEvent(m))
                          _event(context, m, dirty.contains(m.id))
                        else
                          _bubble(
                            context,
                            m,
                            members[m.memberId]?.name ?? '',
                            m.memberId == me,
                            dirty.contains(m.id),
                            outboxTicksOn: outboxTicksOn,
                            readReceiptsOn: readReceiptsOn,
                          ),
                      ],
                    );
                  },
                ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          child: Row(
            children: [
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
              IconButton.filled(
                tooltip: 'Send message',
                key: const Key('chat-send'),
                onPressed: _send,
                style: IconButton.styleFrom(backgroundColor: context.tokens.primaryAccent),
                icon: const Icon(Icons.send_rounded, size: 20),
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

    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        key: Key('chat-bubble-${m.id}'),
        onLongPress: mine ? () => _edit(m) : null,
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
              if (!mine && name.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Text(
                    name,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                      color: context.tokens.primaryAccent,
                    ),
                  ),
                ),
              Text(
                m.body,
                style: TextStyle(color: context.tokens.textPrimary, fontSize: 14.5),
              ),
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
                  child: Text(
                    isSettlement ? '🤝' : (isExpense ? '🧾' : '📌'),
                    style: const TextStyle(fontSize: 15),
                  ),
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
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: context.tokens.textPrimary,
                      ),
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
                      Text(
                        context.l10n.chatPending,
                        style: TextStyle(fontSize: 10.5, color: context.tokens.textMuted),
                      ),
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
