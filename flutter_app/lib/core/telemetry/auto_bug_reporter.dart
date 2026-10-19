import '../../domain/logic/bug_report.dart';
import '../../domain/logic/pii_scrub.dart';
import '../../domain/repositories/feedback_repository.dart';
import '../logging/app_logger.dart';
import '../logging/crash_reporter.dart';

/// Auto-files uncaught errors in the bug ledger (web `autoBugReporter.ts`): same RPC, same
/// category and severity, de-duplicated and rate limited, PII scrubbed. It does nothing until
/// [attach] is called with a signed-in user, and never throws.
class AutoBugReporter {
  AutoBugReporter({AutoReportGate? gate}) : _gate = gate ?? AutoReportGate();

  static final instance = AutoBugReporter();

  final AutoReportGate _gate;
  FeedbackRepository? _repo;
  Future<Map<String, Object?>> Function()? _env;
  String? _userHash;

  void attach(FeedbackRepository repo, Future<Map<String, Object?>> Function() env, {String? userHash}) {
    _repo = repo;
    _env = env;
    _userHash = userHash;
  }

  void detach() {
    _repo = null;
    _env = null;
    _userHash = null;
  }

  Future<void> report(Object error, StackTrace? stack, {String source = 'flutter-error'}) async {
    final repo = _repo;
    final env = _env;
    if (repo == null || env == null) return;
    final message = scrubPii(error.toString());
    if (!_gate.allow(message)) return;
    try {
      final stackText = stack == null ? null : scrubPii(stack.toString());
      await repo.reportBug(
        BugReport(
          title: message.length > 140 ? message.substring(0, 140) : message,
          description: 'Automatically captured $source.\n\n${stackText ?? 'No stack trace available.'}',
          severity: 'critical',
          foundBy: 'auto-crash-handler',
          environment: await env(),
          expectedBehavior: 'App runs without throwing.',
          actualBehavior: message,
          diagnostics: {
            'stackTrace': ?stackText,
            'consoleLogs': AppLogger.recent.reversed.take(60).toList().reversed.toList(),
            'user': ?_userHash,
          },
          fingerprint: bugFingerprint(title: message, category: 'general', stackTrace: stackText),
        ),
      );
    } catch (_) {
      // Auto-filing must never itself take down the app.
    }
  }
}

/// Logs like [LoggerCrashReporter], then hands the error to [AutoBugReporter].
class ReportingCrashReporter implements CrashReporter {
  const ReportingCrashReporter([this._inner = const LoggerCrashReporter()]);

  final CrashReporter _inner;

  @override
  Future<void> recordError(dynamic error, StackTrace? stack, {String? reason, bool fatal = false}) async {
    await _inner.recordError(error, stack, reason: reason, fatal: fatal);
    await AutoBugReporter.instance.report(error as Object, stack, source: fatal ? 'zone-error' : 'flutter-error');
  }

  @override
  Future<void> setUserIdentifier(String identifier) => _inner.setUserIdentifier(identifier);

  @override
  Future<void> clearUserIdentifier() => _inner.clearUserIdentifier();

  @override
  Future<void> log(String message) => _inner.log(message);
}
