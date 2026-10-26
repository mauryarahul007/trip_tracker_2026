import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/repositories/notification_repository.dart';

/// A network that never answers.
class _Hang extends http.BaseClient {
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) => Completer<http.StreamedResponse>().future;
}

void main() {
  test('setRead and delete return at once even when the network never answers', () async {
    final db = AppDatabase.memory();
    addTearDown(db.close);
    final repo = NotificationRepository(db, SupabaseClient('http://localhost', 'anon', httpClient: _Hang()));
    await db
        .into(db.notificationsTable)
        .insert(
          NotificationsTableCompanion.insert(
            id: 'n1',
            userId: 'u1',
            title: 't',
            body: 'b',
            createdAt: '2026-10-01T00:00:00Z',
          ),
        );
    await repo.setRead('n1', true).timeout(const Duration(seconds: 2));
    expect((await db.select(db.notificationsTable).getSingle()).read, isTrue);
    await repo.delete('n1').timeout(const Duration(seconds: 2));
    expect(await db.select(db.notificationsTable).get(), isEmpty);
  });
}
