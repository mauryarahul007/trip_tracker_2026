import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../domain/models/admin.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/receipt_card.dart';
import '../application/admin_providers.dart';
import 'admin_widgets.dart';

/// The feature roadmap and requests (`features` table): triage, mark shipped with a note, link a flag.
class FeaturesPage extends ConsumerStatefulWidget {
  const FeaturesPage({super.key});

  @override
  ConsumerState<FeaturesPage> createState() => _FeaturesPageState();
}

class _FeaturesPageState extends ConsumerState<FeaturesPage> {
  String _status = 'all';

  Future<void> _refresh() async {
    ref.invalidate(adminFeaturesProvider);
    await ref.read(adminFeaturesProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('feature-new'),
        onPressed: () async {
          final id = await AppSheet.show<String>(
            context: context,
            title: 'New feature',
            builder: (_) => const _NewFeatureSheet(),
          );
          if (id != null) {
            ref.invalidate(adminFeaturesProvider);
            if (context.mounted) adminToast(context, id.isEmpty ? 'Feature logged' : '$id logged');
          }
        },
        icon: const Icon(Icons.add_rounded),
        label: const Text('New feature'),
      ),
      body: AdminAsync<List<AdminFeature>>(
        value: ref.watch(adminFeaturesProvider),
        onRefresh: _refresh,
        builder: (context, all) {
          final shown = [
            for (final f in all)
              if (_status == 'all' || f.status == _status) f,
          ];
          final shipped = all.where((f) => f.status == 'shipped').length;
          final total = all.where((f) => f.status != 'wont_do').length;
          return ListView(
            key: const Key('feature-list'),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
            children: [
              Text('$shipped of $total shipped', style: TextStyle(color: t.textSecondary)),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: total == 0 ? 0 : shipped / total,
                minHeight: 6,
                borderRadius: BorderRadius.circular(99),
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final s in ['all', ...adminFeatureStatuses])
                      AdminFilterChip(
                        key: Key('feature-status-$s'),
                        label: s == 'all' ? 'All' : s.replaceAll('_', ' '),
                        selected: _status == s,
                        onTap: () => setState(() => _status = s),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (shown.isEmpty)
                const EmptyState(
                  icon: Icons.lightbulb_outline,
                  title: 'Nothing here',
                  subtitle: 'No features match this filter.',
                )
              else
                for (final f in shown)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: InkWell(
                      key: Key('feature-${f.id}'),
                      borderRadius: BorderRadius.circular(16),
                      onTap: () async {
                        final changed = await AppSheet.show<bool>(
                          context: context,
                          title: f.id,
                          builder: (_) => _FeatureSheet(feature: f),
                        );
                        if (changed == true) ref.invalidate(adminFeaturesProvider);
                      },
                      child: ReceiptCard(
                        body: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              f.title,
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: t.textPrimary),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${f.id} · ${f.category} · ${adminDate(f.createdAt)}',
                              style: TextStyle(
                                fontFamily: AppTypography.fontMono,
                                fontSize: 11.5,
                                color: t.textSecondary,
                              ),
                            ),
                          ],
                        ),
                        footer: Row(
                          children: [
                            AdminPill(
                              f.status.replaceAll('_', ' ').toUpperCase(),
                              color: f.status == 'shipped'
                                  ? t.colorSuccess
                                  : (f.status == 'wont_do' ? t.textMuted : t.primaryAccent),
                            ),
                            if (f.linkedFlagKey != null) ...[
                              const SizedBox(width: 6),
                              AdminPill('FLAG', color: t.colorWarning),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
            ],
          );
        },
      ),
    );
  }
}

class _FeatureSheet extends ConsumerStatefulWidget {
  const _FeatureSheet({required this.feature});

  final AdminFeature feature;

  @override
  ConsumerState<_FeatureSheet> createState() => _FeatureSheetState();
}

class _FeatureSheetState extends ConsumerState<_FeatureSheet> {
  late String _status = widget.feature.status;
  late final _note = TextEditingController(text: widget.feature.shippedNote ?? '');
  late String _flag = widget.feature.linkedFlagKey ?? '';
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
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

  @override
  Widget build(BuildContext context) {
    final f = widget.feature;
    final t = context.tokens;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            f.title,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: t.textPrimary),
          ),
          if (f.description.isNotEmpty) ...[
            const SizedBox(height: 8),
            SelectableText(f.description, style: TextStyle(color: t.textPrimary, height: 1.35)),
          ],
          const AdminSectionLabel('Status'),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final s in adminFeatureStatuses)
                ChoiceChip(
                  key: Key('feature-set-$s'),
                  label: Text(s.replaceAll('_', ' ')),
                  selected: _status == s,
                  onSelected: (_) => setState(() => _status = s),
                ),
            ],
          ),
          const SizedBox(height: 12),
          AppTextField(key: const Key('feature-note'), controller: _note, label: 'Shipped note', maxLines: 2),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            key: const Key('feature-flag'),
            initialValue: _flag,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Linked flag'),
            items: [
              const DropdownMenuItem(value: '', child: Text('None')),
              for (final k in (flagMeta.keys.toList()..sort()))
                DropdownMenuItem(
                  value: k,
                  child: Text(k, overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: (v) => setState(() => _flag = v ?? ''),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                _error!,
                key: const Key('feature-error'),
                style: TextStyle(color: t.colorDanger),
              ),
            ),
          const SizedBox(height: 14),
          AppButton(
            key: const Key('feature-save'),
            label: 'Save',
            isLoading: _busy,
            onPressed: _busy
                ? null
                : () => _run(() async {
                    final note = _note.text.trim();
                    await ref
                        .read(adminRepositoryProvider)
                        .updateFeature(
                          f.id,
                          status: _status == f.status ? null : _status,
                          shippedNote: note.isEmpty || note == (f.shippedNote ?? '') ? null : note,
                          shippedBy: _status == 'shipped'
                              ? (ref.read(authStateProvider).user?.email ?? 'superadmin')
                              : null,
                          linkedFlagKey: _flag == (f.linkedFlagKey ?? '') ? null : _flag,
                        );
                  }),
          ),
          const SizedBox(height: 10),
          AppButton(
            key: const Key('feature-delete'),
            label: 'Delete',
            icon: Icons.delete_outline_rounded,
            variant: AppButtonVariant.secondary,
            onPressed: _busy
                ? null
                : () async {
                    final ok = await ConfirmDialog.show(
                      context: context,
                      title: 'Delete ${f.id}?',
                      message: 'This removes the entry from the roadmap.',
                      confirmLabel: 'Delete',
                      isDestructive: true,
                    );
                    if (ok) await _run(() => ref.read(adminRepositoryProvider).deleteFeature(f.id));
                  },
          ),
        ],
      ),
    );
  }
}

class _NewFeatureSheet extends ConsumerStatefulWidget {
  const _NewFeatureSheet();

  @override
  ConsumerState<_NewFeatureSheet> createState() => _NewFeatureSheetState();
}

class _NewFeatureSheetState extends ConsumerState<_NewFeatureSheet> {
  final _title = TextEditingController();
  final _desc = TextEditingController();
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
      setState(() => _error = 'Give the feature a title.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final id = await ref
          .read(adminRepositoryProvider)
          .createFeature(title: _title.text.trim(), description: _desc.text.trim(), category: _category);
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
        AppTextField(key: const Key('newfeature-title'), controller: _title, label: 'Title'),
        const SizedBox(height: 10),
        AppTextField(key: const Key('newfeature-desc'), controller: _desc, label: 'Description', maxLines: 3),
        const AdminSectionLabel('Category'),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            for (final c in adminFeatureCategories)
              ChoiceChip(label: Text(c), selected: _category == c, onSelected: (_) => setState(() => _category = c)),
          ],
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              _error!,
              key: const Key('newfeature-error'),
              style: TextStyle(color: context.tokens.colorDanger),
            ),
          ),
        const SizedBox(height: 14),
        AppButton(
          key: const Key('newfeature-submit'),
          label: 'Log feature',
          isLoading: _busy,
          onPressed: _busy ? null : _submit,
        ),
      ],
    ),
  );
}
