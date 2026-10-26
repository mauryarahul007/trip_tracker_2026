import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:trip_tracker/core/storage/prefs.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/data/sync/outbox_store.dart';
import 'package:trip_tracker/data/sync/trip_pull_sync.dart';
import 'package:trip_tracker/domain/models/member.dart';
import 'package:trip_tracker/domain/models/trip_message.dart';
import 'package:trip_tracker/features/chat/application/chat_providers.dart';
import 'package:trip_tracker/features/chat/presentation/chat_pane.dart';
import 'package:trip_tracker/features/expenses/application/expenses_providers.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';

import '../../support/fakes.dart';

class _FakeChatReader extends TripRemoteReader {
  _FakeChatReader(this.tripMessagesList);
  final List<Map<String, dynamic>> tripMessagesList;

  @override
  Future<List<String>> myTripIds() async => ['trip-1'];

  @override
  Future<Map<String, dynamic>> tripChanges(String tripId, DateTime? since) async => {
    'server_time': '2026-10-19T10:00:00.000Z',
    'trip': {
      'id': 'trip-1',
      'name': 'Paris Trip',
      'owner_id': 'u1',
      'start_date': '2026-11-01',
      'end_date': '2026-11-10',
      'base_currency': 'EUR',
      'join_code': 'PARIS',
      'created_at': '2026-10-01T00:00:00Z',
      'updated_at': '2026-10-01T00:00:00Z',
    },
    'members': [
      {
        'id': 'm1',
        'trip_id': 'trip-1',
        'name': 'Alice',
        'user_id': 'u1',
        'created_at': '2026-10-01T00:00:00Z',
        'updated_at': '2026-10-01T00:00:00Z',
      },
    ],
    'groups': <Object?>[],
    'group_members': <Object?>[],
    'categories': <Object?>[],
    'expenses': <Object?>[],
    'tombstones': {'expenses': <Object?>[]},
  };

  @override
  Future<List<Map<String, dynamic>>> tripMessages(String tripId, {DateTime? since}) async => tripMessagesList;
}

void main() {
  group('Chat Sync and WhatsApp Experience', () {
    late AppDatabase db;
    late OutboxStore outbox;

    setUp(() {
      db = AppDatabase.memory();
      outbox = OutboxStore(db);
    });

    tearDown(() async {
      await db.close();
    });

    test('TripPullSync pulls chat messages from remote reader into Drift table', () async {
      final remoteMsgs = [
        {
          'id': 'msg-1',
          'trip_id': 'trip-1',
          'member_id': 'm1',
          'body': 'Hello from remote!',
          'kind': 'text',
          'created_at': '2026-10-19T09:30:00.000Z',
        },
        {
          'id': 'msg-2',
          'trip_id': 'trip-1',
          'member_id': 'm1',
          'body': 'Second message',
          'kind': 'text',
          'created_at': '2026-10-19T09:35:00.000Z',
        },
      ];

      final reader = _FakeChatReader(remoteMsgs);
      final pull = TripPullSync(db, outbox, reader);

      await pull.syncTrip('trip-1');

      final saved = await (db.select(db.tripMessagesTable)..where((t) => t.tripId.equals('trip-1'))).get();
      expect(saved.length, 2);
      expect(saved.first.message, 'Hello from remote!');
      expect(saved.last.message, 'Second message');
    });

    testWidgets('ChatPane renders formatted timestamp and tick status', (tester) async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();

      final msg = TripMessage(
        id: 'msg-alice-1',
        tripId: 'trip-1',
        memberId: 'm1',
        body: 'Can everyone see this?',
        createdAt: DateTime(2026, 10, 19, 14, 25).millisecondsSinceEpoch,
      );

      final flags = FakeFlags({'enableChatOfflineOutbox', 'enableTripChat'}, {});

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            tripMessagesProvider('trip-1').overrideWith((ref) => Stream.value([msg])),
            tripMembersProvider('trip-1')
                .overrideWith((ref) => Stream.value([const Member(id: 'm1', name: 'Alice', tripId: 'trip-1')])),
            myMemberIdProvider('trip-1').overrideWithValue('m1'),
            flagsRepositoryProvider.overrideWithValue(flags),
            dirtyIdsProvider.overrideWith((ref) => Stream.value(const <String>{})),
            failedIdsProvider.overrideWith((ref) => Stream.value(const <String>{})),
          ],
          child: const MaterialApp(
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Scaffold(body: ChatPane(tripId: 'trip-1')),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Can everyone see this?'), findsOneWidget);
      expect(find.text('2:25 PM'), findsOneWidget);
      expect(find.byKey(const Key('chat-status-sent-msg-alice-1')), findsOneWidget);
    });
  });
}
