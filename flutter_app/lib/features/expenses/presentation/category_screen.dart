import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/providers.dart';
import '../../../domain/models/category.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';
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
    return Scaffold(
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
                    children: [for (final c in cats) _tile(context, ref, c, isAdmin, key: ValueKey(c.id))],
                  )
                : ListView(
                    key: const Key('cat-list'),
                    children: [for (final c in cats) _tile(context, ref, c, isAdmin)],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _tile(BuildContext context, WidgetRef ref, Category c, bool isAdmin, {Key? key}) {
    return ListTile(
      key: key ?? Key('cat-${c.id}'),
      title: Text(c.name),
      subtitle: Text(c.icon ?? ''),
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
                  onPressed: () => ref.read(categoryRepositoryProvider).delete(c.id),
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
