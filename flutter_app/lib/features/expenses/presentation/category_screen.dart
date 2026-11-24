import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/providers.dart';
import '../../../domain/logic/category_color.dart';
import '../../../shared/theme/category_icons.dart';
import '../../../domain/logic/flag_defaults.g.dart' show defaultFeatureFlags;
import '../../../domain/models/category.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/section_label.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../application/expenses_providers.dart';

class CategoryScreen extends ConsumerWidget {
  const CategoryScreen({required this.tripId, super.key});
  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final cats = ref.watch(tripCategoriesProvider(tripId));
    final reorder = ref.watch(flagProvider(('enableCategoryReorder', tripId))).value ?? false;
    final isAdmin = ref.watch(isTripAdminProvider(tripId));
    final vectorIcons =
        ref.watch(flagProvider(('enableCategoryVectorIcons', tripId))).value ??
        defaultFeatureFlags['enableCategoryVectorIcons'] ??
        true;
    if (context.tokens.horizon && !reorder) return _horizon(context, ref, cats, isAdmin, vectorIcons);
    return AppScaffold(
      appBar: AppBar(title: Text(l10n.catTitle)),
      body: Column(
        children: [
          if (isAdmin)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: AppButton(key: const Key('cat-add'), label: l10n.catAdd, onPressed: () => _add(context, ref)),
            ),
          Expanded(
            child: reorder
                ? ReorderableListView(
                    key: const Key('cat-list'),
                    padding: const EdgeInsets.all(8),
                    onReorderItem: (oldIndex, newIndex) {
                      final next = [...cats];
                      final item = next.removeAt(oldIndex);
                      next.insert(newIndex, item);
                      ref.read(tripRepositoryProvider).setCategoryOrder(tripId, [for (final c in next) c.id]);
                    },
                    children: [
                      for (final c in cats)
                        _tile(context, ref, c, isAdmin, key: ValueKey(c.id), vectorIcons: vectorIcons),
                    ],
                  )
                : ListView(
                    key: const Key('cat-list'),
                    children: [for (final c in cats) _tile(context, ref, c, isAdmin, vectorIcons: vectorIcons)],
                  ),
          ),
        ],
      ),
    );
  }

  /// Horizon ("Categories" mockup): + in the bar, built-in categories in one card with their expense counts, then
  /// "Your own" custom categories with a ⋮ menu (rename, delete).
  Widget _horizon(BuildContext context, WidgetRef ref, List<Category> cats, bool isAdmin, bool vectorIcons) {
    final l10n = context.l10n;
    final t = context.tokens;
    final expenses = ref.watch(tripExpensesProvider(tripId)).value ?? const [];
    final counts = <String, int>{};
    for (final e in expenses) {
      if (!e.isSettlement) counts[e.category] = (counts[e.category] ?? 0) + 1;
    }
    Widget card(List<Category> list) => Material(
      color: t.bgSurface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: t.borderColor),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          for (final (i, c) in list.indexed) ...[
            if (i > 0) Divider(height: 1, indent: 66, color: t.borderColor),
            ListTile(
              key: Key('cat-${c.id}'),
              visualDensity: VisualDensity.compact,
              contentPadding: const EdgeInsets.fromLTRB(14, 2, 4, 2),
              leading: Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Color(categoryColorArgb(c.id)).withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: categoryGlyph(c, 20, Color(categoryColorArgb(c.id)), vector: vectorIcons),
              ),
              title: Text(
                c.name,
                style: const TextStyle(fontFamily: AppTypography.fontBody, fontWeight: FontWeight.w700),
              ),
              subtitle: Text(
                l10n.horizonCatCount(counts[c.id] ?? 0),
                style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 12, color: t.textSecondary),
              ),
              trailing: isAdmin && c.isCustom
                  ? PopupMenuButton<String>(
                      key: Key('cat-menu-${c.id}'),
                      icon: const Icon(Icons.more_vert_rounded),
                      onSelected: (v) => v == 'rename' ? _rename(context, ref, c) : _delete(context, ref, c),
                      itemBuilder: (_) => [
                        PopupMenuItem(key: Key('cat-rename-${c.id}'), value: 'rename', child: const Text('Rename')),
                        PopupMenuItem(key: Key('cat-delete-${c.id}'), value: 'delete', child: const Text('Delete')),
                      ],
                    )
                  : null,
            ),
          ],
        ],
      ),
    );
    final builtIn = [
      for (final c in cats)
        if (!c.isCustom) c,
    ];
    final custom = [
      for (final c in cats)
        if (c.isCustom) c,
    ];
    return AppScaffold(
      appBar: AppBar(
        title: Text(l10n.catTitle),
        actions: [
          if (isAdmin)
            IconButton(
              key: const Key('cat-add'),
              tooltip: l10n.catAdd,
              icon: const Icon(Icons.add_rounded),
              onPressed: () => _add(context, ref),
            ),
        ],
      ),
      body: ListView(
        key: const Key('cat-list'),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          if (builtIn.isNotEmpty) card(builtIn),
          if (custom.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.only(top: 20, bottom: 8),
              child: Text(l10n.horizonCatYourOwn.toUpperCase(), style: sectionLabelStyle(context)),
            ),
            card(custom),
          ],
        ],
      ),
    );
  }

  Widget _tile(BuildContext context, WidgetRef ref, Category c, bool isAdmin, {Key? key, bool vectorIcons = false}) {
    return ListTile(
      key: key ?? Key('cat-${c.id}'),
      leading: Container(
        width: 42,
        height: 42,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Color(categoryColorArgb(c.id)).withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(14),
        ),
        child: categoryGlyph(c, 20, Color(categoryColorArgb(c.id)), vector: vectorIcons),
      ),
      title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600)),
      trailing: isAdmin && c.isCustom
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  tooltip: 'Rename',
                  key: Key('cat-rename-${c.id}'),
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () => _rename(context, ref, c),
                ),
                IconButton(
                  tooltip: 'Delete',
                  key: Key('cat-delete-${c.id}'),
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => _delete(context, ref, c),
                ),
              ],
            )
          : null,
    );
  }

  Future<void> _add(BuildContext context, WidgetRef ref) async {
    final name = await _ask(context, context.l10n.catName);
    if (name == null || name.trim().isEmpty) return;
    await ref.read(categoryRepositoryProvider).add(tripId, name.trim());
  }

  Future<void> _rename(BuildContext context, WidgetRef ref, Category c) async {
    final name = await _ask(context, context.l10n.catName, initial: c.name);
    if (name == null || name.trim().isEmpty) return;
    await ref.read(categoryRepositoryProvider).rename(c.id, name.trim());
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, Category c) async {
    final ok = await ConfirmDialog.show(
      context: context,
      title: 'Delete "${c.name}"?',
      message: 'This removes the category from the trip and cannot be undone.',
      confirmLabel: 'Delete',
      isDestructive: true,
    );
    if (!ok) return;
    await ref.read(categoryRepositoryProvider).delete(c.id);
  }

  Future<String?> _ask(BuildContext context, String label, {String? initial}) {
    final c = TextEditingController(text: initial ?? '');
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        content: AppTextField(key: const Key('cat-name'), controller: c, label: label, autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(context.l10n.actionCancel)),
          TextButton(onPressed: () => Navigator.pop(ctx, c.text), child: Text(context.l10n.formSave)),
        ],
      ),
    );
  }
}
