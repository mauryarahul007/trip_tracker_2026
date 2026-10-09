// Superadmin portal records, read from the same Supabase tables the web Ops Deck uses.

const adminBugSeverities = ['critical', 'high', 'medium', 'low'];
const adminBugStatuses = ['open', 'in_progress', 'resolved', 'wont_fix'];
const adminBugCategories = [
  'offline-sync',
  'splits-math',
  'ui-ux',
  'navigation',
  'auth',
  'receipts-camera',
  'p2p-sync',
  'performance',
  'general',
];

DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;

/// `profiles.signup_source` is jsonb (`{utm_source, ...}`) on current databases and plain text on older ones.
String? _utmSource(Object? v) {
  final s = v is Map ? v['utm_source'] : v;
  return s is String && s.trim().isNotEmpty ? s.trim() : null;
}

class AdminBug {
  const AdminBug({
    required this.id,
    required this.title,
    required this.description,
    required this.severity,
    required this.category,
    required this.status,
    required this.foundBy,
    this.environment = const {},
    this.reproSteps = const [],
    this.expectedBehavior = '',
    this.actualBehavior = '',
    this.diagnostics = const {},
    this.assignee,
    this.resolutionNote,
    this.resolvedBy,
    this.createdAt,
    this.updatedAt,
    this.resolvedAt,
  });

  final String id;
  final String title;
  final String description;
  final String severity;
  final String category;
  final String status;
  final String foundBy;
  final Map<String, dynamic> environment;
  final List<String> reproSteps;
  final String expectedBehavior;
  final String actualBehavior;
  final Map<String, dynamic> diagnostics;
  final String? assignee;
  final String? resolutionNote;
  final String? resolvedBy;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? resolvedAt;

  bool get isOpen => status == 'open' || status == 'in_progress';

  factory AdminBug.fromRow(Map<String, dynamic> r) => AdminBug(
    id: r['id'] as String,
    title: r['title'] as String? ?? '',
    description: r['description'] as String? ?? '',
    severity: r['severity'] as String? ?? 'medium',
    category: r['category'] as String? ?? 'general',
    status: r['status'] as String? ?? 'open',
    foundBy: r['found_by'] as String? ?? '',
    environment: r['environment'] is Map ? Map<String, dynamic>.from(r['environment'] as Map) : const {},
    reproSteps: r['repro_steps'] is List ? [for (final s in r['repro_steps'] as List) '$s'] : const [],
    expectedBehavior: r['expected_behavior'] as String? ?? '',
    actualBehavior: r['actual_behavior'] as String? ?? '',
    diagnostics: r['diagnostics'] is Map ? Map<String, dynamic>.from(r['diagnostics'] as Map) : const {},
    assignee: r['assignee'] as String?,
    resolutionNote: r['resolution_note'] as String?,
    resolvedBy: r['resolved_by'] as String?,
    createdAt: _date(r['created_at']),
    updatedAt: _date(r['updated_at']),
    resolvedAt: _date(r['resolved_at']),
  );
}

class AdminUser {
  const AdminUser({
    required this.id,
    required this.email,
    this.displayName,
    this.banned = false,
    this.createdAt,
    this.signupSource,
    this.isSuperadmin = false,
  });

  final String id;
  final String email;
  final String? displayName;
  final bool banned;
  final DateTime? createdAt;
  final String? signupSource;
  final bool isSuperadmin;

  String get label => (displayName?.trim().isNotEmpty ?? false) ? displayName!.trim() : email;

  AdminUser copyWith({bool? banned, bool? isSuperadmin}) => AdminUser(
    id: id,
    email: email,
    displayName: displayName,
    banned: banned ?? this.banned,
    createdAt: createdAt,
    signupSource: signupSource,
    isSuperadmin: isSuperadmin ?? this.isSuperadmin,
  );

  factory AdminUser.fromRow(Map<String, dynamic> r) => AdminUser(
    id: r['id'] as String,
    email: r['email'] as String? ?? '',
    displayName: r['display_name'] as String?,
    banned: r['banned'] == true,
    createdAt: _date(r['created_at']),
    signupSource: _utmSource(r['signup_source']),
  );
}

class AdminTrip {
  const AdminTrip({
    required this.id,
    required this.name,
    required this.ownerId,
    this.destination,
    this.startDate = '',
    this.endDate = '',
    this.frozen = false,
    this.archived = false,
    this.closed = false,
    this.createdAt,
    this.memberCount = 0,
  });

  final String id;
  final String name;
  final String ownerId;
  final String? destination;
  final String startDate;
  final String endDate;
  final bool frozen;
  final bool archived;
  final bool closed;
  final DateTime? createdAt;
  final int memberCount;

  /// Same wording as the web Ops Deck: a frozen trip is "grounded".
  String get status => frozen
      ? 'grounded'
      : archived
      ? 'archived'
      : closed
      ? 'closed'
      : 'active';

  AdminTrip copyWith({bool? frozen, bool? archived}) => AdminTrip(
    id: id,
    name: name,
    ownerId: ownerId,
    destination: destination,
    startDate: startDate,
    endDate: endDate,
    frozen: frozen ?? this.frozen,
    archived: archived ?? this.archived,
    closed: closed,
    createdAt: createdAt,
    memberCount: memberCount,
  );

  factory AdminTrip.fromRow(Map<String, dynamic> r) {
    final members = r['members'];
    final count = members is List && members.isNotEmpty && members.first is Map
        ? ((members.first as Map)['count'] as num?)?.toInt() ?? 0
        : 0;
    return AdminTrip(
      id: r['id'] as String,
      name: r['name'] as String? ?? '',
      ownerId: r['owner_id'] as String? ?? '',
      destination: r['destination'] as String?,
      startDate: r['start_date'] as String? ?? '',
      endDate: r['end_date'] as String? ?? '',
      frozen: r['frozen'] == true,
      archived: r['archived'] == true,
      closed: r['closed'] == true,
      createdAt: _date(r['created_at']),
      memberCount: count,
    );
  }
}

/// A stored flag value at one scope: `global`, a `trip` id or a `user` id.
class FlagOverride {
  const FlagOverride({required this.scope, required this.scopeId, required this.flagKey, required this.value});

  final String scope;
  final String scopeId;
  final String flagKey;
  final bool value;

  factory FlagOverride.fromRow(Map<String, dynamic> r) => FlagOverride(
    scope: r['scope'] as String? ?? 'global',
    scopeId: r['scope_id'] as String? ?? '',
    flagKey: r['flag_key'] as String? ?? '',
    value: r['value'] == true,
  );
}

/// One `security_audit_logs` row: who did what, optionally on a trip.
class AuditEntry {
  const AuditEntry({
    required this.id,
    required this.action,
    this.tripId,
    this.actorUserId,
    this.details = const {},
    this.createdAt,
  });

  final String id;
  final String action;
  final String? tripId;
  final String? actorUserId;
  final Map<String, dynamic> details;
  final DateTime? createdAt;

  factory AuditEntry.fromRow(Map<String, dynamic> r) => AuditEntry(
    id: '${r['id']}',
    action: r['action'] as String? ?? '',
    tripId: r['trip_id'] as String?,
    actorUserId: r['actor_user_id'] as String?,
    details: r['details'] is Map ? Map<String, dynamic>.from(r['details'] as Map) : const {},
    createdAt: _date(r['created_at']),
  );
}

const adminFeatureStatuses = ['requested', 'planned', 'in_progress', 'shipped', 'wont_do'];
const adminFeatureCategories = [
  'ui-ux',
  'analytics',
  'admin',
  'sync',
  'notifications',
  'security',
  'performance',
  'native',
  'general',
];

/// A row of the feature roadmap (`features` table).
class AdminFeature {
  const AdminFeature({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.status,
    this.requestedBy = '',
    this.shippedNote,
    this.linkedFlagKey,
    this.createdAt,
    this.shippedAt,
  });

  final String id;
  final String title;
  final String description;
  final String category;
  final String status;
  final String requestedBy;
  final String? shippedNote;
  final String? linkedFlagKey;
  final DateTime? createdAt;
  final DateTime? shippedAt;

  factory AdminFeature.fromRow(Map<String, dynamic> r) => AdminFeature(
    id: r['id'] as String,
    title: r['title'] as String? ?? '',
    description: r['description'] as String? ?? '',
    category: r['category'] as String? ?? 'general',
    status: r['status'] as String? ?? 'requested',
    requestedBy: r['requested_by'] as String? ?? '',
    shippedNote: r['shipped_note'] as String?,
    linkedFlagKey: r['linked_flag_key'] as String?,
    createdAt: _date(r['created_at']),
    shippedAt: _date(r['shipped_at']),
  );
}

/// `get_app_config()` rows as a map, with typed reads for the gates and limits.
class AdminConfig {
  const AdminConfig([this.values = const {}]);

  final Map<String, Object?> values;

  bool flag(String key) => values[key] == true;
  num? number(String key) => values[key] is num ? values[key] as num : num.tryParse('${values[key] ?? ''}');
  String text(String key) => values[key] is String ? values[key] as String : '';

  /// `{start, end}` of a scheduled maintenance window, or null.
  ({DateTime start, DateTime end})? get maintenanceWindow {
    final w = values['maintenance_window'];
    if (w is! Map) return null;
    final s = DateTime.tryParse('${w['start']}');
    final e = DateTime.tryParse('${w['end']}');
    return s == null || e == null ? null : (start: s, end: e);
  }

  AdminConfig with_(String key, Object? value) => AdminConfig({...values, key: value});
}

class NotificationStats {
  const NotificationStats({this.total = 0, this.read = 0, this.last7d = 0});
  final int total;
  final int read;
  final int last7d;
}

class RetentionCohort {
  const RetentionCohort({
    required this.week,
    required this.size,
    required this.d1,
    required this.d7,
    required this.d30,
  });

  final String week;
  final int size;

  /// (eligible, retained) per horizon.
  final (int, int) d1;
  final (int, int) d7;
  final (int, int) d30;

  factory RetentionCohort.fromRow(Map<String, dynamic> r) {
    int n(String k) => (r[k] as num?)?.toInt() ?? 0;
    return RetentionCohort(
      week: '${r['cohort_week']}'.split('T').first,
      size: n('cohort_size'),
      d1: (n('d1_eligible'), n('d1_retained')),
      d7: (n('d7_eligible'), n('d7_retained')),
      d30: (n('d30_eligible'), n('d30_retained')),
    );
  }
}

/// App-open / stuck / failure users per platform + app version, folded from `admin_reliability_summary`.
class ReliabilityGroup {
  ReliabilityGroup(this.platform, this.appVersion);

  final String platform;
  final String appVersion;
  int openUsers = 0;
  int stuckUsers = 0;
  int failUsers = 0;
}

class ServiceCheck {
  const ServiceCheck({required this.name, required this.ok, required this.ms});
  final String name;
  final bool ok;
  final int ms;
}
