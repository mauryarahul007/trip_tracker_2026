import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../data/providers.dart';
import '../../../domain/models/member.dart';
import '../../../domain/models/trip_message.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
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
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Center(child: Text(_day(m.createdAt))),
                          ),
                        if (m.deletedAt != null)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Text(l10n.chatDeleted, style: const TextStyle(fontStyle: FontStyle.italic)),
                          )
                        else if (_isEvent(m))
                          _event(context, m, dirty.contains(m.id))
                        else
                          _bubble(context, m, members[m.memberId]?.name ?? '', m.memberId == me, dirty.contains(m.id)),
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
                  decoration: InputDecoration(hintText: l10n.chatHint),
                  onSubmitted: (_) => _send(),
                ),
              ),
              IconButton(
                tooltip: 'Send message',
                key: const Key('chat-send'),
                onPressed: _send,
                icon: const Icon(Icons.send),
              ),
            ],
          ),
        ),
      ],
    );
  }

  bool _isEvent(TripMessage m) => m.eventKind != null && m.eventKind != 'text';

  Widget _bubble(BuildContext context, TripMessage m, String name, bool mine, bool pending) {
    final l10n = context.l10n;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        key: Key('chat-bubble-${m.id}'),
        onLongPress: mine ? () => _edit(m) : null,
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 4),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          constraints: const BoxConstraints(maxWidth: 280),
          decoration: BoxDecoration(
            gradient: mine ? AppTokens.ctaGradient : null,
            color: mine ? null : context.tokens.bgSurface,
            boxShadow: mine ? null : context.tokens.shadowSm,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(20),
              topRight: const Radius.circular(20),
              bottomLeft: Radius.circular(mine ? 20 : 6),
              bottomRight: Radius.circular(mine ? 6 : 20),
            ),
          ),
          child: DefaultTextStyle.merge(
            style: TextStyle(color: mine ? Colors.white : context.tokens.textPrimary),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!mine)
                  Text(
                    name,
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: context.tokens.primaryAccent),
                  ),
                Text(m.body),
                if (pending) Text(l10n.chatPending, style: const TextStyle(fontSize: 11)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _event(BuildContext context, TripMessage m, bool pending) {
    final expenseId = m.payload?['expenseId'] as String?;
    return Align(
      alignment: Alignment.center,
      child: InkWell(
        key: Key('chat-event-${m.id}'),
        onTap: expenseId == null ? null : () => _openExpense(expenseId),
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 6),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(m.body),
              if (pending) Text(context.l10n.chatPending, style: const TextStyle(fontSize: 11)),
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

  String _day(int ms) {
    final d = DateTime.fromMillisecondsSinceEpoch(ms);
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }
}
