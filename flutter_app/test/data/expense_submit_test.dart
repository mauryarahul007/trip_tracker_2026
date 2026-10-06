import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/remote/expense_online_api.dart';
import 'package:trip_tracker/data/repositories/drift_repositories.dart';
import 'package:trip_tracker/data/storage/receipt_store.dart';
import 'package:trip_tracker/data/sync/expense_side_effects.dart';
import 'package:trip_tracker/data/sync/outbox_store.dart';
import 'package:trip_tracker/data/sync/outbox_types.dart';
import 'package:trip_tracker/domain/logic/chat_event_row.dart';
import 'package:trip_tracker/domain/logic/expense_form_logic.dart';
import 'package:trip_tracker/domain/models/expense_io.dart';

class FakeApi implements ExpenseOnlineApi {
  final calls = <String>[];
  final chat = <Map<String, dynamic>>[];
  ExpenseActionException? fail;
  bool chatFails = false;

  void _go(String c) {
    calls.add(c);
    final f = fail;
    if (f != null) throw f;
  }

  @override
  Future<void> flagDispute(String id, String? note) async => _go('flag:$id:${note ?? ''}');
  @override
  Future<void> resolveDispute(String id) async => _go('resolve:$id');
  @override
  Future<void> confirmSettlement(String id) async => _go('confirm:$id');
  @override
  Future<void> approve(String id) async => _go('approve:$id');
  @override
  Future<void> sendChat(Map<String, dynamic> row) async {
    if (chatFails) throw Exception('chat down');
    chat.add(row);
  }
}

class FakeReceipts implements ReceiptUploader {
  final events = <String>[];
  Object? failWith;
  @override
  Future<String> upload({required String tripId, required String expenseId, required String localPath, required String ext, required String mime}) async {
    events.add('upload:$tripId/$expenseId.$ext');
    final f = failWith;
    if (f != null) throw f;
    return '$tripId/$expenseId.$ext';
  }

  @override
  Future<void> markUploaded(String expenseId, String remotePath) async => events.add('uploaded:$expenseId:$remotePath');
}

class FakeChat implements ChatEventSender {
  final rows = <Map<String, dynamic>>[];
  bool fails = false;
  @override
  Future<void> send(Map<String, dynamic> row) async {
    if (fails) throw Exception('nope');
    rows.add(row);
  }
}

ExpenseSubmission sub({
  String title = 'Dinner',
  double amount = 100,
  String mode = 'equal',
  List<String> split = const [],
  String paidBy = '',
  Map<String, double>? paidByShares,
}) =>
    ExpenseSubmission(
      title: title,
      amount: amount,
      currency: 'INR',
      category: 'Food',
      date: '2026-10-06',
      paidBy: paidBy,
      paidByShares: paidByShares,
      splitMode: mode,
      splitMemberIds: split,
    );

void main() {
  late AppDatabase db;
  late OutboxStore outbox;
  late FakeApi api;
  late DriftTripRepository trips;
  late DriftMemberRepository members;
  late DriftExpenseRepository expenses;
  var syncRequests = 0;
  late String tripId;
  late String me; // owner member id (linked to user u1)
  late String ben;
  late String cara;

  setUp(() async {
    db = AppDatabase.memory();
    outbox = OutboxStore(db);
    api = FakeApi();
    void req() => syncRequests++;
    syncRequests = 0;
    trips = DriftTripRepository(db, outbox, req);
    members = DriftMemberRepository(db, outbox, req);
    expenses = DriftExpenseRepository(db, outbox, req, api: api);
    tripId = await trips.createTrip(
        name: 'Goa', startDate: '2026-10-01', endDate: '2026-10-09', baseCurrency: 'INR', ownerId: 'u1', creatorName: 'Asha');
    me = (await db.select(db.membersTable).get()).single.id;
    ben = await members.addMember(tripId, 'Ben');
    cara = await members.addMember(tripId, 'Cara', linkedUserId: 'u3');
    // Clear the setup mutations so each test only sees its own queue entries.
    for (final i in await outbox.all()) {
      await outbox.markDone(i.id);
    }
  });
  tearDown(() => db.close());

  Future<List<OutboxItem>> queue() => outbox.all();

  group('submit (port of addExpense/updateExpense)', () {
    test('resolves shares over active participants, writes locally and queues one addExpense', () async {
      final r = await expenses.submit(sub(split: [me, ben, cara], paidBy: me), tripId: tripId, userId: 'u1');
      expect(r.isOk, isTrue);
      final e = (await expenses.watchActive(tripId).first).single;
      expect(e.id, r.expenseId);
      expect(e.resolvedShares, {me: 33.34, ben: 33.33, cara: 33.33}); // payer gets the spare unit
      expect(e.createdByUserId, 'u1');
      expect(e.approvalStatus, 'confirmed');
      final q = await queue();
      expect(q.single.type, OutboxType.addExpense);
      expect(q.single.payload['tempId'], e.id);
      final args = q.single.payload['args'] as Map;
      expect(args['p_id'], e.id);
      expect(args['p_resolved_shares'], {me: 33.34, ben: 33.33, cara: 33.33});
      expect(args['p_split_member_ids'], [me, ben, cara]);
      expect(syncRequests, greaterThan(0));
    });

    test('archived members are excluded from shares but stay in splitMemberIds (web behaviour)', () async {
      await members.setArchived(cara, true);
      await expenses.submit(sub(amount: 90, split: [me, ben, cara], paidBy: me), tripId: tripId, userId: 'u1');
      final e = (await expenses.watchActive(tripId).first).single;
      expect(e.resolvedShares.keys.toSet(), {me, ben});
      expect(e.splitMemberIds, [me, ben, cara]);
    });

    test('nobody active to split with -> error, nothing saved', () async {
      await members.setArchived(ben, true);
      for (final i in await outbox.all()) {
        await outbox.markDone(i.id);
      }
      final r = await expenses.submit(sub(split: [ben], paidBy: me), tripId: tripId, userId: 'u1');
      expect(r.error, 'Select at least one active traveler to split with.');
      expect(await expenses.watchActive(tripId).first, isEmpty);
      expect(await queue(), isEmpty);
    });

    test('frozen and closed trips refuse writes with the web wording', () async {
      await trips.setTripState(tripId, closed: true);
      var r = await expenses.submit(sub(split: [me], paidBy: me), tripId: tripId, userId: 'u1');
      expect(r.error, 'This trip is closed. Reopen it to add expenses.');
      await trips.setTripState(tripId, closed: false, frozen: true);
      r = await expenses.submit(sub(split: [me], paidBy: me), tripId: tripId, userId: 'u1');
      expect(r.error, 'This trip is currently locked / frozen by Superadmin. Modifications are disabled.');
      r = await expenses.submit(sub(split: [me], paidBy: me), tripId: tripId, userId: 'u1', isSuperadmin: true);
      expect(r.isOk, isTrue);
    });

    test('approval threshold gates big expenses but never settlements', () async {
      await db.customStatement("UPDATE trips SET domain_json = json_set(domain_json, '\$.approvalThreshold', 500) WHERE id = ?", [tripId]);
      Future<String> status(String title, double amount) async {
        final r = await expenses.submit(sub(title: title, amount: amount, split: [me, ben], paidBy: me),
            tripId: tripId, userId: 'u1', approvalThresholdEnabled: true);
        return (await expenses.watchExpense(r.expenseId!).first)!.approvalStatus;
      }

      expect(await status('Small', 499), 'confirmed');
      expect(await status('Big', 500), 'pending_approval');
      expect(await status('Settlement: Ben → Asha', 900), 'confirmed');
    });

    test('settlement titles are flagged as settlements', () async {
      final r = await expenses.submit(sub(title: 'Settlement: Ben → Asha', amount: 50, split: [me], paidBy: ben), tripId: tripId, userId: 'u1');
      expect((await expenses.watchExpense(r.expenseId!).first)!.isSettlement, isTrue);
    });

    test('edit: queues updateExpense, keeps creator/createdAt/approval/dispute, drops stale multi-payer data', () async {
      final created = await expenses.submit(
          sub(amount: 100, split: [me, ben], paidBy: me, paidByShares: {me: 60, ben: 40}), tripId: tripId, userId: 'u1');
      final id = created.expenseId!;
      await expenses.flagDispute(id, userId: 'u3', note: 'too much');
      for (final i in await queue()) {
        await outbox.markDone(i.id);
      }
      final before = (await expenses.watchExpense(id).first)!;

      final r = await expenses.submit(sub(title: 'Dinner v2', amount: 120, split: [me, ben], paidBy: ben), tripId: tripId, userId: 'u9', editingId: id);
      expect(r.expenseId, id);
      final after = (await expenses.watchExpense(id).first)!;
      expect(after.title, 'Dinner v2');
      expect(after.paidByShares, isNull); // switched back to a single payer
      expect(after.createdByUserId, 'u1'); // editor is not the creator
      expect(after.createdAt, before.createdAt);
      expect(after.disputedByUserId, 'u3'); // dispute survives an edit
      expect(after.resolvedShares, {me: 60.0, ben: 60.0});
      final q = await queue();
      expect(q.single.type, OutboxType.updateExpense);
      expect(q.single.payload['id'], id);
      expect((await expenses.watchActive(tripId).first), hasLength(1));
    });

    test('editing something that was removed reports it', () async {
      final r = await expenses.submit(sub(split: [me], paidBy: me), tripId: tripId, userId: 'u1', editingId: 'ghost');
      expect(r.error, 'This expense no longer exists.');
    });

    test('a staged receipt rides in the payload; the stored path waits for the upload', () async {
      final r = await expenses.submit(sub(split: [me], paidBy: me),
          tripId: tripId, userId: 'u1', expenseId: 'e-fixed', receipt: const StagedReceipt(localPath: '/tmp/r.jpg', ext: 'jpg', mime: 'image/jpeg'));
      expect(r.expenseId, 'e-fixed');
      final q = await queue();
      expect(q.single.payload['receipt'], {'tripId': tripId, 'expenseId': 'e-fixed', 'localPath': '/tmp/r.jpg', 'ext': 'jpg', 'mime': 'image/jpeg'});
      expect((await expenses.watchExpense('e-fixed').first)!.receiptPath, isNull);
    });

    test('chat card: only when asked and only for linked members; settlements get their own kind; id is fixed', () async {
      // u1 is linked to the owner member (`me`).
      await expenses.submit(sub(title: 'Lunch', amount: 40, split: [me], paidBy: me), tripId: tripId, userId: 'u1', postChatCard: true);
      await expenses.submit(sub(title: 'Settlement: Ben → Asha', amount: 10, split: [me], paidBy: ben), tripId: tripId, userId: 'u1', postChatCard: true);
      await expenses.submit(sub(title: 'No card', split: [me], paidBy: me), tripId: tripId, userId: 'u1'); // flag off
      await expenses.submit(sub(title: 'Stranger', split: [me], paidBy: me), tripId: tripId, userId: 'not-a-member', postChatCard: true);
      final q = await queue();
      final cards = [for (final i in q) i.payload['chat']].toList();
      expect(cards[0]['kind'], 'expense_added');
      expect(cards[0]['body'], 'Added Lunch · INR 40.00');
      expect(cards[0]['member_id'], me);
      expect(cards[0]['id'], isNotEmpty);
      expect(cards[1]['kind'], 'settlement_recorded');
      expect(cards[2], isNull);
      expect(cards[3], isNull);
    });
  });

  group('online-only actions (same as the web)', () {
    Future<String> seed({String title = 'Dinner'}) async =>
        (await expenses.submit(sub(title: title, split: [me, ben], paidBy: me), tripId: tripId, userId: 'u1')).expenseId!;

    test('flag dispute: server first, then local state; chat card is best effort', () async {
      final id = await seed();
      api.chatFails = true;
      await expenses.flagDispute(id, userId: 'u1', note: 'twice?', postChatCard: true); // must not throw
      expect(api.calls, ['flag:$id:twice?']);
      final e = (await expenses.watchExpense(id).first)!;
      expect(e.disputedByUserId, 'u1');
      expect(e.disputeNote, 'twice?');
      expect(e.disputedAt, isNotNull);

      api.chatFails = false;
      await expenses.resolveDispute(id, userId: 'u1', postChatCard: true);
      final r = (await expenses.watchExpense(id).first)!;
      expect(r.disputedAt, isNull);
      expect(r.disputedByUserId, isNull);
      expect(r.disputeNote, isNull);
      expect(api.chat.single['kind'], 'expense_dispute_resolved');
      expect(api.chat.single['body'], 'Dispute resolved: Dinner');
    });

    test('refused or offline: local state is untouched and the error surfaces', () async {
      final id = await seed();
      api.fail = const ExpenseActionException('You are offline.', offline: true);
      await expectLater(expenses.flagDispute(id, userId: 'u1'), throwsA(isA<ExpenseActionException>().having((e) => e.offline, 'offline', isTrue)));
      expect((await expenses.watchExpense(id).first)!.disputedAt, isNull);
      api.fail = const ExpenseActionException('not allowed');
      await expectLater(expenses.approve(id, userId: 'u1'), throwsA(isA<ExpenseActionException>()));
    });

    test('confirm settlement and approve update the local copy', () async {
      final s = await seed(title: 'Settlement: Ben → Asha');
      await expenses.confirmSettlement(s, userId: 'u3');
      final e = (await expenses.watchExpense(s).first)!;
      expect(e.settlementConfirmedByUserId, 'u3');
      expect(e.settlementConfirmedAt, isNotNull);

      final a = await seed();
      await db.customStatement("UPDATE expenses SET domain_json = json_set(domain_json, '\$.approvalStatus', 'pending_approval') WHERE id = ?", [a]);
      await expenses.approve(a, userId: 'u3');
      final ap = (await expenses.watchExpense(a).first)!;
      expect(ap.approvalStatus, 'confirmed');
      expect(ap.approvedByUserId, 'u3');
    });

    test('without a backend every online action reports offline', () async {
      final noApi = DriftExpenseRepository(db, outbox, () {});
      await expectLater(noApi.approve('x', userId: 'u1'), throwsA(isA<ExpenseActionException>().having((e) => e.offline, 'offline', isTrue)));
    });

    test('unknown expense', () async {
      await expectLater(expenses.confirmSettlement('ghost', userId: 'u1'), throwsA(isA<ExpenseActionException>()));
      expect(api.calls, isEmpty); // never bothers the server
    });
  });

  test('trip card expense count follows active expenses (recycled ones do not count)', () async {
    final a = (await expenses.submit(sub(split: [me], paidBy: me), tripId: tripId, userId: 'u1')).expenseId!;
    await expenses.submit(sub(title: 'Two', split: [me], paidBy: me), tripId: tripId, userId: 'u1');
    expect((await trips.watchTrip(tripId).first)!.expenseCount, 2);
    await expenses.delete(a, userId: 'u1');
    expect((await trips.watchTrip(tripId).first)!.expenseCount, 1);
    await expenses.restore(a);
    expect((await trips.watchTrip(tripId).first)!.expenseCount, 2);
  });

  group('expense side effects around the RPC', () {
    late FakeReceipts receipts;
    late FakeChat chat;
    ExpenseSideEffects fx({bool exists = true}) => ExpenseSideEffects(receipts: receipts, chat: chat, fileExists: (_) => exists);
    setUp(() {
      receipts = FakeReceipts();
      chat = FakeChat();
    });

    Map<String, dynamic> payload({bool withReceipt = true, bool withChat = true}) => {
          'args': {'p_id': 'e1', 'p_receipt_path': null},
          if (withReceipt) 'receipt': {'tripId': 't', 'expenseId': 'e1', 'localPath': '/x/e1.jpg', 'ext': 'jpg', 'mime': 'image/jpeg'},
          if (withChat) 'chat': {'id': 'm1', 'kind': 'expense_added'},
        };

    test('uploads the photo before the row and sets p_receipt_path', () async {
      final args = await fx().prepareArgs(payload());
      expect(args['p_receipt_path'], 't/e1.jpg');
      expect(receipts.events, ['upload:t/e1.jpg']);
    });

    test('no receipt: args pass through untouched', () async {
      final args = await fx().prepareArgs(payload(withReceipt: false));
      expect(args['p_receipt_path'], isNull);
      expect(receipts.events, isEmpty);
    });

    test('a vanished local photo is dropped; the expense still saves', () async {
      final args = await fx(exists: false).prepareArgs(payload());
      expect(args['p_receipt_path'], isNull);
      expect(receipts.events, isEmpty);
    });

    test('an upload failure propagates so the outbox can retry/quarantine', () async {
      receipts.failWith = const RemoteFailure(FailureKind.transient, '503');
      await expectLater(fx().prepareArgs(payload()), throwsA(isA<RemoteFailure>()));
    });

    test('after the row lands: receipt marked uploaded, chat card posted', () async {
      final p = payload();
      final args = await fx().prepareArgs(p);
      await fx().afterWritten(p, args);
      expect(receipts.events.last, 'uploaded:e1:t/e1.jpg');
      expect(chat.rows.single['id'], 'm1');
    });

    test('chat/markUploaded failures never fail the written expense', () async {
      chat.fails = true;
      final p = payload();
      await fx().afterWritten(p, {'p_receipt_path': 't/e1.jpg'}); // no throw
    });

    test('no chat payload, no card', () async {
      await fx().afterWritten(payload(withChat: false), {});
      expect(chat.rows, isEmpty);
    });
  });

  test('chat row builder: body text, payload and optional note', () {
    final row = buildExpenseChatRow(
        id: 'm', tripId: 't', memberId: 'x', kind: 'expense_disputed', expenseId: 'e', title: 'Taxi', amount: 12.5, currency: 'EUR', note: 'why?');
    expect(row['body'], 'Disputed Taxi — why?');
    expect(row['payload'], {'expenseId': 'e', 'title': 'Taxi', 'amount': 12.5, 'currency': 'EUR', 'note': 'why?'});
    final plain = buildExpenseChatRow(
        id: 'm', tripId: 't', memberId: 'x', kind: 'expense_added', expenseId: 'e', title: 'Taxi', amount: 12.5, currency: 'EUR');
    expect((plain['payload'] as Map).containsKey('note'), isFalse);
    expect(plain['body'], 'Added Taxi · EUR 12.50');
  });

  group('ReceiptStore', () {
    late Directory tmp;
    late ReceiptStore store;
    setUp(() async {
      tmp = await Directory.systemTemp.createTemp('receipts_test');
      store = ReceiptStore(db, baseDir: () async => tmp);
    });
    tearDown(() async {
      if (tmp.existsSync()) await tmp.delete(recursive: true);
    });

    test('stage copies into app storage, records it, and exposes it for preview until uploaded', () async {
      final src = File(p.join(tmp.path, 'camera_123.JPG'))..writeAsBytesSync([1, 2, 3]);
      final staged = await store.stage('e1', src.path);
      expect(staged.ext, 'jpg');
      expect(staged.mime, 'image/jpeg');
      expect(File(staged.localPath).readAsBytesSync(), [1, 2, 3]);
      expect(p.basename(staged.localPath), 'e1.jpg');
      expect(await store.pendingLocalPath('e1'), staged.localPath);
      await store.discard('e1');
      expect(File(staged.localPath).existsSync(), isFalse);
      expect(await store.pendingLocalPath('e1'), isNull);
    });

    test('only the bucket image types are accepted', () async {
      final pdf = File(p.join(tmp.path, 'x.pdf'))..writeAsBytesSync([0]);
      await expectLater(store.stage('e2', pdf.path), throwsArgumentError);
    });

    test('restaging replaces the earlier photo for the same expense', () async {
      final a = File(p.join(tmp.path, 'a.png'))..writeAsBytesSync([1]);
      final b = File(p.join(tmp.path, 'b.png'))..writeAsBytesSync([2, 2]);
      await store.stage('e3', a.path);
      final second = await store.stage('e3', b.path);
      expect(File(second.localPath).readAsBytesSync(), [2, 2]);
      expect((await db.select(db.offlineReceiptsTable).get()).length, 1);
    });
  });
}
