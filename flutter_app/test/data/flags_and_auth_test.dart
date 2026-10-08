import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/repositories/drift_flags_repository.dart';
import 'package:trip_tracker/data/repositories/supabase_auth_repository.dart';
import 'package:trip_tracker/domain/logic/feature_flags_logic.dart';
import 'package:trip_tracker/domain/logic/flag_defaults.g.dart';
import 'package:trip_tracker/domain/repositories/repositories.dart';

void main() {
  group('flag registry parity', () {
    final fx =
        jsonDecode(File('../docs/flutter-migration/fixtures/flags.json').readAsStringSync()) as Map<String, dynamic>;

    test('Dart flag key set equals the TS registry (CI drift check)', () {
      final ts = (fx['defaults'] as Map<String, dynamic>).keys.toSet();
      expect(defaultFeatureFlags.keys.toSet(), ts);
      expect(ts.length, 103);
    });

    test('defaults and pack membership match the TS registry', () {
      final defaults = (fx['defaults'] as Map<String, dynamic>).cast<String, bool>();
      expect(defaultFeatureFlags, defaults);
      for (final p in fx['packs'] as List<dynamic>) {
        expect(consumerPacks[p['id']], List<String>.from(p['flagKeys'] as List));
      }
    });
  });

  group('isFeatureActive precedence', () {
    test('user > trip > global > default', () {
      const k = 'enableAchievements'; // default false
      expect(isFeatureActive(k, {}), isFalse);
      expect(isFeatureActive(k, {k: true}), isTrue);
      expect(
        isFeatureActive(
          k,
          {k: true},
          tripId: 't',
          tripOverrides: {
            't': {k: false},
          },
        ),
        isFalse,
      );
      expect(
        isFeatureActive(
          k,
          {k: true},
          tripId: 't',
          userId: 'u',
          tripOverrides: {
            't': {k: false},
          },
          userOverrides: {
            'u': {k: true},
          },
        ),
        isTrue,
      );
    });

    test('unknown key is off', () => expect(isFeatureActive('nope', {}), isFalse));

    test('packStatus', () {
      final keys = consumerPacks['core']!;
      expect(packStatus('core', {for (final k in keys) k: true}).status, 'armed');
      expect(packStatus('core', {for (final k in keys) k: false}).status, 'safed');
      expect(packStatus('missing', {}).status, 'safed');
    });
  });

  group('DriftFlagsRepository', () {
    late AppDatabase db;
    setUp(() => db = AppDatabase.memory());
    tearDown(() => db.close());

    test('offline: falls back to registry defaults and survives failed refresh', () async {
      final repo = DriftFlagsRepository(db, (_) async => throw const SocketException('offline'));
      await repo.refresh();
      expect(await repo.watch('enableAchievements').first, defaultFeatureFlags['enableAchievements']);
    });

    test('server layers override; trip layer is per trip; cache survives failed refresh', () async {
      const k = 'enableAchievements';
      var fail = false;
      final repo = DriftFlagsRepository(db, (t) async {
        if (fail) throw Exception('down');
        return const ResolvedFlags(global: {k: true}, trip: {k: false});
      });
      await repo.refresh(tripId: 't1');
      expect(await repo.watch(k).first, isTrue); // global only
      expect(await repo.watch(k, tripId: 't1').first, isFalse); // trip override
      expect(await repo.watch(k, tripId: 't2').first, isTrue); // other trip unaffected
      fail = true;
      await repo.refresh(tripId: 't1');
      expect(await repo.watch(k, tripId: 't1').first, isFalse);
    });
  });

  group('SupabaseAuthRepository (local identities + wipe)', () {
    late AppDatabase db;
    late sb.SupabaseClient client;
    late SupabaseAuthRepository repo;
    var flushed = 0;

    setUp(() {
      db = AppDatabase.memory();
      client = sb.SupabaseClient(
        'http://127.0.0.1:1',
        'anon-key',
        authOptions: const sb.AuthClientOptions(autoRefreshToken: false),
      );
      repo = SupabaseAuthRepository(client, db, beforeWipe: () async => flushed++);
    });
    tearDown(() async {
      await repo.dispose();
      await client.dispose();
      await db.close();
    });

    test('guest sign-in is local-only and persisted', () async {
      await repo.signInAsGuest(displayName: 'Asha');
      expect(repo.currentUser!.isLocalOnly, isTrue);
      expect(repo.currentUser!.displayName, 'Asha');
      final row = await db.select(db.settingsKvTable).get();
      expect(row.single.key, 'auth.local_session');
    });

    test('signOut flushes first, wipes every table, and clears the user', () async {
      await repo.signInAsDemo();
      await db
          .into(db.syncMetaTable)
          .insert(SyncMetaTableCompanion.insert(key: 'cursor:t', value: 'x', updatedAt: 'x'));
      await repo.signOut();
      expect(flushed, 1);
      expect(repo.currentUser, isNull);
      expect(await db.select(db.syncMetaTable).get(), isEmpty);
      expect(await db.select(db.settingsKvTable).get(), isEmpty);
    });

    test('signInsPaused fails open when the lookup fails', () async {
      expect(await repo.signInsPaused(), isFalse);
    });

    test('network failure maps to AuthFailure.network', () async {
      expect(
        () => repo.signInWithEmail('a@b.c', 'pw'),
        throwsA(isA<AuthException>().having((e) => e.failure, 'failure', AuthFailure.network)),
      );
    });
  });
}
