/// Bug report payload (RPC `report_bug`) and the auto-report gate that keeps a crash loop
/// from spamming the ledger. Ports `bugFingerprint` and `autoBugReporter.ts`.
class BugReport {
  const BugReport({
    required this.title,
    this.description = '',
    this.severity = 'medium',
    this.category = 'general',
    required this.foundBy,
    required this.environment,
    this.reproSteps = const [],
    this.expectedBehavior = '',
    this.actualBehavior = '',
    this.diagnostics = const {},
    this.fingerprint,
  });

  final String title;
  final String description;
  final String severity; // critical | high | medium | low
  final String category;
  final String foundBy;
  final Map<String, Object?> environment;
  final List<String> reproSteps;
  final String expectedBehavior;
  final String actualBehavior;
  final Map<String, Object?> diagnostics;
  final String? fingerprint;
}

class MyBugReport {
  const MyBugReport({
    required this.id,
    required this.title,
    required this.status,
    required this.severity,
    required this.createdAt,
  });

  final String id;
  final String title;
  final String status;
  final String severity;
  final String createdAt;
}

const bugSeverities = ['critical', 'high', 'medium', 'low'];
const bugCategories = [
  'general',
  'offline-sync',
  'splits-math',
  'ui-ux',
  'navigation',
  'auth',
  'receipts-camera',
  'performance',
];
const featureCategories = [
  'general',
  'ui-ux',
  'analytics',
  'sync',
  'notifications',
  'security',
  'performance',
  'native',
];

/// Same 32-bit string hash as the web, so one bug seen on web and app collapses to one case.
String bugFingerprint({required String title, required String category, String? stackTrace, String? route}) {
  final stackLine = (stackTrace ?? '')
      .split('\n')
      .map((s) => s.trim())
      .firstWhere((s) => s.isNotEmpty, orElse: () => '');
  final raw = stackLine.isNotEmpty ? stackLine : '$category|${route ?? ''}|${title.trim().toLowerCase()}';
  var h = 0;
  for (final c in raw.codeUnits) {
    h = (31 * h + c).toSigned(32);
  }
  return 'fp_${h.abs().toRadixString(36)}';
}

final _ignored = [
  RegExp(r'^ResizeObserver loop', caseSensitive: false),
  RegExp(
    r'SocketException|Connection (closed|refused|reset)|Failed host lookup|TimeoutException',
    caseSensitive: false,
  ),
];

/// At most [maxPerSession] reports, one per distinct message, at least [minGap] apart.
class AutoReportGate {
  AutoReportGate({this.maxPerSession = 5, this.minGap = const Duration(seconds: 30), DateTime Function()? now})
    : _now = now ?? DateTime.now;

  final int maxPerSession;
  final Duration minGap;
  final DateTime Function() _now;
  final _seen = <String>{};
  DateTime? _last;

  bool allow(String message) {
    if (message.isEmpty || _ignored.any((p) => p.hasMatch(message))) return false;
    final sig = message.length > 200 ? message.substring(0, 200) : message;
    if (_seen.contains(sig) || _seen.length >= maxPerSession) return false;
    final last = _last;
    if (last != null && _now().difference(last) < minGap) return false;
    _seen.add(sig);
    _last = _now();
    return true;
  }
}
