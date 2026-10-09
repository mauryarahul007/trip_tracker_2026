import 'dart:async';

import 'package:trip_tracker/app/deep_link_listener.dart';
import 'package:trip_tracker/core/platform/local_notifications_gateway.dart';
import 'package:trip_tracker/core/platform/push_gateway.dart';
import 'package:trip_tracker/data/push/push_service.dart';
import 'package:trip_tracker/domain/logic/bug_report.dart';
import 'package:trip_tracker/domain/logic/pass_reminders.dart';
import 'package:trip_tracker/domain/models/admin.dart';
import 'package:trip_tracker/features/travel/places/weather_service.dart';
import 'package:trip_tracker/domain/models/admin_fleet.dart';

import 'fleet_fixture.dart';

import 'package:trip_tracker/domain/repositories/admin_repository.dart';
import 'package:trip_tracker/domain/repositories/feedback_repository.dart';
import 'package:trip_tracker/domain/repositories/notification_prefs_repository.dart';
import 'package:trip_tracker/core/platform/share_service.dart';
import 'package:trip_tracker/data/auth/biometric_service.dart';
import 'package:trip_tracker/domain/models/join_share.dart';
import 'package:trip_tracker/domain/logic/flag_defaults.g.dart';
import 'package:trip_tracker/data/auth/social_auth.dart';
import 'package:trip_tracker/domain/repositories/repositories.dart';

/// In-memory [AuthRepository] for widget/router tests.
class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({AuthUser? user, this.paused = false}) : _current = user;

  AuthUser? _current;
  bool paused;
  AuthException? failNext;
  final calls = <String>[];
  final _c = StreamController<AuthUser?>.broadcast();

  void _set(AuthUser? u) {
    _current = u;
    _c.add(u);
  }

  @override
  AuthUser? get currentUser => _current;

  @override
  Stream<AuthUser?> watchUser() async* {
    yield _current;
    yield* _c.stream;
  }

  @override
  Future<bool> signInsPaused() async => paused;

  Future<void> _auth(String call, AuthUser user) async {
    calls.add(call);
    final f = failNext;
    if (f != null) {
      failNext = null;
      throw f;
    }
    _set(user);
  }

  static const _u = AuthUser(id: 'u1', email: 'a@b.c', displayName: 'Asha', provider: 'email');

  @override
  Future<AuthTokens?> sessionTokens() async =>
      const AuthTokens(accessToken: 'acc', refreshToken: 'ref', expiresIn: 3600);
  @override
  Future<void> signInWithEmail(String email, String password) => _auth('email:$email', _u);
  @override
  Future<void> signInAsSuperadmin(String email, String password) async {
    await _auth('superadmin:$email', _u);
    // The real repository now awaits the `is_superadmin` RPC while the session already exists, so the
    // router has time to leave (and dispose) the login screen before this call returns.
    await Future<void>.delayed(const Duration(milliseconds: 400));
  }

  @override
  Future<void> signUpWithEmail(String email, String password, {String? displayName}) => _auth('signup:$email', _u);
  @override
  Future<void> resetPassword(String email) async => calls.add('reset:$email');
  // ignore: close_sinks
  final recovery = StreamController<bool>.broadcast();
  @override
  Stream<bool> watchPasswordRecovery() => recovery.stream;
  @override
  Future<void> updatePassword(String newPassword) async => calls.add('updatePassword');

  @override
  Future<void> signInWithGoogleIdToken(String idToken, {String? nonce}) => _auth('google', _u);
  @override
  Future<void> signInWithGoogleOAuth({required String redirectTo}) => _auth('google', _u);
  @override
  Future<void> signInWithAppleIdToken(String idToken, {String? nonce, String? fullName}) => _auth('apple', _u);
  @override
  Future<void> signInAsGuest({String displayName = 'Traveler'}) =>
      _auth('guest', AuthUser(id: 'guest', displayName: displayName, provider: 'guest'));
  @override
  Future<void> signInAsDemo() => _auth('demo', const AuthUser(id: 'demo', provider: 'demo'));
  @override
  Future<void> updateDisplayName(String name) async {
    calls.add('rename:$name');
    final u = _current;
    if (u != null) _set(AuthUser(id: u.id, email: u.email, displayName: name, provider: u.provider));
  }

  @override
  Future<void> signOut() async {
    calls.add('signOut');
    _set(null);
  }

  @override
  Future<void> deleteAccount() async {
    calls.add('delete');
    _set(null);
  }
}

class FakeSocialAuth implements SocialAuth {
  FakeSocialAuth({this.hasApple = false});
  final bool hasApple;
  SocialCredential? googleResult = const SocialCredential(idToken: 'g-token');
  SocialCredential? appleResult = const SocialCredential(idToken: 'a-token', nonce: 'n', fullName: 'Asha K');
  int googleCalls = 0;

  @override
  bool get appleAvailable => hasApple;
  @override
  Future<SocialCredential?> google() async {
    googleCalls++;
    return googleResult;
  }

  @override
  Future<SocialCredential?> apple() async => appleResult;
}

class FakeBiometric implements BiometricService {
  bool available = true;
  bool passes = true;
  int prompts = 0;
  @override
  Future<bool> isAvailable() async => available;
  @override
  Future<bool> authenticate(String reason) async {
    prompts++;
    return passes;
  }
}

class FakeFlags implements FlagsRepository {
  FakeFlags([this.on = const {}, this.off = const {}]);

  /// Forced on/off; anything else resolves to the registry default, like the real repo.
  final Set<String> on;
  final Set<String> off;
  @override
  Stream<bool> watch(String key, {String? tripId}) => Stream.value(
    on.contains(key)
        ? true
        : off.contains(key)
        ? false
        : (defaultFeatureFlags[key] ?? false),
  );
  @override
  Future<void> refresh({String? tripId}) async {}
}

class FakeJoinRepository implements JoinRepository {
  JoinPreview? previewResult = const JoinPreview(
    tripName: 'Goa Weekend',
    startDate: '2026-12-01',
    endDate: '2026-12-05',
    memberFirstNames: ['Asha', 'Ben'],
  );
  JoinLookup? lookupResult = const JoinLookup(
    tripId: 'trip-1',
    tripName: 'Goa Weekend',
    isAdmin: false,
    unclaimedMembers: [
      UnclaimedMember(id: 'm1', name: 'Asha K'),
      UnclaimedMember(id: 'm2', name: 'Ben'),
    ],
  );
  Object? error; // thrown by preview/lookup when set (once)
  bool claimResult = true;
  final calls = <String>[];

  @override
  Future<JoinPreview?> preview(String code) async {
    calls.add('preview:$code');
    final e = error;
    if (e != null) {
      error = null;
      throw e;
    }
    return previewResult;
  }

  @override
  Future<void> recordPreview(String code) async => calls.add('recordPreview:$code');

  @override
  Future<JoinLookup?> lookup(String code) async {
    calls.add('lookup:$code');
    final e = error;
    if (e != null) {
      error = null;
      throw e;
    }
    return lookupResult;
  }

  @override
  Future<bool> claim(String memberId) async {
    calls.add('claim:$memberId');
    return claimResult;
  }
}

class FakeShareRepository implements ShareRepository {
  TripShareSummary? summaryResult = const TripShareSummary(
    tripName: 'Goa Weekend',
    startDate: '2026-12-01',
    endDate: '2026-12-05',
    destination: 'Goa',
    memberCount: 4,
    expenseCount: 12,
    spendByCurrency: {'INR': 24500.5, 'USD': 40},
  );
  Object? summaryError;
  final calls = <String>[];
  bool failWrites = false;

  @override
  Future<TripShareSummary?> summary(String token) async {
    calls.add('summary:$token');
    final e = summaryError;
    if (e != null) throw e;
    return summaryResult;
  }

  @override
  Future<void> recordView(String token) async => calls.add('view:$token');

  @override
  Future<ShareLinkState> generate(String tripId) async {
    calls.add('generate:$tripId');
    if (failWrites) throw Exception('offline');
    return ShareLinkState(token: 'tok-123', enabled: true, expiresAt: DateTime.now().add(const Duration(days: 30)));
  }

  @override
  Future<void> revoke(String tripId) async {
    calls.add('revoke:$tripId');
    if (failWrites) throw Exception('offline');
  }
}

class FakeShareService implements ShareService {
  final copied = <String>[];
  final shared = <String>[];
  final pngs = <String>[];
  @override
  Future<void> copy(String text) async => copied.add(text);
  @override
  Future<void> share(String text, {String? subject}) async => shared.add(text);
  @override
  Future<void> sharePng(List<int> bytes, {required String fileName, String? text}) async {
    pngs.add(fileName);
    if (text != null) shared.add(text);
  }

  final files = <String>[];
  @override
  Future<void> shareFile(
    List<int> bytes, {
    required String fileName,
    String? mimeType,
    String? subject,
    String? text,
  }) async {
    files.add(fileName);
    if (text != null) shared.add(text);
  }
}

class FakeDeepLinks implements DeepLinkSource {
  FakeDeepLinks({this.launch});
  final Uri? launch;
  // ignore: close_sinks
  final controller = StreamController<Uri>.broadcast();
  @override
  Future<Uri?> initial() async => launch;
  @override
  Stream<Uri> get stream => controller.stream;
}

class FakePushGateway implements PushGateway {
  /// Granted by default so the contextual prompt never interrupts unrelated tests.
  PushPermission perm = PushPermission.granted;
  PushPermission afterRequest = PushPermission.granted;
  bool available = true;
  String? tokenValue = 'fcm-token-1';
  PushMessage? initial;
  int requests = 0;
  bool tokenDeleted = false;
  // ignore: close_sinks
  final refresh = StreamController<String>.broadcast();
  // ignore: close_sinks
  final foreground = StreamController<PushMessage>.broadcast();
  // ignore: close_sinks
  final opened = StreamController<PushMessage>.broadcast();

  @override
  String get platform => 'android';
  @override
  Future<bool> initialize() async => available;
  @override
  Future<PushPermission> permission() async => available ? perm : PushPermission.unavailable;
  @override
  Future<PushPermission> requestPermission() async {
    requests++;
    perm = afterRequest;
    return perm;
  }

  @override
  Future<String?> token() async => tokenValue;
  @override
  Stream<String> get tokenRefreshes => refresh.stream;
  @override
  Future<void> deleteToken() async => tokenDeleted = true;
  @override
  Stream<PushMessage> get onForeground => foreground.stream;
  @override
  Stream<PushMessage> get onOpened => opened.stream;
  @override
  Future<PushMessage?> initialMessage() async => initial;
}

class FakePushTokenBackend implements PushTokenBackend {
  final registered = <String>[];
  final removed = <String>[];
  @override
  Future<void> register({required String token, required String platform, required String appVersion}) async =>
      registered.add('$token|$platform|$appVersion');
  @override
  Future<void> remove({required String userId, required String token}) async => removed.add('$userId|$token');
}

class FakeLocalNotifications implements LocalNotificationsGateway {
  bool permissionOk = true;
  int permissionAsks = 0;
  List<PlannedReminder> scheduled = const [];
  int replaceCalls = 0;
  @override
  Future<bool> requestPermission() async {
    permissionAsks++;
    return permissionOk;
  }

  @override
  Future<void> replaceAll(List<PlannedReminder> reminders) async {
    replaceCalls++;
    scheduled = reminders;
  }

  @override
  Future<List<int>> pendingIds() async => [for (final r in scheduled) r.id];
}

class FakeFeedback implements FeedbackRepository {
  final bugs = <BugReport>[];
  final features = <String>[];
  bool unavailable = false;
  List<MyBugReport> mine = const [];
  @override
  Future<String> reportBug(BugReport report) async {
    if (unavailable) throw const FeedbackUnavailable();
    bugs.add(report);
    return 'BUG-900';
  }

  @override
  Future<List<MyBugReport>> myBugReports() async => mine;
  @override
  Future<void> submitFeatureRequest({
    required String title,
    required String description,
    required String category,
    required String requestedBy,
    required Map<String, Object?> environment,
  }) async {
    if (unavailable) throw const FeedbackUnavailable();
    features.add(title);
  }
}

class FakeNotificationPrefs implements NotificationPrefsRepository {
  QuietHoursPref quiet = const QuietHoursPref();
  bool digest = false;
  final muted = <String>{};
  @override
  Future<QuietHoursPref> getQuietHours() async => quiet;
  @override
  Future<void> setQuietHours(QuietHoursPref pref) async => quiet = pref;
  @override
  Future<bool> getDigest() async => digest;
  @override
  Future<void> setDigest(bool enabled) async => digest = enabled;
  @override
  Future<bool> isTripMuted(String tripId) async => muted.contains(tripId);
  @override
  Future<void> setTripMuted(String tripId, bool m) async => m ? muted.add(tripId) : muted.remove(tripId);
}

/// In-memory superadmin portal data; every mutation is recorded in [calls] and applied to the lists.
class FakeAdmin implements AdminRepository {
  List<AdminBug> bugList = [
    AdminBug(
      id: 'BUG-1',
      title: 'Crash on settle',
      description: 'App closes when settling',
      severity: 'critical',
      category: 'splits-math',
      status: 'open',
      foundBy: 'tester',
      createdAt: DateTime(2026, 10, 1),
    ),
    AdminBug(
      id: 'BUG-2',
      title: 'Typo in login',
      description: '',
      severity: 'low',
      category: 'ui-ux',
      status: 'resolved',
      foundBy: 'tester',
      createdAt: DateTime(2026, 10, 2),
    ),
  ];
  List<AdminUser> userList = const [
    AdminUser(id: 'u1', email: 'asha@b.c', displayName: 'Asha'),
    AdminUser(id: 'root', email: 'root@b.c', displayName: 'Root', isSuperadmin: true),
  ];
  List<AdminTrip> tripList = const [AdminTrip(id: 't1', name: 'Goa Weekend', ownerId: 'u1', memberCount: 3)];
  List<FlagOverride> overrides = [];
  final calls = <String>[];
  bool failBugs = false;

  @override
  Future<List<AdminBug>> bugs() async {
    if (failBugs) throw const AdminUnavailable();
    return bugList;
  }

  @override
  Future<AdminBug?> bug(String id) async => bugList.where((b) => b.id == id).firstOrNull;

  @override
  Future<AdminBug?> updateBug(
    String id, {
    String? status,
    String? severity,
    String? assignee,
    String? resolutionNote,
    required String resolvedBy,
  }) async {
    calls.add('bug:$id:${status ?? '-'}:${severity ?? '-'}:${resolutionNote ?? '-'}');
    bugList = [
      for (final b in bugList)
        if (b.id == id)
          AdminBug(
            id: b.id,
            title: b.title,
            description: b.description,
            severity: severity ?? b.severity,
            category: b.category,
            status: status ?? b.status,
            foundBy: b.foundBy,
            resolutionNote: resolutionNote ?? b.resolutionNote,
            createdAt: b.createdAt,
          )
        else
          b,
    ];
    return bug(id);
  }

  @override
  Future<String> createBug({
    required String title,
    required String description,
    required String severity,
    required String category,
    required Map<String, Object?> environment,
  }) async {
    calls.add('create:$title:$severity:$category');
    bugList = [
      AdminBug(
        id: 'BUG-3',
        title: title,
        description: description,
        severity: severity,
        category: category,
        status: 'open',
        foundBy: 'superadmin-flutter',
      ),
      ...bugList,
    ];
    return 'BUG-3';
  }

  @override
  Future<List<AdminUser>> users() async => userList;
  @override
  Future<void> setUserBanned(String userId, bool banned) async {
    calls.add('ban:$userId:$banned');
    userList = [for (final u in userList) u.id == userId ? u.copyWith(banned: banned) : u];
  }

  @override
  Future<void> deleteUser(String userId) async {
    calls.add('deleteUser:$userId');
    userList = [
      for (final u in userList)
        if (u.id != userId) u,
    ];
  }

  @override
  Future<int> broadcast(String title, String body) async {
    calls.add('broadcast:$title');
    return userList.length;
  }

  @override
  Future<List<AdminTrip>> trips() async => tripList;
  @override
  Future<void> setTripFrozen(AdminTrip trip, bool frozen) async {
    calls.add('ground:${trip.id}:$frozen');
    tripList = [for (final t in tripList) t.id == trip.id ? t.copyWith(frozen: frozen) : t];
  }

  @override
  Future<void> setTripArchived(AdminTrip trip, bool archived) async {
    calls.add('archive:${trip.id}:$archived');
    tripList = [for (final t in tripList) t.id == trip.id ? t.copyWith(archived: archived) : t];
  }

  @override
  Future<void> deleteTrip(AdminTrip trip) async {
    calls.add('deleteTrip:${trip.id}');
    tripList = [
      for (final t in tripList)
        if (t.id != trip.id) t,
    ];
  }

  @override
  Future<List<FlagOverride>> flagOverrides() async => overrides;
  @override
  Future<void> setFlagOverride(String scope, String scopeId, String flagKey, bool? value) async {
    calls.add('flag:$scope:$scopeId:$flagKey:$value');
    overrides = [
      for (final o in overrides)
        if (!(o.scope == scope && o.scopeId == scopeId && o.flagKey == flagKey)) o,
      if (value != null) FlagOverride(scope: scope, scopeId: scopeId, flagKey: flagKey, value: value),
    ];
  }

  AdminConfig config = const AdminConfig({'join_max_attempts': 5});
  List<AuditEntry> audit = [
    AuditEntry(
      id: '1',
      action: 'ground_trip',
      tripId: 't1',
      details: const {'tripName': 'Goa Weekend'},
      createdAt: DateTime(2026, 10, 3),
    ),
    AuditEntry(
      id: '2',
      action: 'user_suspended',
      details: const {'targetEmail': 'asha@b.c'},
      createdAt: DateTime(2026, 10, 4),
    ),
  ];
  List<AdminFeature> featureList = const [
    AdminFeature(
      id: 'FEAT-1',
      title: 'Dark maps',
      description: 'Dark map tiles',
      category: 'ui-ux',
      status: 'requested',
    ),
    AdminFeature(id: 'FEAT-2', title: 'Offline export', description: '', category: 'sync', status: 'shipped'),
  ];
  int recycled = 4;
  bool pingOk = true;

  @override
  Future<AdminConfig> appConfig() async => config;
  @override
  Future<void> setAppConfig(String key, Object? value) async {
    calls.add('config:$key:$value');
    config = AdminConfig({...config.values, key: value});
  }

  @override
  Future<List<AuditEntry>> auditLogs({int limit = 200}) async => audit;
  @override
  Future<int> purgeAuditLogs(int olderThanDays) async {
    calls.add('purgeAudit:$olderThanDays');
    return 2;
  }

  @override
  Future<List<AdminFeature>> features() async => featureList;
  @override
  Future<String> createFeature({required String title, required String description, required String category}) async {
    calls.add('createFeature:$title:$category');
    featureList = [
      AdminFeature(id: 'FEAT-3', title: title, description: description, category: category, status: 'requested'),
      ...featureList,
    ];
    return 'FEAT-3';
  }

  @override
  Future<AdminFeature?> updateFeature(
    String id, {
    String? status,
    String? category,
    String? shippedNote,
    String? shippedBy,
    String? linkedFlagKey,
  }) async {
    calls.add('feature:$id:${status ?? '-'}:${shippedNote ?? '-'}');
    featureList = [
      for (final f in featureList)
        if (f.id == id)
          AdminFeature(
            id: f.id,
            title: f.title,
            description: f.description,
            category: category ?? f.category,
            status: status ?? f.status,
            shippedNote: shippedNote ?? f.shippedNote,
          )
        else
          f,
    ];
    return featureList.where((f) => f.id == id).firstOrNull;
  }

  @override
  Future<void> deleteFeature(String id) async {
    calls.add('deleteFeature:$id');
    featureList = [
      for (final f in featureList)
        if (f.id != id) f,
    ];
  }

  @override
  Future<NotificationStats> notificationStats() async => const NotificationStats(total: 40, read: 30, last7d: 12);
  @override
  Future<Map<String, int>> devicePlatformCounts() async => const {'android': 7, 'ios': 3};
  @override
  Future<List<RetentionCohort>> retentionCohorts({int weeks = 8}) async => const [
    RetentionCohort(week: '2026-09-28', size: 10, d1: (10, 6), d7: (10, 4), d30: (0, 0)),
  ];
  @override
  Future<({int eligible, int repeat})> repeatCreatorRate() async => (eligible: 8, repeat: 2);
  @override
  Future<List<ReliabilityGroup>> reliability({int days = 14}) async => [
    ReliabilityGroup('android', '3.54.0')
      ..openUsers = 20
      ..stuckUsers = 1
      ..failUsers = 2,
  ];

  FleetData fleetData = sampleFleet();

  @override
  Future<FleetData> fleet() async => fleetData;

  @override
  Future<int> recycledExpenseCount() async => recycled;
  @override
  Future<int> purgeRecycleBin(int olderThanDays) async {
    calls.add('purgeBin:$olderThanDays');
    final n = recycled;
    recycled = 0;
    return n;
  }

  @override
  Future<void> changePassword(String newPassword) async => calls.add('password:${newPassword.length}');
  @override
  Future<List<ServiceCheck>> pingServices() async => [
    ServiceCheck(name: 'Auth', ok: pingOk, ms: 120),
    const ServiceCheck(name: 'Database', ok: true, ms: 90),
    const ServiceCheck(name: 'Storage', ok: true, ms: 300),
  ];
}

/// Never touches the network: no destination has weather.
class FakeWeather implements WeatherService {
  @override
  Future<WeatherData?> getDestinationWeather(
    dynamic destination, {
    void Function(WeatherData fresh)? onLiveUpdate,
    bool forceRefresh = false,
  }) async => null;
}
