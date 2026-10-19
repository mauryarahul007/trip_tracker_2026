import 'dart:io';

import 'package:drift/drift.dart' show Value;
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../domain/models/expense_io.dart';
import '../local/app_database.dart';

/// Keeps receipt photos in app storage until the outbox uploads them
/// (offline-first), and remembers which expense each belongs to.
class ReceiptStore {
  ReceiptStore(this._db, {Future<Directory> Function()? baseDir})
    : _baseDir = baseDir ?? getApplicationSupportDirectory;
  final AppDatabase _db;
  final Future<Directory> Function() _baseDir;

  static const _mimeByExt = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'heic': 'image/heic',
    'heif': 'image/heif',
  };

  /// Copies [sourcePath] into `<support>/receipts/<expenseId>.<ext>`. Only the
  /// bucket's image types are accepted (5 MB cap enforced by the bucket).
  Future<StagedReceipt> stage(String expenseId, String sourcePath) async {
    final ext = p.extension(sourcePath).replaceFirst('.', '').toLowerCase();
    final mime = _mimeByExt[ext];
    if (mime == null) throw ArgumentError('Unsupported receipt type: .$ext');
    final dir = Directory(p.join((await _baseDir()).path, 'receipts'));
    // Sync copy: receipts are capped at 5 MB, and async file I/O never completes under the widget-test fake clock.
    dir.createSync(recursive: true);
    final dest = p.join(dir.path, '$expenseId.$ext');
    File(sourcePath).copySync(dest);
    await _db
        .into(_db.offlineReceiptsTable)
        .insertOnConflictUpdate(
          OfflineReceiptsTableCompanion.insert(
            expenseId: expenseId,
            localFilePath: dest,
            mimeType: mime,
            createdAt: DateTime.now().toUtc().toIso8601String(),
            uploaded: const Value(false),
          ),
        );
    return StagedReceipt(localPath: dest, ext: ext, mime: mime);
  }

  /// A not-yet-uploaded local photo for an expense (for previews), if it still exists.
  Future<String?> pendingLocalPath(String expenseId) async {
    final row = await (_db.select(
      _db.offlineReceiptsTable,
    )..where((t) => t.expenseId.equals(expenseId))).getSingleOrNull();
    if (row == null || row.uploaded) return null;
    return File(row.localFilePath).existsSync() ? row.localFilePath : null;
  }

  Future<void> discard(String expenseId) async {
    final row = await (_db.select(
      _db.offlineReceiptsTable,
    )..where((t) => t.expenseId.equals(expenseId))).getSingleOrNull();
    if (row != null) {
      try {
        await File(row.localFilePath).delete();
      } catch (_) {}
      await (_db.delete(_db.offlineReceiptsTable)..where((t) => t.expenseId.equals(expenseId))).go();
    }
  }
}
