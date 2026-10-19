import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/format/money.dart';
import '../../../data/providers.dart';
import '../../../domain/models/expense.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/cached_photo.dart';
import '../../../shared/widgets/empty_state.dart';
import '../application/expenses_providers.dart';
import '../application/money_providers.dart';
import 'widgets/expense_detail_sheet.dart';

/// Every receipt in a trip as a photo grid (flag `enableReceiptGallery`). Tap a photo to see it larger and open its
/// expense. Read-only.
class ReceiptGalleryScreen extends ConsumerWidget {
  const ReceiptGalleryScreen({required this.tripId, super.key});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final on = ref.watch(flagProvider(('enableReceiptGallery', tripId))).value ?? true;
    final expenses = [
      for (final e in ref.watch(tripExpensesProvider(tripId)).value ?? const <Expense>[])
        if (!e.isSettlement && e.deletedAt == null && (e.receiptPath ?? '').isNotEmpty) e,
    ]..sort((a, b) => b.date.compareTo(a.date));

    return AppScaffold(
      appBar: AppBar(title: Text(l10n.receiptsTitle)),
      body: !on || expenses.isEmpty
          ? EmptyState(
              key: const Key('receipts-empty'),
              icon: Icons.receipt_long_outlined,
              title: l10n.receiptsEmptyTitle,
              subtitle: l10n.receiptsEmptyHint,
            )
          : GridView.builder(
              key: const Key('receipts-grid'),
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 180,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
              ),
              itemCount: expenses.length,
              itemBuilder: (_, i) => _ReceiptTile(tripId: tripId, expense: expenses[i]),
            ),
    );
  }
}

Widget _photo(String preview, {BoxFit fit = BoxFit.cover, Key? key}) => preview.startsWith('http')
    ? Image(image: CachedPhotoProvider(preview), key: key, fit: fit, errorBuilder: (_, _, _) => const _Broken())
    : Image.file(
        File(preview.replaceFirst('file://', '')),
        key: key,
        fit: fit,
        errorBuilder: (_, _, _) => const _Broken(),
      );

class _Broken extends StatelessWidget {
  const _Broken();

  @override
  Widget build(BuildContext context) =>
      Center(child: Icon(Icons.broken_image_outlined, color: context.tokens.textMuted));
}

class _ReceiptTile extends ConsumerWidget {
  const _ReceiptTile({required this.tripId, required this.expense});

  final String tripId;
  final Expense expense;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final preview = ref.watch(receiptPreviewProvider((expense.id, expense.receiptPath))).value;
    return Semantics(
      button: true,
      label: '${expense.title}, ${formatMoney(context, expense.amount, expense.currency)}',
      child: Material(
        color: t.bgSurface,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(t.radiusMd),
          side: BorderSide(color: t.borderColor),
        ),
        child: InkWell(
          key: Key('receipt-${expense.id}'),
          onTap: preview == null ? null : () => _view(context, preview),
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (preview == null) const Center(child: Icon(Icons.image_not_supported_outlined)) else _photo(preview),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.transparent, Colors.black.withValues(alpha: 0.75)],
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(8, 18, 8, 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          expense.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13),
                        ),
                        Text(
                          '${expense.date} · ${formatMoney(context, expense.amount, expense.currency)}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white70, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _view(BuildContext context, String preview) {
    final l10n = context.l10n;
    return showDialog<void>(
      context: context,
      builder: (ctx) => Dialog.fullscreen(
        backgroundColor: Colors.black,
        child: Stack(
          children: [
            Positioned.fill(
              child: InteractiveViewer(
                maxScale: 5,
                child: _photo(preview, fit: BoxFit.contain, key: const Key('receipt-large')),
              ),
            ),
            SafeArea(
              child: Align(
                alignment: Alignment.topRight,
                child: IconButton(
                  tooltip: MaterialLocalizations.of(ctx).closeButtonTooltip,
                  color: Colors.white,
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.of(ctx).pop(),
                ),
              ),
            ),
            SafeArea(
              child: Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: FilledButton(
                    key: const Key('receipt-open-expense'),
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      AppSheet.show<void>(
                        context: context,
                        builder: (sheetCtx) => ExpenseDetailSheet(
                          tripId: tripId,
                          expenseId: expense.id,
                          onEdit: () => Navigator.of(sheetCtx).pop(),
                          onDelete: () => Navigator.of(sheetCtx).pop(),
                        ),
                      );
                    },
                    child: Text(l10n.receiptsOpenExpense),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
