import '../logic/bug_report.dart';

class FeedbackUnavailable implements Exception {
  const FeedbackUnavailable();
  @override
  String toString() => 'Sign in with an account and go online to send feedback.';
}

abstract class FeedbackRepository {
  /// Returns the new case id (e.g. BUG-271). Throws [FeedbackUnavailable] for guest/demo or no backend.
  Future<String> reportBug(BugReport report);
  Future<List<MyBugReport>> myBugReports();
  Future<void> submitFeatureRequest({
    required String title,
    required String description,
    required String category,
    required String requestedBy,
    required Map<String, Object?> environment,
  });
}
