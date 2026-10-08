import 'package:flutter/material.dart';

import '../../../../core/format/money.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../../../../shared/widgets/app_surface.dart' show AppCard, Eyebrow;

/// One expense row shown in the import preview.
class ImportPreviewRow {
  const ImportPreviewRow({required this.date, required this.title, required this.amount});
  final String date;
  final String title;
  final double amount;
}

/// What a file would import, so the user can confirm before anything is written.
class ImportPreview {
  const ImportPreview({required this.source, required this.rows, this.note});
  final String source;
  final List<ImportPreviewRow> rows;

  /// Optional line under the button, e.g. which names were not found in the trip.
  final String? note;
}

/// Board 10 #3: file card, first three rows, "Import N expenses". True when confirmed.
Future<bool> showImportPreview(BuildContext context, {required ImportPreview preview, required String currency}) async {
  final ok = await AppSheet.show<bool>(
    context: context,
    title: 'Import ${preview.source}',
    builder: (_) => _ImportPreviewBody(preview: preview, currency: currency),
  );
  return ok == true;
}

class _ImportPreviewBody extends StatelessWidget {
  const _ImportPreviewBody({required this.preview, required this.currency});

  final ImportPreview preview;
  final String currency;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final n = preview.rows.length;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppCard(
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: t.primaryAccent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(Icons.description_outlined, color: t.primaryAccent),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(preview.source, style: const TextStyle(fontWeight: FontWeight.w700)),
                      Text('$n expenses', style: TextStyle(fontSize: 12.5, color: t.textSecondary)),
                    ],
                  ),
                ),
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: t.successColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    child: Text(
                      'Valid',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: t.successColor),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Eyebrow('Preview · first ${n < 3 ? n : 3}'),
          const SizedBox(height: 8),
          AppCard(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            child: Column(
              children: [
                for (final r in preview.rows.take(3))
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(
                      children: [
                        Text(r.date, style: TextStyle(fontSize: 12.5, color: t.textMuted)),
                        const SizedBox(width: 12),
                        Expanded(child: Text(r.title, maxLines: 1, overflow: TextOverflow.ellipsis)),
                        Text(
                          formatMoney(context, r.amount, currency),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          AppButton(
            key: const Key('import-confirm'),
            label: 'Import $n expenses',
            onPressed: n == 0 ? null : () => Navigator.of(context).pop(true),
          ),
          if (preview.note != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                preview.note!,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: t.textMuted),
              ),
            ),
        ],
      ),
    );
  }
}
