import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/platform/motion.dart';

import '../../../core/platform/external_launcher.dart';
import '../../../core/platform/share_service.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../domain/logic/ics_export_service.dart';
import '../../../domain/logic/pass_sort.dart';
import '../../../domain/logic/summary_features.dart';
import '../../../domain/logic/travel_status_service.dart';
import '../../../domain/logic/trip_utilities.dart';
import '../../../domain/models/checklist_item.dart';
import '../../../domain/models/member.dart';
import '../../../domain/models/travel_pass.dart';
import '../../../domain/models/trip_note.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../domain/models/trip.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/bento_tile.dart';
import '../../../shared/widgets/undo_snackbar.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../chat/application/chat_providers.dart';
import '../../chat/presentation/chat_pane.dart';
import '../../expenses/application/expenses_providers.dart';
import '../../travel/presentation/live_travel_status_modal.dart';
import '../../travel/presentation/next_up_capsule.dart';
import '../../travel/presentation/pass_scanner_modal.dart';
import '../../travel/presentation/weather_badge.dart';
import '../../members/presentation/members_tab.dart';
import '../../trip_details/application/trip_nav.dart';
import 'pass_card.dart';

const _categories = ['packing', 'prep', 'documents', 'medical', 'general'];

class NotesTab extends ConsumerStatefulWidget {
  const NotesTab({required this.tripId, super.key});
  final String tripId;

  @override
  ConsumerState<NotesTab> createState() => _NotesTabState();
}

class _NotesTabState extends ConsumerState<NotesTab> {
  PassSort _passSort = PassSort.time;
  var _selecting = false; // pass multi-select (needs enablePassEditDelete)
  final _picked = <String>{};
  var _pane = 'checklist';

  /// Ticks the user just made, shown at once and cleared when the stored list agrees. Keeps the checklist
  /// responsive (and later taps correct) even if a sync round-trip is slow or briefly sends an older copy back.
  final _pendingDone = <String, bool>{};
  var _category = 'all';
  final _quick = TextEditingController();

  @override
  void dispose() {
    _quick.dispose();
    super.dispose();
  }

  /// "Passes (2)": the name stays its own Text so it can still be found by label.
  Widget _countLabel(String name, int n) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Flexible(child: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis)),
      if (n > 0) Text(' ($n)', maxLines: 1),
    ],
  );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final trip = ref.watch(tripProvider(widget.tripId)).value;
    final chatOn = _flag('enableTripChat');
    final chatFirst = _flag('enableChatFirstNav');
    final showChat = chatOn && !chatFirst;
    final passesOn = _flag('enableTravelPasses');
    final tidyOn = _flag('enableTidyNotes');
    final packing = _flag('enablePackingAssistant');
    final unread = ref.watch(chatUnreadProvider(widget.tripId));
    if (!showChat && _pane == 'chat') _pane = 'checklist';

    final panes = [
      if (passesOn) ('passes', l10n.notesPasses),
      ('checklist', l10n.notesCheck),
      ('notes', l10n.notesNotes),
      if (showChat) ('chat', l10n.notesChat),
    ];
    if (!panes.any((p) => p.$1 == _pane)) _pane = 'checklist';

    final content = Column(
      key: const Key('tab-notes'),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
          child: SegmentedButton<String>(
            key: const Key('notes-panes'),
            segments: [
              for (final p in panes)
                ButtonSegment(
                  value: p.$1,
                  label: p.$1 == 'chat' && unread
                      ? Text(p.$2, key: const Key('notes-chat-unread'), maxLines: 1)
                      : switch (p.$1) {
                          'passes' => _countLabel(p.$2, trip?.passes.length ?? 0),
                          'checklist' => _countLabel(p.$2, trip?.checklist.length ?? 0),
                          'notes' when tidyOn => _countLabel(p.$2, trip?.notes.length ?? 0),
                          _ => Text(p.$2, maxLines: 1, overflow: TextOverflow.ellipsis),
                        },
                ),
            ],
            showSelectedIcon: false,
            style: SegmentedButton.styleFrom(
              shape: const StadiumBorder(),
              side: BorderSide.none,
              backgroundColor: context.tokens.bgSurface,
              selectedBackgroundColor: context.tokens.primaryAccent.withValues(alpha: 0.18),
              selectedForegroundColor: context.tokens.textPrimary,
              textStyle: const TextStyle(fontWeight: FontWeight.w700),
            ),
            selected: {_pane},
            onSelectionChanged: (s) => setState(() => _pane = s.first),
          ),
        ),
        Expanded(
          child: switch (_pane) {
            'passes' => _passesPane(context, trip),
            'notes' => _notes(context, trip?.notes ?? const []),
            'chat' => ChatPane(tripId: widget.tripId),
            _ => _checklist(context, trip?.checklist ?? const [], packing),
          },
        ),
      ],
    );
    // One quick action for the pane you are on (Add item / Add note); the in-page buttons stay.
    final fabOn = _flag('enableContextFab') && (_pane == 'checklist' || _pane == 'notes');
    final withFab = !fabOn
        ? content
        : Stack(
            children: [
              content,
              Positioned(
                right: 16,
                bottom: 16,
                child: FloatingActionButton.extended(
                  key: const Key('notes-fab'),
                  heroTag: null,
                  onPressed: () => _pane == 'notes'
                      ? _addNote(context, trip?.notes ?? const [])
                      : _editItem(context, trip?.checklist ?? const []),
                  icon: const Icon(Icons.add_rounded),
                  label: Text(_pane == 'notes' ? l10n.notesAddNote : l10n.notesAddItem),
                ),
              ),
            ],
          );
    // Desktop: planner layout, members as a third column next to notes and passes.
    if (MediaQuery.sizeOf(context).width < 1280) return withFab;
    return Row(
      children: [
        Expanded(child: withFab),
        Container(
          key: const Key('planner-members'),
          width: 340,
          decoration: BoxDecoration(
            border: Border(left: BorderSide(color: context.tokens.borderColor)),
          ),
          child: MembersTab(tripId: widget.tripId),
        ),
      ],
    );
  }

  bool _flag(String key) => ref.watch(flagProvider((key, widget.tripId))).value ?? (defaultFeatureFlags[key] ?? false);

  /// Passes get a whole pane: the next-up capsule, a sort control, one tile per pass (grouped under a
  /// header per flight in Leg mode) and the add / calendar buttons.
  Widget _passesPane(BuildContext context, Trip? trip) {
    final l10n = context.l10n;
    final passes = trip?.passes ?? const <TravelPass>[];
    final gateScannerOn = _flag('enableGateScanner');
    final icsOn = _flag('enableIcsExport');
    final sortOn = _flag('enablePassSorting');
    final editDeleteOn = _flag('enablePassEditDelete');
    final shown = sortOn ? sortPasses(passes, _passSort) : passes;
    // Previous pass's leg in `shown`, so a header prints only when the leg changes.
    String? lastLeg(TravelPass p) {
      final i = shown.indexOf(p);
      return i == 0 ? null : passLeg(shown[i - 1]);
    }

    return ListView(
      key: const Key('notes-passes'),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
      children: [
        if (trip != null) NextUpTravelCapsule(trip: trip, passes: passes),
        Padding(
          padding: const EdgeInsets.fromLTRB(0, 8, 0, 8),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  _selecting
                      ? '${_picked.length} selected'
                      : (passes.isEmpty ? l10n.notesPasses : '${l10n.notesPasses} · ${passes.length}'),
                  style: TextStyle(
                    fontFamily: AppTypography.fontTitle,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: context.tokens.textPrimary,
                  ),
                ),
              ),
              if (_selecting) ...[
                TextButton(
                  key: const Key('pass-select-all'),
                  onPressed: () => setState(() {
                    if (_picked.length == passes.length) {
                      _picked.clear();
                    } else {
                      _picked.addAll(passes.map((x) => x.id));
                    }
                  }),
                  child: Text(_picked.length == passes.length ? 'Clear' : 'Select all'),
                ),
                IconButton(
                  key: const Key('pass-delete-selected'),
                  tooltip: 'Delete selected',
                  icon: const Icon(Icons.delete_outline_rounded),
                  onPressed: _picked.isEmpty ? null : () => unawaited(_deletePicked(context, passes)),
                ),
                IconButton(
                  key: const Key('pass-select-cancel'),
                  tooltip: 'Cancel',
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => setState(() {
                    _selecting = false;
                    _picked.clear();
                  }),
                ),
              ] else ...[
                if (editDeleteOn && passes.length > 1)
                  TextButton(
                    key: const Key('pass-select'),
                    onPressed: () => setState(() => _selecting = true),
                    child: const Text('Select'),
                  ),
                AppButton(
                  key: const Key('pass-add'),
                  label: l10n.notesAddPass,
                  icon: Icons.add_rounded,
                  onPressed: () => _addPass(context, passes),
                ),
              ],
            ],
          ),
        ),
        if (sortOn && passes.length >= 3)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: SegmentedButton<PassSort>(
              key: const Key('pass-sort'),
              showSelectedIcon: false,
              segments: [
                ButtonSegment(value: PassSort.time, label: Text(l10n.notesSortTime)),
                ButtonSegment(value: PassSort.leg, label: Text(l10n.notesSortLeg)),
                ButtonSegment(value: PassSort.name, label: Text(l10n.notesSortName)),
              ],
              selected: {_passSort},
              onSelectionChanged: (v) => setState(() => _passSort = v.first),
            ),
          ),
        for (final p in shown) ...[
          if (sortOn && _passSort == PassSort.leg && passLeg(p) != lastLeg(p))
            Padding(
              key: Key('pass-leg-${passLeg(p)}'),
              padding: const EdgeInsets.only(top: 12, bottom: 8),
              child: Text(
                passLeg(p).isEmpty ? '—' : passLeg(p).replaceAll('_', ' · '),
                style: TextStyle(
                  fontFamily: AppTypography.fontTitle,
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: context.tokens.textSecondary,
                ),
              ),
            ),
          Builder(
            builder: (ctx) {
              final statusInfo = getTravelStatusInfo(p);
              final card = PassCard(
                pass: p,
                onEdit: editDeleteOn ? () => unawaited(_editPass(ctx, passes, p)) : null,
                onDelete: editDeleteOn ? () => unawaited(_deletePass(ctx, passes, p)) : null,
                onScan: gateScannerOn ? () => PassScannerModal.show(ctx, pass: p) : null,
                onStatus: statusInfo != null ? () => LiveTravelStatusModal.show(ctx, statusInfo) : null,
                onTap: () {
                  if (gateScannerOn) {
                    PassScannerModal.show(ctx, pass: p);
                  } else if (statusInfo != null) {
                    LiveTravelStatusModal.show(ctx, statusInfo);
                  }
                },
              );
              if (!_selecting) return card;
              return Row(
                children: [
                  Checkbox(
                    key: Key('pass-pick-${p.id}'),
                    value: _picked.contains(p.id),
                    onChanged: (v) => setState(() => v == true ? _picked.add(p.id) : _picked.remove(p.id)),
                  ),
                  Expanded(child: AbsorbPointer(child: card)),
                ],
              );
            },
          ),
        ],
        if (icsOn && passes.isNotEmpty && trip != null)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              key: const Key('pass-export-ics'),
              icon: const Icon(Icons.calendar_month, size: 16),
              label: const Text('Add to Calendar'),
              onPressed: () => shareTripIcs(trip: trip, shareService: ref.read(shareServiceProvider), passes: passes),
            ),
          ),
      ],
    );
  }

  Widget _checklist(BuildContext context, List<ChecklistItem> items, bool packing) {
    final l10n = context.l10n;
    final t = context.tokens;
    final trip = ref.watch(tripProvider(widget.tripId)).value;
    final members = ref.watch(tripMembersProvider(widget.tripId)).value ?? const <Member>[];
    // Drop overlay entries the stored list now agrees with (the save landed).
    _pendingDone.removeWhere((id, v) => items.any((i) => i.id == id && i.completed == v));
    final shown = [
      for (final i in items)
        if (_category == 'all' || i.category == _category) i,
    ];
    final done = items.where((i) => (_pendingDone[i.id] ?? i.completed)).length;
    final dest = trip?.destination?.isNotEmpty == true ? trip!.destination : trip?.name;
    return ListView(
      key: const Key('checklist'),
      padding: EdgeInsets.fromLTRB(16, 4, 16, _flag('enableContextFab') ? 88 : 32), // clear of the floating Add
      children: [
        BentoTile(
          tone: BentoTone.mint,
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              SizedBox(
                width: 64,
                height: 64,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox.expand(
                      child: CircularProgressIndicator(
                        key: const Key('checklist-ring'),
                        value: items.isEmpty ? 0 : done / items.length,
                        strokeWidth: 6,
                        strokeCap: StrokeCap.round,
                        backgroundColor: t.textPrimary.withValues(alpha: 0.12),
                        color: t.textPrimary,
                      ),
                    ),
                    // Percent inside the ring (short, always fits); the exact count is spelled out beside it.
                    if (items.isNotEmpty && done == items.length)
                      Icon(Icons.check_rounded, color: t.textPrimary, size: 28)
                    else
                      Text(
                        '${items.isEmpty ? 0 : (done * 100 / items.length).floor()}%',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.notesProgress(done, items.length),
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      items.isNotEmpty && done == items.length
                          ? l10n.notesAllDone
                          : l10n.notesLeft(items.length - done),
                      style: TextStyle(fontSize: 13, color: t.textPrimary.withValues(alpha: 0.7)),
                    ),
                  ],
                ),
              ),
              if (dest != null && dest.isNotEmpty) WeatherBadge(destination: dest),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Add sits right under the progress, not at the end of a long list. With the floating Add item button on
        // screen there is no second one here.
        if (!_flag('enableContextFab'))
          AppButton(
            key: const Key('check-add'),
            label: l10n.notesAddItem,
            icon: Icons.add_rounded,
            isFullWidth: true,
            onPressed: () => _editItem(context, items),
          ),
        if (_flag('enableChecklistCategoryProgress') && items.isNotEmpty) ...[
          const SizedBox(height: 12),
          Column(
            key: const Key('checklist-category-progress'),
            children: [
              for (final p in categoryProgress([
                for (final i in items) (category: i.category ?? 'general', done: _pendingDone[i.id] ?? i.completed),
              ], _categories))
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 92,
                        child: Text(
                          p.category[0].toUpperCase() + p.category.substring(1),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: t.textSecondary),
                        ),
                      ),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(99),
                          child: TweenAnimationBuilder<double>(
                            tween: Tween(end: p.done / p.total),
                            duration: AppMotion.of(context, const Duration(milliseconds: 300)),
                            curve: Curves.easeOutCubic,
                            builder: (_, v, _) => LinearProgressIndicator(
                              value: v,
                              minHeight: 6,
                              backgroundColor: t.borderColor,
                              color: p.done == p.total ? t.colorSuccess : t.primaryAccent,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      SizedBox(
                        width: 44,
                        child: Text(
                          '${p.done}/${p.total}',
                          textAlign: TextAlign.end,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ],
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final c in ['all', ..._categories])
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    showCheckmark: false,
                    shape: const StadiumBorder(),
                    key: Key('check-cat-$c'),
                    label: Text(c),
                    selected: _category == c,
                    onSelected: (_) => setState(() => _category = c),
                  ),
                ),
            ],
          ),
        ),
        if (shown.isEmpty && items.isEmpty && _flag('enableCoachEmptyStates'))
          EmptyState(
            key: const Key('checklist-empty'),
            icon: Icons.checklist_rounded,
            title: l10n.coachChecklistTitle,
            subtitle: l10n.coachChecklistBody,
          )
        else if (shown.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 28),
            child: Text(
              items.isEmpty ? l10n.notesEmptyChecklist : l10n.notesNoItemsInCategory,
              textAlign: TextAlign.center,
              style: TextStyle(color: t.textSecondary, fontSize: 15),
            ),
          ),
        for (final item in shown) _checkRow(context, items, item, members),
        if (packing)
          Padding(
            padding: const EdgeInsets.only(top: 14),
            child: AppButton(
              key: const Key('packing-suggest'),
              label: l10n.notesPacking,
              variant: AppButtonVariant.secondary,
              isFullWidth: true,
              onPressed: () => _suggest(items),
            ),
          ),
      ],
    );
  }

  /// Copy of [i] with its done state set (built by hand: copyWith cannot clear completedBy / completedAt).
  ChecklistItem _withCompleted(ChecklistItem i, bool value, String? me) => ChecklistItem(
    id: i.id,
    text: i.text,
    completed: value,
    category: i.category,
    assignedTo: i.assignedTo,
    assignedToMemberId: i.assignedToMemberId,
    completedByMemberId: value ? me : null,
    completedAt: value ? DateTime.now().toUtc().toIso8601String() : null,
    createdAt: i.createdAt,
    updatedAt: _now(),
  );

  static BentoTone _toneOf(String? category) => switch (category) {
    'packing' => BentoTone.sky,
    'prep' => BentoTone.butter,
    'documents' => BentoTone.lilac,
    'medical' => BentoTone.peach,
    _ => BentoTone.mint,
  };

  Widget _checkRow(BuildContext context, List<ChecklistItem> all, ChecklistItem item, List<Member> members) {
    final l10n = context.l10n;
    final t = context.tokens;
    final index = all.indexWhere((i) => i.id == item.id);
    final assignee = members.where((m) => m.id == item.assignedToMemberId).map((m) => m.name).firstOrNull;
    final done = _pendingDone[item.id] ?? item.completed;
    final me = ref.read(myMemberIdProvider(widget.tripId));

    Future<void> toggle() async {
      final next = !done;
      final messenger = ScaffoldMessenger.of(context);
      setState(() => _pendingDone[item.id] = next);
      // Build from the list as the user sees it (stored list + their not-yet-confirmed ticks).
      final seen = [
        for (final i in all)
          if (_pendingDone[i.id] != null && _pendingDone[i.id] != i.completed && i.id != item.id)
            _withCompleted(i, _pendingDone[i.id]!, me)
          else
            i,
      ];
      try {
        await _saveChecks([for (final i in seen) i.id == item.id ? _withCompleted(i, next, me) : i]);
      } catch (e) {
        if (!mounted) return;
        setState(() => _pendingDone.remove(item.id));
        messenger.showSnackBar(SnackBar(content: Text("Couldn't save that change: $e")));
      }
    }

    Widget pill(IconData? icon, String text) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: t.textPrimary.withValues(alpha: 0.09), borderRadius: BorderRadius.circular(99)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 14), const SizedBox(width: 4)],
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Opacity(
        opacity: done ? 0.6 : 1,
        child: BentoTile(
          key: Key('check-${item.id}'),
          tone: _toneOf(item.category),
          padding: const EdgeInsets.fromLTRB(6, 6, 0, 6),
          onTap: () => unawaited(toggle()), // the whole tile ticks the item off
          child: Row(
            children: [
              Checkbox(
                key: Key('check-toggle-${item.id}'),
                shape: const CircleBorder(),
                side: BorderSide(color: t.textPrimary, width: 2),
                activeColor: t.primaryAccent,
                checkColor: Colors.white,
                value: done,
                onChanged: (_) => unawaited(toggle()),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Struck through only once ticked off; the colour eases between the two states.
                      AnimatedDefaultTextStyle(
                        duration: AppMotion.of(context, const Duration(milliseconds: 220)),
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: done ? t.textSecondary : t.textPrimary,
                          decoration: done ? TextDecoration.lineThrough : TextDecoration.none,
                          decorationColor: t.textSecondary,
                          decorationThickness: 2,
                        ),
                        child: Text(item.text, key: Key('check-text-${item.id}')),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: [
                          if (item.category != null) pill(null, item.category!),
                          pill(Icons.person_outline_rounded, assignee ?? l10n.notesItemAnyone),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              PopupMenuButton<String>(
                key: Key('check-menu-${item.id}'),
                tooltip: l10n.notesItemMore,
                icon: const Icon(Icons.more_vert_rounded),
                onSelected: (v) {
                  switch (v) {
                    case 'edit':
                      unawaited(_editItem(context, all, existing: item));
                    case 'up':
                      _move(all, index, index - 1);
                    case 'down':
                      _move(all, index, index + 1);
                    case 'delete':
                      _deleteItem(context, all, item);
                  }
                },
                itemBuilder: (_) => [
                  PopupMenuItem(value: 'edit', child: Text(l10n.notesItemEdit)),
                  if (index > 0) PopupMenuItem(value: 'up', child: Text(l10n.notesItemMoveUp)),
                  if (index >= 0 && index < all.length - 1)
                    PopupMenuItem(value: 'down', child: Text(l10n.notesItemMoveDown)),
                  PopupMenuItem(value: 'delete', child: Text(l10n.notesItemDelete)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _quickCapture(List<TripNote> notes) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextField(
      key: const Key('note-quick'),
      controller: _quick,
      textInputAction: TextInputAction.done,
      textCapitalization: TextCapitalization.sentences,
      decoration: InputDecoration(
        hintText: context.l10n.notesQuickHint,
        prefixIcon: const Icon(Icons.edit_note_rounded),
      ),
      onSubmitted: (v) {
        final title = v.trim();
        if (title.isEmpty) return;
        _quick.clear();
        final now = _now();
        unawaited(
          _saveNotes([
            ...notes,
            TripNote(id: const Uuid().v4(), title: title, content: '', createdAt: now, updatedAt: now),
          ]),
        );
      },
    ),
  );

  Widget _notes(BuildContext context, List<TripNote> notes) {
    final l10n = context.l10n;
    final quick = _flag('enableNotesQuickCapture');
    final tidy = _flag('enableTidyNotes');
    final fab = _flag('enableContextFab'); // the floating Add note button is on screen: no second one in the page
    if (notes.isEmpty) {
      return ListView(
        padding: quick ? const EdgeInsets.fromLTRB(16, 8, 16, 0) : null,
        children: [
          if (quick) _quickCapture(notes),
          if (_flag('enableCoachEmptyStates'))
            EmptyState(
              key: const Key('notes-empty'),
              icon: Icons.sticky_note_2_outlined,
              title: l10n.coachNotesTitle,
              subtitle: l10n.coachNotesBody,
              action: fab
                  ? null
                  : AppButton(
                      key: const Key('note-add'),
                      label: l10n.notesAddNote,
                      onPressed: () => _addNote(context, notes),
                    ),
            )
          else ...[
            Padding(padding: const EdgeInsets.all(24), child: Text(l10n.notesEmptyNotes)),
            if (!fab)
              AppButton(
                key: const Key('note-add'),
                label: l10n.notesAddNote,
                onPressed: () => _addNote(context, notes),
              ),
          ],
        ],
      );
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        if (quick) _quickCapture(notes),
        for (final n in tidy ? [...notes.where((x) => x.isPinned), ...notes.where((x) => !x.isPinned)] : notes)
          _NoteCard(
            key: Key('note-${n.id}'),
            note: n,
            tidy: tidy,
            onPin: () => _saveNotes([for (final x in notes) x.id == n.id ? x.copyWith(isPinned: !x.isPinned) : x]),
            onDelete: () => _deleteNote(context, notes, n),
            onContent: (text) =>
                _saveNotes([for (final x in notes) x.id == n.id ? x.copyWith(content: text, updatedAt: _now()) : x]),
          ),
        if (!fab)
          AppButton(key: const Key('note-add'), label: l10n.notesAddNote, onPressed: () => _addNote(context, notes)),
        if (fab) const SizedBox(height: 72), // room under the last note for the floating button
      ],
    );
  }

  /// Add (existing == null) or edit an item: text, category and who it is for.
  Future<void> _editItem(BuildContext context, List<ChecklistItem> items, {ChecklistItem? existing}) async {
    final l10n = context.l10n;
    final draft = await AppSheet.show<_ItemDraft>(
      context: context,
      title: existing == null ? l10n.notesAddItem : l10n.notesItemEdit,
      builder: (_) => _ItemSheet(
        members: ref.read(visibleMembersProvider(widget.tripId)),
        initialText: existing?.text ?? '',
        initialCategory: existing?.category ?? (_category == 'all' ? 'general' : _category),
        initialMemberId: existing?.assignedToMemberId,
      ),
    );
    if (draft == null || draft.text.trim().isEmpty) return;
    final now = _now();
    if (existing == null) {
      await _saveChecks([
        ...items,
        ChecklistItem(
          id: const Uuid().v4(),
          text: draft.text.trim(),
          category: draft.category,
          assignedToMemberId: draft.memberId,
          createdAt: now,
          updatedAt: now,
        ),
      ]);
      return;
    }
    await _saveChecks([
      for (final i in items)
        if (i.id != existing.id)
          i
        else
          ChecklistItem(
            id: i.id,
            text: draft.text.trim(),
            completed: i.completed,
            category: draft.category,
            assignedToMemberId: draft.memberId, // null = anyone (copyWith could not clear it)
            completedByMemberId: i.completedByMemberId,
            completedAt: i.completedAt,
            createdAt: i.createdAt,
            updatedAt: now,
          ),
    ]);
  }

  void _deleteItem(BuildContext context, List<ChecklistItem> all, ChecklistItem item) {
    final repo = ref.read(tripRepositoryProvider);
    final tripId = widget.tripId;
    unawaited(
      _saveChecks([
        for (final i in all)
          if (i.id != item.id) i,
      ]),
    );
    UndoSnackbar.show(
      context: context,
      message: context.l10n.notesItemDeleted,
      onUndo: () => unawaited(repo.setChecklist(tripId, all)),
    );
  }

  void _deleteNote(BuildContext context, List<TripNote> all, TripNote note) {
    final repo = ref.read(tripRepositoryProvider);
    final tripId = widget.tripId;
    unawaited(
      _saveNotes([
        for (final n in all)
          if (n.id != note.id) n,
      ]),
    );
    UndoSnackbar.show(
      context: context,
      message: context.l10n.notesNoteDeleted,
      onUndo: () => unawaited(repo.setNotes(tripId, all)),
    );
  }

  Future<void> _suggest(List<ChecklistItem> items) async {
    final have = {for (final i in items) i.text};
    final now = _now();
    final extra = <ChecklistItem>[];
    for (final s in generateSmartPackingSuggestions(const {})) {
      final text = s['text'] as String;
      if (have.contains(text)) continue;
      extra.add(
        ChecklistItem(
          id: const Uuid().v4(),
          text: text,
          category: s['category'] as String? ?? 'packing',
          createdAt: now,
          updatedAt: now,
        ),
      );
    }
    if (extra.isEmpty) return;
    await _saveChecks([...items, ...extra]);
  }

  Future<void> _addNote(BuildContext context, List<TripNote> notes) async {
    final draft = await AppSheet.show<_NoteDraft>(
      context: context,
      title: context.l10n.notesAddNote,
      builder: (_) => const _NoteDialog(),
    );
    if (draft == null) return;
    final firstLine = draft.body.split('\n').first.trim();
    final title = draft.title.isNotEmpty ? draft.title : firstLine;
    if (title.isEmpty) return;
    final now = _now();
    await _saveNotes([
      ...notes,
      TripNote(id: const Uuid().v4(), title: title, content: draft.body, createdAt: now, updatedAt: now),
    ]);
  }

  Future<void> _addPass(BuildContext context, List<TravelPass> passes) async {
    final draft = await AppSheet.show<_PassDraft>(
      context: context,
      title: context.l10n.notesAddPass,
      builder: (_) => const _PassDialog(),
    );
    if (draft == null || draft.title.isEmpty) return;
    final now = _now();
    await ref.read(tripRepositoryProvider).setPasses(widget.tripId, [
      ...passes,
      TravelPass(
        id: const Uuid().v4(),
        tripId: widget.tripId,
        type: draft.type,
        title: draft.title,
        origin: draft.origin.isEmpty ? null : draft.origin,
        destination: draft.destination.isEmpty ? null : draft.destination,
        startDateTime: draft.start,
        seatOrRoom: draft.seat.isEmpty ? null : draft.seat,
        referenceCode: draft.reference.isEmpty ? null : draft.reference,
        passengerName: draft.passenger.isEmpty ? null : draft.passenger,
        createdAt: now,
        updatedAt: now,
      ),
    ]);
  }

  /// Edits keep every field the dialog does not show (booking id, QR, attachment, assignees ...).
  Future<void> _editPass(BuildContext context, List<TravelPass> passes, TravelPass pass) async {
    final draft = await AppSheet.show<_PassDraft>(
      context: context,
      title: context.l10n.notesEditPass,
      builder: (_) => _PassDialog(initial: pass),
    );
    if (draft == null || draft.title.isEmpty) return;
    final edited = pass.copyWith(
      type: draft.type,
      title: draft.title,
      origin: draft.origin,
      destination: draft.destination,
      startDateTime: draft.start ?? pass.startDateTime,
      seatOrRoom: draft.seat,
      referenceCode: draft.reference,
      passengerName: draft.passenger,
      updatedAt: _now(),
    );
    await ref.read(tripRepositoryProvider).setPasses(widget.tripId, [
      for (final x in passes) x.id == pass.id ? edited : x,
    ]);
  }

  Future<void> _deletePicked(BuildContext context, List<TravelPass> passes) async {
    final n = _picked.length;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete $n pass${n == 1 ? '' : 'es'}?'),
        content: Text(context.l10n.notesPassDeleteBody),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.l10n.notesPassKeep)),
          TextButton(
            key: const Key('pass-delete-selected-confirm'),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(context.l10n.rowDelete),
          ),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    final repo = ref.read(tripRepositoryProvider);
    final tripId = widget.tripId;
    final gone = {..._picked};
    await repo.setPasses(tripId, [
      for (final x in passes)
        if (!gone.contains(x.id)) x,
    ]);
    if (!mounted) return;
    setState(() {
      _selecting = false;
      _picked.clear();
    });
    if (!context.mounted) return;
    UndoSnackbar.show(
      context: context,
      message: '$n pass${n == 1 ? '' : 'es'} deleted',
      onUndo: () => unawaited(repo.setPasses(tripId, passes)),
    );
  }

  Future<void> _deletePass(BuildContext context, List<TravelPass> passes, TravelPass pass) async {
    final l10n = context.l10n;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.notesPassDeleteTitle),
        content: Text(l10n.notesPassDeleteBody),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l10n.notesPassKeep)),
          TextButton(
            key: const Key('pass-delete-confirm'),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(l10n.rowDelete),
          ),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    final repo = ref.read(tripRepositoryProvider);
    final tripId = widget.tripId;
    await repo.setPasses(tripId, [
      for (final x in passes)
        if (x.id != pass.id) x,
    ]);
    if (!context.mounted) return;
    UndoSnackbar.show(
      context: context,
      message: l10n.notesPassDeleted,
      onUndo: () => unawaited(repo.setPasses(tripId, passes)),
    );
  }

  void _move(List<ChecklistItem> all, int from, int to) {
    final next = [...all];
    final item = next.removeAt(from);
    next.insert(to, item);
    unawaited(_saveChecks(next));
  }

  Future<void> _saveChecks(List<ChecklistItem> items) =>
      ref.read(tripRepositoryProvider).setChecklist(widget.tripId, items);
  Future<void> _saveNotes(List<TripNote> notes) => ref.read(tripRepositoryProvider).setNotes(widget.tripId, notes);

  int _now() => DateTime.now().millisecondsSinceEpoch;
}

class _NoteCard extends ConsumerStatefulWidget {
  const _NoteCard({
    required this.note,
    required this.onContent,
    this.tidy = false,
    this.onPin,
    this.onDelete,
    super.key,
  });
  final TripNote note;
  final ValueChanged<String> onContent;

  /// Card with pin, menu and edited-time (enableTidyNotes).
  final bool tidy;
  final VoidCallback? onPin;
  final VoidCallback? onDelete;

  @override
  ConsumerState<_NoteCard> createState() => _NoteCardState();
}

class _NoteCardState extends ConsumerState<_NoteCard> {
  late final TextEditingController _c;
  final _focus = FocusNode();
  Timer? _debounce;
  String? _draft;

  @override
  void initState() {
    super.initState();
    _c = TextEditingController(text: widget.note.content);
  }

  @override
  void didUpdateWidget(_NoteCard old) {
    super.didUpdateWidget(old);
    if (old.note.id != widget.note.id) {
      _c.text = widget.note.content;
      _draft = null;
      return;
    }
    // A remote update must not move the cursor or wipe text still being typed.
    if (_focus.hasFocus || (_draft != null && _draft != widget.note.content)) return;
    if (widget.note.content != _c.text) {
      _c.text = widget.note.content;
      _draft = null;
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _c.dispose();
    _focus.dispose();
    super.dispose();
  }

  Widget _tidyCard(BuildContext context) {
    final l10n = context.l10n;
    final t = context.tokens;
    final n = widget.note;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: t.bgSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(t.radiusMd),
          side: BorderSide(color: n.isPinned ? t.primaryAccent.withValues(alpha: 0.6) : t.borderColor),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 4, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (n.isPinned) ...[
                    Icon(Icons.push_pin_rounded, size: 16, color: t.primaryAccent),
                    const SizedBox(width: 6),
                  ],
                  Expanded(
                    child: Text(
                      n.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: t.textPrimary),
                    ),
                  ),
                  PopupMenuButton<String>(
                    key: Key('note-menu-${n.id}'),
                    tooltip: l10n.notesNoteMenu,
                    icon: Icon(Icons.more_horiz_rounded, color: t.textSecondary),
                    onSelected: (v) => v == 'pin' ? widget.onPin?.call() : widget.onDelete?.call(),
                    itemBuilder: (_) => [
                      PopupMenuItem(value: 'pin', child: Text(n.isPinned ? l10n.notesNoteUnpin : l10n.notesNotePin)),
                      PopupMenuItem(value: 'delete', child: Text(l10n.notesItemDelete)),
                    ],
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: TextField(
                  key: Key('note-body-${n.id}'),
                  controller: _c,
                  focusNode: _focus,
                  maxLines: 4,
                  minLines: 1,
                  style: TextStyle(fontSize: 14.5, height: 1.35, color: t.textPrimary),
                  decoration: const InputDecoration(isDense: true, border: InputBorder.none),
                  onChanged: (v) {
                    _draft = v;
                    setState(() {});
                    _debounce?.cancel();
                    _debounce = Timer(const Duration(milliseconds: 400), () => widget.onContent(v));
                  },
                ),
              ),
              _Linked(text: _draft ?? _c.text),
              if (n.updatedAt > 0)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    l10n.notesNoteEdited(formatRelativeTime(n.updatedAt)),
                    style: TextStyle(fontSize: 12, color: t.textMuted),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.tidy) return _tidyCard(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.note.title, style: const TextStyle(fontWeight: FontWeight.w700)),
        TextField(
          key: Key('note-body-${widget.note.id}'),
          controller: _c,
          focusNode: _focus,
          maxLines: 4,
          onChanged: (v) {
            _draft = v;
            setState(() {});
            _debounce?.cancel();
            _debounce = Timer(const Duration(milliseconds: 400), () => widget.onContent(v));
          },
        ),
        _Linked(text: _draft ?? _c.text),
      ],
    );
  }
}

class _Linked extends ConsumerWidget {
  const _Linked({required this.text});
  final String text;
  static final _re = RegExp(r'(https?://[^\s]+)');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matches = _re.allMatches(text).map((m) => m.group(0)!).toList();
    if (matches.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final url in matches)
          GestureDetector(
            key: Key('note-link-$url'),
            onTap: () => ref.read(externalLauncherProvider)(Uri.parse(url)),
            child: Text(
              url,
              style: TextStyle(color: Theme.of(context).colorScheme.primary, decoration: TextDecoration.underline),
            ),
          ),
      ],
    );
  }
}

class _NoteDraft {
  _NoteDraft(this.title, this.body);
  final String title;
  final String body;
}

class _NoteDialog extends StatefulWidget {
  const _NoteDialog();

  @override
  State<_NoteDialog> createState() => _NoteDialogState();
}

class _NoteDialogState extends State<_NoteDialog> {
  final _title = TextEditingController();
  final _body = TextEditingController();

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            key: const Key('note-new-title'),
            controller: _title,
            autofocus: true,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(labelText: l10n.notesNoteTitle),
          ),
          const SizedBox(height: 8),
          TextField(
            key: const Key('note-new-body'),
            controller: _body,
            minLines: 5,
            maxLines: 10,
            keyboardType: TextInputType.multiline,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(labelText: l10n.notesNoteBody, alignLabelWithHint: true),
          ),
          const SizedBox(height: 16),
          AppButton(
            key: const Key('note-save'),
            label: l10n.notesItemSave,
            onPressed: () => Navigator.pop(context, _NoteDraft(_title.text.trim(), _body.text.trim())),
          ),
        ],
      ),
    );
  }
}

class _PassDraft {
  _PassDraft({
    required this.type,
    required this.title,
    required this.origin,
    required this.destination,
    required this.start,
    required this.seat,
    required this.reference,
    required this.passenger,
  });
  final String type;
  final String title;
  final String origin;
  final String destination;
  final String? start; // ISO local date-time, or null when not set
  final String seat;
  final String reference;
  final String passenger;
}

class _PassDialog extends StatefulWidget {
  const _PassDialog({this.initial});

  /// The pass being edited; null when adding.
  final TravelPass? initial;

  @override
  State<_PassDialog> createState() => _PassDialogState();
}

class _PassDialogState extends State<_PassDialog> {
  late var _type = const {'flight', 'train', 'stay'}.contains(widget.initial?.type) ? widget.initial!.type : 'flight';
  late final _title = TextEditingController(text: widget.initial?.title ?? '');
  late final _from = TextEditingController(text: widget.initial?.origin ?? '');
  late final _to = TextEditingController(text: widget.initial?.destination ?? '');
  late final _seat = TextEditingController(text: widget.initial?.seatOrRoom ?? '');
  late final _ref = TextEditingController(text: widget.initial?.referenceCode ?? '');
  late final _passenger = TextEditingController(text: widget.initial?.passengerName ?? '');
  late String? _start = widget.initial?.startDateTime;

  @override
  void dispose() {
    _title.dispose();
    _from.dispose();
    _to.dispose();
    _seat.dispose();
    _ref.dispose();
    _passenger.dispose();
    super.dispose();
  }

  Future<void> _pickWhen() async {
    final now = DateTime.now();
    final current = DateTime.tryParse(_start ?? '') ?? now;
    final day = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 5),
    );
    if (day == null || !mounted) return;
    final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(current));
    if (time == null) return;
    setState(() => _start = DateTime(day.year, day.month, day.day, time.hour, time.minute).toIso8601String());
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final types = [
      ('flight', l10n.notesPassFlight, Icons.flight_rounded),
      ('train', l10n.notesPassTrain, Icons.train_rounded),
      ('stay', l10n.notesPassHotel, Icons.bed_rounded),
    ];
    final tokens = context.tokens;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            key: const Key('pass-type'),
            children: [
              for (final t in types)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: InkWell(
                      key: Key('pass-type-${t.$1}'),
                      borderRadius: BorderRadius.circular(18),
                      onTap: () => setState(() => _type = t.$1),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: _type == t.$1 ? tokens.primaryAccent.withValues(alpha: 0.1) : tokens.bgSurfaceHover,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: _type == t.$1 ? tokens.primaryAccent : Colors.transparent,
                            width: 2,
                          ),
                        ),
                        child: Column(
                          children: [
                            Icon(t.$3, color: _type == t.$1 ? tokens.primaryAccent : tokens.textSecondary),
                            const SizedBox(height: 6),
                            Text(t.$2, style: const TextStyle(fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            key: const Key('pass-title'),
            controller: _title,
            decoration: InputDecoration(labelText: l10n.notesPassTitle),
          ),
          const SizedBox(height: 8),
          TextField(
            key: const Key('pass-from'),
            controller: _from,
            decoration: InputDecoration(labelText: l10n.notesPassFrom),
          ),
          const SizedBox(height: 8),
          TextField(
            key: const Key('pass-to'),
            controller: _to,
            decoration: InputDecoration(labelText: l10n.notesPassTo),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            key: const Key('pass-when'),
            icon: const Icon(Icons.event_rounded),
            label: Text(
              DateTime.tryParse(_start ?? '') == null
                  ? l10n.notesPassPickWhen
                  : '${l10n.notesPassWhen}: ${DateFormat('d MMM · HH:mm').format(DateTime.parse(_start!))}',
            ),
            onPressed: _pickWhen,
          ),
          const SizedBox(height: 8),
          TextField(
            key: const Key('pass-passenger'),
            controller: _passenger,
            decoration: InputDecoration(labelText: l10n.notesPassPassenger),
          ),
          const SizedBox(height: 8),
          TextField(
            key: const Key('pass-seat'),
            controller: _seat,
            decoration: InputDecoration(labelText: l10n.notesPassSeat),
          ),
          const SizedBox(height: 8),
          TextField(
            key: const Key('pass-ref'),
            controller: _ref,
            decoration: InputDecoration(labelText: l10n.notesPassRef),
          ),
          const SizedBox(height: 16),
          AppButton(
            key: const Key('pass-save'),
            label: widget.initial == null ? l10n.notesAddPass : l10n.notesSavePass,
            onPressed: () => Navigator.pop(
              context,
              _PassDraft(
                type: _type,
                title: _title.text.trim(),
                origin: _from.text.trim(),
                destination: _to.text.trim(),
                start: _start,
                seat: _seat.text.trim(),
                reference: _ref.text.trim(),
                passenger: _passenger.text.trim(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ItemDraft {
  _ItemDraft(this.text, this.category, this.memberId);
  final String text;
  final String category;
  final String? memberId;
}

/// Add / edit a checklist item: what, which category, and who it is for.
class _ItemSheet extends StatefulWidget {
  const _ItemSheet({
    required this.members,
    required this.initialText,
    required this.initialCategory,
    required this.initialMemberId,
  });

  final List<Member> members;
  final String initialText;
  final String initialCategory;
  final String? initialMemberId;

  @override
  State<_ItemSheet> createState() => _ItemSheetState();
}

class _ItemSheetState extends State<_ItemSheet> {
  late final _text = TextEditingController(text: widget.initialText);
  late var _category = widget.initialCategory;
  late var _memberId = widget.initialMemberId;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  void _submit() {
    if (_text.text.trim().isEmpty) return;
    Navigator.of(context).pop(_ItemDraft(_text.text, _category, _memberId));
  }

  Widget _label(BuildContext context, String text) => Padding(
    padding: const EdgeInsets.only(top: 18, bottom: 8),
    child: Text(
      text.toUpperCase(),
      style: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
        color: context.tokens.textSecondary,
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppTextField(
            key: const Key('ask-field'),
            controller: _text,
            autofocus: true,
            hint: l10n.notesItemHint,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submit(),
          ),
          _label(context, l10n.notesItemCategory),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final c in _categories)
                ChoiceChip(
                  key: Key('item-cat-$c'),
                  showCheckmark: false,
                  label: Text(c),
                  selected: _category == c,
                  onSelected: (_) => setState(() => _category = c),
                ),
            ],
          ),
          _label(context, l10n.notesItemAssign),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ChoiceChip(
                key: const Key('item-assignee-none'),
                showCheckmark: false,
                label: Text(l10n.notesItemAnyone),
                selected: _memberId == null,
                onSelected: (_) => setState(() => _memberId = null),
              ),
              for (final m in widget.members)
                ChoiceChip(
                  key: Key('item-assignee-${m.id}'),
                  showCheckmark: false,
                  avatar: const Icon(Icons.person_outline_rounded, size: 16),
                  label: Text(m.name),
                  selected: _memberId == m.id,
                  onSelected: (_) => setState(() => _memberId = m.id),
                ),
            ],
          ),
          const SizedBox(height: 22),
          AppButton(key: const Key('ask-ok'), label: l10n.notesItemSave, isFullWidth: true, onPressed: _submit),
        ],
      ),
    );
  }
}
