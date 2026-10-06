import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/logic/bug_report.dart';
import '../../domain/repositories/feedback_repository.dart';

class SupabaseFeedbackRepository implements FeedbackRepository {
  SupabaseFeedbackRepository(this._client);

  final SupabaseClient? _client;

  SupabaseClient get _c {
    final c = _client;
    if (c == null || c.auth.currentUser == null) throw const FeedbackUnavailable();
    return c;
  }

  @override
  Future<String> reportBug(BugReport r) async {
    final res = await _c.rpc<dynamic>(
      'report_bug',
      params: {
        'p_title': r.title,
        'p_description': r.description,
        'p_severity': r.severity,
        'p_category': r.category,
        'p_found_by': r.foundBy,
        'p_environment': r.environment,
        'p_repro_steps': r.reproSteps,
        'p_expected_behavior': r.expectedBehavior,
        'p_actual_behavior': r.actualBehavior,
        'p_diagnostics': r.diagnostics,
        'p_fingerprint': r.fingerprint,
      },
    );
    return res is Map ? (res['id'] as String? ?? '') : '';
  }

  @override
  Future<List<MyBugReport>> myBugReports() async {
    final rows = await _c.rpc<dynamic>('list_my_bug_reports');
    if (rows is! List) return const [];
    return [
      for (final r in rows.whereType<Map<String, dynamic>>())
        MyBugReport(
          id: r['id'] as String,
          title: r['title'] as String? ?? '',
          status: r['status'] as String? ?? 'open',
          severity: r['severity'] as String? ?? 'medium',
          createdAt: r['created_at'] as String? ?? '',
        ),
    ];
  }

  @override
  Future<void> submitFeatureRequest({
    required String title,
    required String description,
    required String category,
    required String requestedBy,
    required Map<String, Object?> environment,
  }) async {
    await _c.rpc<dynamic>(
      'submit_feature_request',
      params: {
        'p_title': title,
        'p_description': description,
        'p_category': category,
        'p_requested_by': requestedBy,
        'p_environment': environment,
      },
    );
  }
}
