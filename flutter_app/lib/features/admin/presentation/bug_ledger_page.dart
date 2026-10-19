import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../domain/models/admin.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/receipt_card.dart';
import '../application/admin_providers.dart';
import 'admin_widgets.dart';

/// The Bug Ledger: every bug filed from the web, Flutter and the CLI, as perforated "tickets".
class BugLedgerPage extends ConsumerStatefulWidget {
  const BugLedgerPage({super.key});

  @override
  ConsumerState<BugLedgerPage> createState() => _BugLedgerPageState();
}

class _BugLedgerPageState extends ConsumerState<BugLedgerPage> {
  String _query = '';
  String _status = 'active'; // active = open + in progress
  String _severity = '';

  Future<void> _refresh() async {
    ref.invalidate(adminBugsProvider);
    await ref.read(adminBugsProvider.future);
  }

  List<AdminBug> _filter(List<AdminBug> all) {
    final q = _query.trim().toLowerCase();
    return [
      for (final b in all)
        if ((_status == 'all' || (_status == 'active' ? b.isOpen : b.status == _status)) &&
            (_severity.isEmpty || b.severity == _severity) &&
            (q.isEmpty || b.title.toLowerCase().contains(q) || b.id.toLowerCase().contains(q)))
          b,
    ];
  }

  @override
  Widget build(BuildContext context) {
    final bugs = ref.watch(adminBugsProvider);
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('bug-new'),
        onPressed: () => _newBug(context),
        icon: const Icon(Icons.add_rounded),
        label: const Text('New bug'),
      ),
      body: AdminAsync<List<AdminBug>>(
        value: bugs,
        onRefresh: _refresh,
        builder: (context, all) {
          final shown = _filter(all);
          final open = all.where((b) => b.isOpen).length;
          return ListView(
            key: const Key('bug-list'),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
            children: [
              AdminSearchField(
                hint: 'Search ${all.length} bugs ($open open)',
                onChanged: (v) => setState(() => _query = v),
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final (k, label) in const [
                      ('active', 'Open'),
                      ('resolved', 'Resolved'),
                      ('wont_fix', "Won't fix"),
                      ('all', 'All'),
                    ])
                      AdminFilterChip(
                        key: Key('bug-status-$k'),
                        label: label,
                        selected: _status == k,
                        onTap: () => setState(() => _status = k),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    AdminFilterChip(
                      label: 'Any severity',
                      selected: _severity.isEmpty,
                      onTap: () => setState(() => _severity = ''),
                    ),
                    for (final s in adminBugSeverities)
                      AdminFilterChip(
                        key: Key('bug-sev-$s'),
                        label: s,
                        selected: _severity == s,
                        onTap: () => setState(() => _severity = _severity == s ? '' : s),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (shown.isEmpty)
                const EmptyState(
                  icon: Icons.check_circle_outline,
                  title: 'No bugs here',
                  subtitle: 'Nothing matches these filters.',
                )
              else
                for (final b in shown)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: BugTicket(key: Key('bug-${b.id}'), bug: b, onTap: () => _open(context, b)),
                  ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _open(BuildContext context, AdminBug bug) async {
    final changed = await AppSheet.show<bool>(
      context: context,
      title: bug.id,
      builder: (_) => BugDetailSheet(bug: bug),
    );
    if (changed == true) ref.invalidate(adminBugsProvider);
  }

  Future<void> _newBug(BuildContext context) async {
    final id = await AppSheet.show<String>(context: context, title: 'New bug', builder: (_) => const _NewBugSheet());
    if (id != null) {
      ref.invalidate(adminBugsProvider);
      if (context.mounted) adminToast(context, id.isEmpty ? 'Bug filed' : '$id filed');
    }
  }
}

/// One bug as a ticket: severity-glow icon, title, id / category / age, status in the stub.
class BugTicket extends StatelessWidget {
  const BugTicket({required this.bug, required this.onTap, super.key});

  final AdminBug bug;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final sev = adminSeverityColor(t, bug.severity);
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: ReceiptCard(
        body: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: sev.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: sev.withValues(alpha: 0.7)),
                boxShadow: [BoxShadow(color: sev.withValues(alpha: 0.3), blurRadius: 10)],
              ),
              child: Icon(Icons.bug_report_rounded, color: sev, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    bug.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: t.textPrimary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${bug.id} · ${bug.category} · ${adminDate(bug.createdAt)}',
                    style: TextStyle(fontFamily: AppTypography.fontMono, fontSize: 11.5, color: t.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
        footer: Row(
          children: [
            AdminPill(bug.severity.toUpperCase(), color: sev),
            const SizedBox(width: 6),
            AdminPill(bug.status.replaceAll('_', ' ').toUpperCase(), color: adminStatusColor(t, bug.status)),
            const Spacer(),
            if (bug.assignee != null && bug.assignee!.isNotEmpty)
              Flexible(
                child: Text(
                  bug.assignee!,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: t.textSecondary),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Full bug (fetched on open, since the list leaves out repro steps and diagnostics) with triage actions.
class BugDetailSheet extends ConsumerStatefulWidget {
  const BugDetailSheet({required this.bug, super.key});

  final AdminBug bug;

  @override
  ConsumerState<BugDetailSheet> createState() => _BugDetailSheetState();
}

class _BugDetailSheetState extends ConsumerState<BugDetailSheet> {
  late AdminBug _bug = widget.bug;
  late String _status = widget.bug.status;
  late String _severity = widget.bug.severity;
  late final _note = TextEditingController(text: widget.bug.resolutionNote ?? '');
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    ref
        .read(adminRepositoryProvider)
        .bug(widget.bug.id)
        .then((full) {
          if (full != null && mounted) setState(() => _bug = full);
        })
        .catchError((Object _) {}); // the list row already has the essentials
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final who = ref.read(authStateProvider).user?.email ?? 'superadmin';
      await ref
          .read(adminRepositoryProvider)
          .updateBug(
            _bug.id,
            status: _status == _bug.status ? null : _status,
            severity: _severity == _bug.severity ? null : _severity,
            resolutionNote: _note.text.trim().isEmpty || _note.text.trim() == (_bug.resolutionNote ?? '')
                ? null
                : _note.text.trim(),
            resolvedBy: who,
          );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = '$e';
        });
      }
    }
  }

  Widget _block(String title, String body) => body.trim().isEmpty
      ? const SizedBox.shrink()
      : Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AdminSectionLabel(title),
              SelectableText(body, style: TextStyle(color: context.tokens.textPrimary, height: 1.35)),
            ],
          ),
        );

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final b = _bug;
    final env = b.environment.entries.map((e) => '${e.key}: ${e.value}').join('\n');
    final stack = '${b.diagnostics['stackTrace'] ?? ''}';
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            b.title,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: t.textPrimary),
          ),
          const SizedBox(height: 6),
          Text(
            'Found by ${b.foundBy.isEmpty ? 'unknown' : b.foundBy} · ${adminDate(b.createdAt)}',
            style: TextStyle(color: t.textSecondary, fontSize: 12.5),
          ),
          _block('Description', b.description),
          _block('Repro steps', [for (final (i, s) in b.reproSteps.indexed) '${i + 1}. $s'].join('\n')),
          _block('Expected', b.expectedBehavior),
          _block('Actual', b.actualBehavior),
          _block('Environment', env),
          _block('Stack trace', stack.length > 800 ? '${stack.substring(0, 800)}…' : stack),
          const AdminSectionLabel('Status'),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final s in adminBugStatuses)
                ChoiceChip(
                  key: Key('bug-set-$s'),
                  label: Text(s.replaceAll('_', ' ')),
                  selected: _status == s,
                  onSelected: (_) => setState(() => _status = s),
                ),
            ],
          ),
          const AdminSectionLabel('Severity'),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final s in adminBugSeverities)
                ChoiceChip(
                  key: Key('bug-setsev-$s'),
                  label: Text(s),
                  selected: _severity == s,
                  onSelected: (_) => setState(() => _severity = s),
                ),
            ],
          ),
          const SizedBox(height: 12),
          AppTextField(key: const Key('bug-note'), controller: _note, label: 'Resolution note', maxLines: 3),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                _error!,
                key: const Key('bug-error'),
                style: TextStyle(color: t.colorDanger),
              ),
            ),
          const SizedBox(height: 14),
          AppButton(key: const Key('bug-save'), label: 'Save', isLoading: _busy, onPressed: _busy ? null : _save),
        ],
      ),
    );
  }
}

class _NewBugSheet extends ConsumerStatefulWidget {
  const _NewBugSheet();

  @override
  ConsumerState<_NewBugSheet> createState() => _NewBugSheetState();
}

class _NewBugSheetState extends ConsumerState<_NewBugSheet> {
  final _title = TextEditingController();
  final _desc = TextEditingController();
  String _severity = 'medium';
  String _category = 'general';
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_title.text.trim().isEmpty) {
      setState(() => _error = 'Give the bug a title.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final id = await ref
          .read(adminRepositoryProvider)
          .createBug(
            title: _title.text.trim(),
            description: _desc.text.trim(),
            severity: _severity,
            category: _category,
            environment: const {'platform': 'android', 'client': 'flutter', 'isOnline': true},
          );
      if (mounted) Navigator.of(context).pop(id);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = '$e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + MediaQuery.viewInsetsOf(context).bottom),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppTextField(key: const Key('newbug-title'), controller: _title, label: 'Title'),
        const SizedBox(height: 10),
        AppTextField(key: const Key('newbug-desc'), controller: _desc, label: 'Description', maxLines: 3),
        const AdminSectionLabel('Severity'),
        Wrap(
          spacing: 8,
          children: [
            for (final s in adminBugSeverities)
              ChoiceChip(label: Text(s), selected: _severity == s, onSelected: (_) => setState(() => _severity = s)),
          ],
        ),
        const AdminSectionLabel('Category'),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            for (final c in adminBugCategories)
              ChoiceChip(label: Text(c), selected: _category == c, onSelected: (_) => setState(() => _category = c)),
          ],
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              _error!,
              key: const Key('newbug-error'),
              style: TextStyle(color: context.tokens.colorDanger),
            ),
          ),
        const SizedBox(height: 14),
        AppButton(
          key: const Key('newbug-submit'),
          label: 'File bug',
          isLoading: _busy,
          onPressed: _busy ? null : _submit,
        ),
      ],
    ),
  );
}
