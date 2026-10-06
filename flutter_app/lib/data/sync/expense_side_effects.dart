import 'dart:io';

import 'package:drift/drift.dart' show Value;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/logging/app_logger.dart';
import '../local/app_database.dart';
import 'outbox_types.dart';

/// Uploads a staged receipt photo; returns the storage object path.
abstract class ReceiptUploader {
  Future<String> upload({
    required String tripId,
    required String expenseId,
    required String localPath,
    required String ext,
    required String mime,
  });

  /// Called after the expense row carrying the receipt landed.
  Future<void> markUploaded(String expenseId, String remotePath);
}

/// Writes a chat event card row (best effort).
abstract class ChatEventSender {
  Future<void> send(Map<String, dynamic> row);
}

/// Expense payload extras (receipt + chat card), applied around the RPC:
///   payload.receipt = {tripId, expenseId, localPath, ext, mime}
///   payload.chat    = a full `trip_messages` row incl. a client-made id
class ExpenseSideEffects {
  ExpenseSideEffects({required this.receipts, required this.chat, bool Function(String path)? fileExists})
      : _exists = fileExists ?? ((p) => File(p).existsSync());

  final ReceiptUploader receipts;
  final ChatEventSender chat;
  final bool Function(String path) _exists;

  /// RPC args with `p_receipt_path` set after uploading the staged photo.
  /// The photo goes first so a row never points at a missing object. A photo
  /// that vanished locally is dropped rather than blocking the money.
  Future<Map<String, dynamic>> prepareArgs(Map<String, dynamic> payload) async {
    final args = Map<String, dynamic>.from(payload['args'] as Map);
    final r = payload['receipt'];
    if (r is! Map) return args;
    final localPath = r['localPath'] as String;
    if (!_exists(localPath)) {
      AppLogger.warn('Staged receipt missing, saving expense without photo: $localPath');
      return args;
    }
    final path = await receipts.upload(
      tripId: r['tripId'] as String,
      expenseId: r['expenseId'] as String,
      localPath: localPath,
      ext: r['ext'] as String,
      mime: r['mime'] as String,
    );
    args['p_receipt_path'] = path;
    return args;
  }

  /// After the expense landed: mark the receipt done, then post the chat card.
  /// Neither may fail the (already written) expense. The card id is fixed at
  /// enqueue time, so a replay upserts the same row instead of duplicating it.
  Future<void> afterWritten(Map<String, dynamic> payload, Map<String, dynamic> sentArgs) async {
    final r = payload['receipt'];
    final path = sentArgs['p_receipt_path'];
    if (r is Map && path is String) {
      try {
        await receipts.markUploaded(r['expenseId'] as String, path);
      } catch (e) {
        AppLogger.warn('markUploaded failed: $e');
      }
    }
    final c = payload['chat'];
    if (c is Map) {
      try {
        await chat.send(Map<String, dynamic>.from(c));
      } catch (e) {
        AppLogger.warn('Chat card skipped: $e');
      }
    }
  }
}

class SupabaseReceiptUploader implements ReceiptUploader {
  SupabaseReceiptUploader(this._client, this._db);
  final SupabaseClient _client;
  final AppDatabase _db;

  @override
  Future<String> upload({
    required String tripId,
    required String expenseId,
    required String localPath,
    required String ext,
    required String mime,
  }) async {
    final path = '$tripId/$expenseId.$ext';
    try {
      await _client.storage.from('receipts').upload(
            path,
            File(localPath),
            fileOptions: FileOptions(contentType: mime, upsert: true), // upsert: replay-safe
          );
    } on StorageException catch (e) {
      final code = int.tryParse(e.statusCode ?? '') ?? 0;
      // Too large / wrong type / forbidden never succeed on retry; 408, 429 and 5xx do.
      final permanent = code >= 400 && code < 500 && code != 408 && code != 429;
      throw RemoteFailure(permanent ? FailureKind.permanent : FailureKind.transient, 'receipt upload ${e.statusCode}: ${e.message}');
    }
    return path;
  }

  @override
  Future<void> markUploaded(String expenseId, String remotePath) async {
    final row = await (_db.select(_db.offlineReceiptsTable)..where((t) => t.expenseId.equals(expenseId))).getSingleOrNull();
    await (_db.update(_db.offlineReceiptsTable)..where((t) => t.expenseId.equals(expenseId))).write(
      OfflineReceiptsTableCompanion(uploaded: const Value(true), remoteUrl: Value(remotePath)),
    );
    // The staged copy is no longer needed once the server has it.
    if (row != null) {
      try {
        await File(row.localFilePath).delete();
      } catch (_) {}
    }
  }
}

class SupabaseChatEventSender implements ChatEventSender {
  SupabaseChatEventSender(this._client);
  final SupabaseClient _client;

  @override
  Future<void> send(Map<String, dynamic> row) async {
    await _client.from('trip_messages').upsert(row);
  }
}
