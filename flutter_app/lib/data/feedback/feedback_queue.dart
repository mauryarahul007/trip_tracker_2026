import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../domain/logic/bug_report.dart';
import '../../domain/repositories/feedback_repository.dart';

/// One bug report or feature suggestion saved on the phone until it can be sent.
class PendingFeedback {
  const PendingFeedback({
    required this.id,
    required this.kind,
    required this.payload,
    required this.createdAt,
    this.attempts = 0,
  });

  final String id;

  /// 'bug' or 'feature'.
  final String kind;
  final Map<String, dynamic> payload;
  final int createdAt;
  final int attempts;

  PendingFeedback failedOnce() =>
      PendingFeedback(id: id, kind: kind, payload: payload, createdAt: createdAt, attempts: attempts + 1);

  Map<String, dynamic> toJson() => {
    'id': id,
    'kind': kind,
    'payload': payload,
    'createdAt': createdAt,
    'attempts': attempts,
  };

  factory PendingFeedback.fromJson(Map<String, dynamic> j) => PendingFeedback(
    id: j['id'] as String,
    kind: j['kind'] as String,
    payload: Map<String, dynamic>.from(j['payload'] as Map),
    createdAt: (j['createdAt'] as num).toInt(),
    attempts: (j['attempts'] as num?)?.toInt() ?? 0,
  );
}

/// What happened to a submission: delivered now (with the case id for bugs), or kept for later.
class FeedbackOutcome {
  const FeedbackOutcome.sent([this.caseId = '']) : queued = false;
  const FeedbackOutcome.queued() : queued = true, caseId = '';

  final bool queued;
  final String caseId;
}

/// Bug reports and suggestions that survive being offline: saved in the app's preferences, sent in order as soon as
/// the connection is back. A message that keeps failing while online is dropped after [maxAttempts] so a bad one
/// cannot block the rest. Pure Dart over [SharedPreferences] so it can be tested without a phone.
class FeedbackQueue {
  FeedbackQueue(this._prefs, this._repo, {this.maxAttempts = 5, DateTime Function()? now}) : _now = now ?? DateTime.now;

  static const _key = 'feedback.pending';

  final SharedPreferences _prefs;
  final FeedbackRepository _repo;
  final int maxAttempts;
  final DateTime Function() _now;

  List<PendingFeedback> get pending {
    final raw = _prefs.getString(_key);
    if (raw == null) return const [];
    try {
      return [for (final j in jsonDecode(raw) as List) PendingFeedback.fromJson(Map<String, dynamic>.from(j as Map))];
    } catch (_) {
      return const []; // a damaged value is just an empty queue
    }
  }

  Future<void> _save(List<PendingFeedback> items) =>
      _prefs.setString(_key, jsonEncode([for (final i in items) i.toJson()]));

  Future<PendingFeedback> _add(String kind, Map<String, dynamic> payload) async {
    final at = _now().millisecondsSinceEpoch;
    final item = PendingFeedback(id: '$kind-$at-${pending.length}', kind: kind, payload: payload, createdAt: at);
    await _save([...pending, item]);
    return item;
  }

  /// Sends a bug report now when [online], otherwise (or if the send fails) keeps it. [FeedbackUnavailable]
  /// (guest or no account) is not queued: there is nowhere to send it.
  Future<FeedbackOutcome> submitBug(BugReport report, {required bool online}) async {
    if (online) {
      try {
        return FeedbackOutcome.sent(await _repo.reportBug(report));
      } on FeedbackUnavailable {
        rethrow;
      } catch (_) {
        // Fell through to saving: the connection is flaky.
      }
    }
    await _add('bug', Map<String, dynamic>.from(report.toJson()));
    return const FeedbackOutcome.queued();
  }

  Future<FeedbackOutcome> submitFeature({
    required String title,
    required String description,
    required String category,
    required String requestedBy,
    required Map<String, Object?> environment,
    required bool online,
  }) async {
    if (online) {
      try {
        await _repo.submitFeatureRequest(
          title: title,
          description: description,
          category: category,
          requestedBy: requestedBy,
          environment: environment,
        );
        return const FeedbackOutcome.sent();
      } on FeedbackUnavailable {
        rethrow;
      } catch (_) {
        // Saved below.
      }
    }
    await _add('feature', {
      'title': title,
      'description': description,
      'category': category,
      'requestedBy': requestedBy,
      'environment': environment,
    });
    return const FeedbackOutcome.queued();
  }

  /// Sends what is waiting, oldest first. Stops at the first failure (the rest would fail the same way) and
  /// returns how many were delivered.
  Future<int> flush() async {
    var items = pending;
    var sent = 0;
    while (items.isNotEmpty) {
      final next = items.first;
      try {
        await _send(next);
        sent++;
        items = items.sublist(1);
        await _save(items);
      } on FeedbackUnavailable {
        break; // not signed in right now: keep everything for later
      } catch (_) {
        final again = next.failedOnce();
        items = again.attempts >= maxAttempts ? items.sublist(1) : [again, ...items.sublist(1)];
        await _save(items);
        break;
      }
    }
    return sent;
  }

  Future<void> _send(PendingFeedback f) async {
    if (f.kind == 'bug') {
      await _repo.reportBug(BugReport.fromJson(f.payload));
    } else {
      final p = f.payload;
      await _repo.submitFeatureRequest(
        title: p['title'] as String? ?? '',
        description: p['description'] as String? ?? '',
        category: p['category'] as String? ?? 'general',
        requestedBy: p['requestedBy'] as String? ?? 'in-app-flutter',
        environment: Map<String, Object?>.from(p['environment'] as Map? ?? const {}),
      );
    }
  }
}
