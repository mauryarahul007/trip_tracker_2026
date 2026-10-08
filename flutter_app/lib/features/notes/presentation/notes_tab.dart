import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/platform/external_launcher.dart';
import '../../../core/platform/share_service.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../domain/logic/ics_export_service.dart';
import '../../../domain/logic/pass_sort.dart';
import '../../../domain/logic/travel_status_service.dart';
import '../../../domain/logic/trip_utilities.dart';
import '../../../domain/models/checklist_item.dart';
import '../../../domain/models/member.dart';
import '../../../domain/models/travel_pass.dart';
import '../../../domain/models/trip_note.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/app_surface.dart' show AppCard;
import '../../../shared/widgets/ask_text.dart';
import '../../chat/application/chat_providers.dart';
import '../../chat/presentation/chat_pane.dart';
import '../../expenses/application/expenses_providers.dart';
import '../../travel/presentation/live_travel_status_modal.dart';
import '../../travel/presentation/next_up_capsule.dart';
import '../../travel/presentation/pass_scanner_modal.dart';
import '../../travel/presentation/weather_badge.dart';
import '../../settings/presentation/settings_widgets.dart' show SettingsIcon;
import '../../members/presentation/members_tab.dart';
import '../../trip_details/application/trip_nav.dart';

const _categories = ['packing', 'prep', 'documents', 'medical', 'general'];

class NotesTab extends ConsumerStatefulWidget {
  const NotesTab({required this.tripId, super.key});
  final String tripId;

  @override
  ConsumerState<NotesTab> createState() => _NotesTabState();
}

class _NotesTabState extends ConsumerState<NotesTab> {
  PassSort _passSort = PassSort.time;
  var _pane = 'checklist';
  var _category = 'all';

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final trip = ref.watch(tripProvider(widget.tripId)).value;
    final chatOn = _flag('enableTripChat');
    final chatFirst = _flag('enableChatFirstNav');
    final showChat = chatOn && !chatFirst;
    final passesOn = _flag('enableTravelPasses');
    final packing = _flag('enablePackingAssistant');
    final unread = ref.watch(chatUnreadProvider(widget.tripId));
    if (!showChat && _pane == 'chat') _pane = 'checklist';

    final panes = [('checklist', l10n.notesCheck), ('notes', l10n.notesNotes), if (showChat) ('chat', l10n.notesChat)];

    final content = Column(
      key: const Key('tab-notes'),
      children: [
        // Cap header height so many passes scroll here instead of pushing the pane selector off-screen.
        ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.35),
          child: SingleChildScrollView(
            key: const Key('notes-passes-scroll'),
            child: Column(
              children: [
                if (trip != null) NextUpTravelCapsule(trip: trip, passes: trip.passes),
                if (passesOn) _passes(context, trip?.passes ?? const []),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: SegmentedButton<String>(
            key: const Key('notes-panes'),
            segments: [
              for (final p in panes)
                ButtonSegment(
                  value: p.$1,
                  label: p.$1 == 'chat' && unread ? Text(p.$2, key: const Key('notes-chat-unread')) : Text(p.$2),
                ),
            ],
            showSelectedIcon: false,
            style: SegmentedButton.styleFrom(
              shape: const StadiumBorder(),
              side: BorderSide.none,
              backgroundColor: context.tokens.bgSurface,
            ),
            selected: {_pane},
            onSelectionChanged: (s) => setState(() => _pane = s.first),
          ),
        ),
        Expanded(
          child: switch (_pane) {
            'notes' => _notes(context, trip?.notes ?? const []),
            'chat' => ChatPane(tripId: widget.tripId),
            _ => _checklist(context, trip?.checklist ?? const [], packing),
          },
        ),
      ],
    );
    // Desktop: planner layout, members as a third column next to notes and passes.
    if (MediaQuery.sizeOf(context).width < 1280) return content;
    return Row(
      children: [
        Expanded(child: content),
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

  Widget _passes(BuildContext context, List<TravelPass> passes) {
    final l10n = context.l10n;
    final trip = ref.watch(tripProvider(widget.tripId)).value;
    final gateScannerOn = _flag('enableGateScanner');
    final icsOn = _flag('enableIcsExport');
    final sortOn = _flag('enablePassSorting');
    final shown = sortOn ? sortPasses(passes, _passSort) : passes;
    // Previous pass's leg in `shown`, so a header prints only when the leg changes.
    String? lastLeg(TravelPass p) {
      final i = shown.indexOf(p);
      return i == 0 ? null : passLeg(shown[i - 1]);
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (passes.isNotEmpty) Text(l10n.notesPasses, style: const TextStyle(fontWeight: FontWeight.w700)),
          if (sortOn && passes.length >= 3)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
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
                padding: const EdgeInsets.only(top: 10, bottom: 2),
                child: Text(
                  passLeg(p).isEmpty ? '—' : passLeg(p).replaceAll('_', ' · '),
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            Builder(
              builder: (ctx) {
                final statusInfo = getTravelStatusInfo(p);
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: AppCard(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                    child: ListTile(
                      key: Key('pass-${p.id}'),
                      contentPadding: EdgeInsets.zero,
                      leading: SettingsIcon(_passIcon(p.type)),
                      title: Text(p.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                      subtitle: Text(
                        [
                          p.type,
                          if (p.origin != null) p.origin,
                          if (p.destination != null) p.destination,
                        ].whereType<String>().join(' · '),
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (gateScannerOn)
                            IconButton(
                              key: Key('pass-scan-${p.id}'),
                              icon: const Icon(Icons.qr_code_2, size: 20),
                              tooltip: 'Show Pass / QR',
                              onPressed: () => PassScannerModal.show(ctx, pass: p),
                            ),
                          if (statusInfo != null)
                            IconButton(
                              icon: const Icon(Icons.radar, size: 20),
                              tooltip: 'Live Travel Status',
                              onPressed: () => LiveTravelStatusModal.show(ctx, statusInfo),
                            ),
                        ],
                      ),
                      onTap: () {
                        if (gateScannerOn) {
                          PassScannerModal.show(ctx, pass: p);
                        } else if (statusInfo != null) {
                          LiveTravelStatusModal.show(ctx, statusInfo);
                        }
                      },
                    ),
                  ),
                );
              },
            ),
          ],
          Wrap(
            spacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              TextButton(
                key: const Key('pass-add'),
                onPressed: () => _addPass(context, passes),
                child: Text(l10n.notesAddPass),
              ),
              if (icsOn && passes.isNotEmpty && trip != null)
                TextButton.icon(
                  key: const Key('pass-export-ics'),
                  icon: const Icon(Icons.calendar_month, size: 16),
                  label: const Text('Add to Calendar'),
                  onPressed: () =>
                      shareTripIcs(trip: trip, shareService: ref.read(shareServiceProvider), passes: passes),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _checklist(BuildContext context, List<ChecklistItem> items, bool packing) {
    final l10n = context.l10n;
    final trip = ref.watch(tripProvider(widget.tripId)).value;
    final members = ref.watch(tripMembersProvider(widget.tripId)).value ?? const <Member>[];
    final shown = [
      for (final i in items)
        if (_category == 'all' || i.category == _category) i,
    ];
    final done = items.where((i) => i.completed).length;
    final dest = trip?.destination?.isNotEmpty == true ? trip!.destination : trip?.name;
    return ListView(
      key: const Key('checklist'),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        if (dest != null && dest.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Align(
              alignment: Alignment.centerLeft,
              child: WeatherBadge(destination: dest),
            ),
          ),
        AppCard(
          child: Row(
            children: [
              SizedBox(
                width: 52,
                height: 52,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CircularProgressIndicator(
                      value: items.isEmpty ? 0 : done / items.length,
                      strokeWidth: 6,
                      strokeCap: StrokeCap.round,
                      backgroundColor: context.tokens.borderColor,
                      color: context.tokens.primaryAccent,
                    ),
                    Text('$done/${items.length}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              Expanded(child: Text(l10n.notesProgress(done, items.length))),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 6,
          children: [
            for (final c in ['all', ..._categories])
              ChoiceChip(
                showCheckmark: false,
                shape: const StadiumBorder(),
                key: Key('check-cat-$c'),
                label: Text(c),
                selected: _category == c,
                onSelected: (_) => setState(() => _category = c),
              ),
          ],
        ),
        for (final item in shown) _checkRow(context, items, item, members),
        AppButton(key: const Key('check-add'), label: l10n.notesAddItem, onPressed: () => _addItem(context, items)),
        if (packing)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: AppButton(
              key: const Key('packing-suggest'),
              label: l10n.notesPacking,
              variant: AppButtonVariant.secondary,
              onPressed: () => _suggest(items),
            ),
          ),
      ],
    );
  }

  Widget _checkRow(BuildContext context, List<ChecklistItem> all, ChecklistItem item, List<Member> members) {
    final index = all.indexWhere((i) => i.id == item.id);
    final assignee = members.where((m) => m.id == item.assignedToMemberId).map((m) => m.name).firstOrNull;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: AppCard(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: ListTile(
          key: Key('check-${item.id}'),
          contentPadding: EdgeInsets.zero,
          leading: Checkbox(
            shape: const CircleBorder(),
            key: Key('check-toggle-${item.id}'),
            value: item.completed,
            onChanged: (_) => _saveChecks([
              for (final i in all) i.id == item.id ? i.copyWith(completed: !i.completed, updatedAt: _now()) : i,
            ]),
          ),
          title: Text(
            item.text,
            style: item.completed ? const TextStyle(decoration: TextDecoration.lineThrough) : null,
          ),
          subtitle: Text([?item.category, ?assignee].join(' · ')),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              PopupMenuButton<String>(
                key: Key('check-assign-${item.id}'),
                onSelected: (id) => _saveChecks([
                  for (final i in all) i.id == item.id ? i.copyWith(assignedToMemberId: id, updatedAt: _now()) : i,
                ]),
                itemBuilder: (_) => [for (final m in members) PopupMenuItem(value: m.id, child: Text(m.name))],
                child: const Icon(Icons.person_outline),
              ),
              IconButton(
                tooltip: 'Move up',
                key: Key('check-up-${item.id}'),
                onPressed: index <= 0 ? null : () => _move(all, index, index - 1),
                icon: const Icon(Icons.arrow_upward),
              ),
              IconButton(
                tooltip: 'Move down',
                key: Key('check-down-${item.id}'),
                onPressed: index < 0 || index >= all.length - 1 ? null : () => _move(all, index, index + 1),
                icon: const Icon(Icons.arrow_downward),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _passIcon(String type) => switch (type) {
    'flight' => Icons.flight_rounded,
    'train' => Icons.train_rounded,
    'stay' => Icons.bed_rounded,
    'activity' => Icons.local_activity_outlined,
    _ => Icons.directions_transit_rounded,
  };

  Widget _notes(BuildContext context, List<TripNote> notes) {
    final l10n = context.l10n;
    if (notes.isEmpty) {
      return ListView(
        children: [
          Padding(padding: const EdgeInsets.all(24), child: Text(l10n.notesEmptyNotes)),
          AppButton(key: const Key('note-add'), label: l10n.notesAddNote, onPressed: () => _addNote(context, notes)),
        ],
      );
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        for (final n in notes)
          _NoteCard(
            key: Key('note-${n.id}'),
            note: n,
            onContent: (text) =>
                _saveNotes([for (final x in notes) x.id == n.id ? x.copyWith(content: text, updatedAt: _now()) : x]),
          ),
        AppButton(key: const Key('note-add'), label: l10n.notesAddNote, onPressed: () => _addNote(context, notes)),
      ],
    );
  }

  Future<void> _addItem(BuildContext context, List<ChecklistItem> items) async {
    final text = await askText(context, context.l10n.notesAddItem);
    if (text == null || text.isEmpty) return;
    final now = _now();
    await _saveChecks([
      ...items,
      ChecklistItem(
        id: const Uuid().v4(),
        text: text,
        category: _category == 'all' ? 'general' : _category,
        createdAt: now,
        updatedAt: now,
      ),
    ]);
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
    final title = await askText(context, context.l10n.notesNoteTitle);
    if (title == null || title.isEmpty) return;
    final now = _now();
    await _saveNotes([
      ...notes,
      TripNote(id: const Uuid().v4(), title: title, content: '', createdAt: now, updatedAt: now),
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
        createdAt: now,
        updatedAt: now,
      ),
    ]);
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
  const _NoteCard({required this.note, required this.onContent, super.key});
  final TripNote note;
  final ValueChanged<String> onContent;

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

  @override
  Widget build(BuildContext context) {
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

class _PassDraft {
  _PassDraft(this.type, this.title, this.origin, this.destination);
  final String type;
  final String title;
  final String origin;
  final String destination;
}

class _PassDialog extends StatefulWidget {
  const _PassDialog();

  @override
  State<_PassDialog> createState() => _PassDialogState();
}

class _PassDialogState extends State<_PassDialog> {
  var _type = 'flight';
  final _title = TextEditingController();
  final _from = TextEditingController();
  final _to = TextEditingController();

  @override
  void dispose() {
    _title.dispose();
    _from.dispose();
    _to.dispose();
    super.dispose();
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
          const SizedBox(height: 16),
          AppButton(
            key: const Key('pass-save'),
            label: l10n.notesAddPass,
            onPressed: () =>
                Navigator.pop(context, _PassDraft(_type, _title.text.trim(), _from.text.trim(), _to.text.trim())),
          ),
        ],
      ),
    );
  }
}
