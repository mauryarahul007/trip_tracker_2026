import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:trip_tracker/data/feedback/feedback_queue.dart';
import 'package:trip_tracker/domain/logic/bug_report.dart';
import 'package:trip_tracker/domain/repositories/feedback_repository.dart';

class FakeFeedbackRepo implements FeedbackRepository {
  final bugs = <String>[];
  final features = <String>[];
  Object? failWith;
  var calls = 0;

  void _maybeFail() {
    calls++;
    final f = failWith;
    if (f != null) throw f;
  }

  @override
  Future<String> reportBug(BugReport r) async {
    _maybeFail();
    bugs.add(r.title);
    return 'BUG-${bugs.length}';
  }

  @override
  Future<List<MyBugReport>> myBugReports() async => const [];

  @override
  Future<void> submitFeatureRequest({
    required String title,
    required String description,
    required String category,
    required String requestedBy,
    required Map<String, Object?> environment,
  }) async {
    _maybeFail();
    features.add(title);
  }
}

BugReport bug(String title) => BugReport(
  title: title,
  description: 'it broke',
  foundBy: 'in-app-flutter',
  environment: const {'client': 'flutter'},
  reproSteps: const ['open', 'tap'],
  diagnostics: const {'syncQueueLength': 2},
  fingerprint: 'fp',
);

Future<(FeedbackQueue, FakeFeedbackRepo)> setup() async {
  SharedPreferences.setMockInitialValues({});
  final repo = FakeFeedbackRepo();
  return (FeedbackQueue(await SharedPreferences.getInstance(), repo, now: () => DateTime(2026, 10, 18)), repo);
}

Future<FeedbackQueue> reopen(FakeFeedbackRepo repo) async => FeedbackQueue(await SharedPreferences.getInstance(), repo);

void main() {
  test('online: a bug report is sent straight away with its case id and nothing is kept', () async {
    final (q, repo) = await setup();
    final r = await q.submitBug(bug('Crash'), online: true);
    expect((r.queued, r.caseId), (false, 'BUG-1'));
    expect(repo.bugs, ['Crash']);
    expect(q.pending, isEmpty);
  });

  test('offline: it is saved without touching the network, then sent in order when flushed', () async {
    final (q, repo) = await setup();
    expect((await q.submitBug(bug('First'), online: false)).queued, isTrue);
    expect(
      (await q.submitFeature(
        title: 'Dark charts',
        description: 'please',
        category: 'ui-ux',
        requestedBy: 'in-app-flutter',
        environment: const {},
        online: false,
      )).queued,
      isTrue,
    );
    expect(repo.calls, 0);
    expect(q.pending.length, 2);

    final restarted = await reopen(repo); // an app restart keeps them
    expect(restarted.pending.map((p) => p.kind), ['bug', 'feature']);
    expect(await restarted.flush(), 2);
    expect(repo.bugs, ['First']);
    expect(repo.features, ['Dark charts']);
    expect(restarted.pending, isEmpty);
  });

  test('a saved bug report keeps every field through the round trip', () async {
    final back = BugReport.fromJson(bug('Detailed').toJson());
    expect(back.title, 'Detailed');
    expect(back.description, 'it broke');
    expect(back.reproSteps, ['open', 'tap']);
    expect(back.diagnostics['syncQueueLength'], 2);
    expect(back.environment['client'], 'flutter');
    expect(back.fingerprint, 'fp');
  });

  test('a send that fails while online is kept; flush stops at the first failure and retries later', () async {
    final (q, repo) = await setup();
    repo.failWith = Exception('socket');
    expect((await q.submitBug(bug('Flaky'), online: true)).queued, isTrue); // saved instead of lost
    await q.submitBug(bug('Second'), online: false);
    expect(await q.flush(), 0);
    expect(repo.calls, 2); // one failed send at submit, one failed flush: not one per item
    expect(q.pending.first.attempts, 1);
    repo.failWith = null;
    expect(await q.flush(), 2);
    expect(q.pending, isEmpty);
  });

  test('not signed in: nothing is queued from submit and a flush keeps what is waiting', () async {
    final (q, repo) = await setup();
    repo.failWith = const FeedbackUnavailable();
    await expectLater(q.submitBug(bug('Guest'), online: true), throwsA(isA<FeedbackUnavailable>()));
    expect(q.pending, isEmpty);
    repo.failWith = null;
    await q.submitBug(bug('Saved'), online: false);
    repo.failWith = const FeedbackUnavailable();
    expect(await q.flush(), 0);
    expect(q.pending.single.attempts, 0); // signing out is not the message's fault
  });

  test('a message that keeps failing is dropped after five tries so it cannot block the rest', () async {
    final (q, repo) = await setup();
    await q.submitBug(bug('Poison'), online: false);
    await q.submitBug(bug('Fine'), online: false);
    repo.failWith = Exception('rejected');
    for (var i = 0; i < 5; i++) {
      await q.flush();
    }
    expect(q.pending.map((p) => p.payload['title']), ['Fine']);
    repo.failWith = null;
    expect(await q.flush(), 1);
  });

  test('a damaged saved value is just an empty queue', () async {
    SharedPreferences.setMockInitialValues({'feedback.pending': 'not json'});
    final q = FeedbackQueue(await SharedPreferences.getInstance(), FakeFeedbackRepo());
    expect(q.pending, isEmpty);
    expect(await q.flush(), 0);
  });
}
