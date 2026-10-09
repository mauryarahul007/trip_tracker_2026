import 'dart:async';
import 'dart:convert';

import 'package:supabase_flutter/supabase_flutter.dart' as sb;

import '../../core/logging/app_logger.dart';
import '../../domain/repositories/repositories.dart';
import '../local/app_database.dart';

const _localSessionKey = 'auth.local_session';

/// Ids of accounts known to be superadmins, kept on this device so a cold start can drop their session
/// without a network call.
const _superadminIdsKey = 'auth.superadmin_ids';

/// Whether a session restored at cold start must be dropped because it belongs to a superadmin.
///
/// A superadmin credential is only ever used by signing in on purpose: the app never resumes it by itself, so
/// closing and reopening the app lands on the login page. A device-local list ([known]) answers offline; an
/// unknown account is asked once ([isSuperadmin]) and remembered through [remember]. If the question cannot be
/// answered (offline, error) the session is kept: dropping every offline traveller would be worse.
Future<bool> shouldDropRestoredSession({
  required String uid,
  required Set<String> known,
  required Future<bool> Function() isSuperadmin,
  required Future<void> Function(String uid) remember,
}) async {
  if (known.contains(uid)) return true;
  try {
    if (await isSuperadmin()) {
      await remember(uid);
      return true;
    }
  } catch (_) {
    // Cannot tell: keep the session.
  }
  return false;
}

/// Mirrors authStore.ts: real Supabase sessions plus local-only guest/demo
/// identities (never backed by a Supabase session). Superadmin is excluded.
class SupabaseAuthRepository implements AuthRepository {
  SupabaseAuthRepository(this._client, this._db, {this.unregisterPush, this.beforeWipe}) {
    final client = _client;
    if (client != null) {
      _sub = client.auth.onAuthStateChange.listen((s) {
        if (s.event == sb.AuthChangeEvent.passwordRecovery) _recovery.add(true);
        if (!_booted) return; // the restored session is vetted first (see _bootstrap)
        if (_local != null) return; // a local identity takes over until sign-out
        _emit(_fromSession(s.session));
      });
    }
    _restored = _bootstrap();
  }

  bool _booted = false;

  /// Cold start: drop a restored superadmin session, then publish whoever is still signed in.
  Future<void> _bootstrap() async {
    try {
      await _dropRestoredSuperadmin();
    } catch (e) {
      AppLogger.warn('Superadmin session check failed: $e');
    }
    _booted = true;
    final client = _client;
    if (client != null) _emit(_fromSession(client.auth.currentSession));
    await _restoreLocal();
  }

  Future<Set<String>> _knownSuperadmins() async {
    final row = await (_db.select(
      _db.settingsKvTable,
    )..where((t) => t.key.equals(_superadminIdsKey))).getSingleOrNull();
    if (row == null) return {};
    try {
      return {for (final e in jsonDecode(row.value) as List<dynamic>) '$e'};
    } catch (_) {
      return {};
    }
  }

  Future<void> _rememberSuperadmin(String uid) async {
    final all = {...await _knownSuperadmins(), uid};
    await _db
        .into(_db.settingsKvTable)
        .insertOnConflictUpdate(
          SettingsKvTableCompanion.insert(key: _superadminIdsKey, value: jsonEncode(all.toList())),
        );
  }

  Future<void> _dropRestoredSuperadmin() async {
    final client = _client;
    final uid = client?.auth.currentSession?.user.id;
    if (client == null || uid == null) return;
    final drop = await shouldDropRestoredSession(
      uid: uid,
      known: await _knownSuperadmins(),
      isSuperadmin: () async => await client.rpc<dynamic>('is_superadmin') == true,
      remember: _rememberSuperadmin,
    );
    if (!drop) return;
    AppLogger.warn('Dropping a restored superadmin session: superadmins sign in on purpose.');
    try {
      await unregisterPush?.call(uid);
    } catch (_) {}
    await _wipeLocal(); // the superadmin saw every trip; none of that stays on the device
    try {
      await client.auth.signOut();
    } catch (_) {}
  }

  /// Null when no backend is configured: only guest/demo work.
  final sb.SupabaseClient? _client;
  final AppDatabase _db;

  /// Unregister this device's push token (Phase 10 supplies the real one).
  final Future<void> Function(String userId)? unregisterPush;

  /// Last chance to flush unsynced work before local data is wiped.
  final Future<void> Function()? beforeWipe;

  final _controller = StreamController<AuthUser?>.broadcast();
  final _recovery = StreamController<bool>.broadcast();
  StreamSubscription<sb.AuthState>? _sub;
  late final Future<void> _restored;
  AuthUser? _current;
  AuthUser? _local;

  @override
  AuthUser? get currentUser => _current;

  @override
  Future<AuthTokens?> sessionTokens() async {
    try {
      // Refresh first so the web app receives an access token with a full lifetime.
      final session = (await _api.auth.refreshSession()).session ?? _api.auth.currentSession;
      final refresh = session?.refreshToken;
      if (session == null || refresh == null) return null;
      return AuthTokens(accessToken: session.accessToken, refreshToken: refresh, expiresIn: session.expiresIn ?? 3600);
    } catch (_) {
      return null;
    }
  }

  @override
  Stream<AuthUser?> watchUser() async* {
    await _restored; // no flash of the login screen for a returning guest
    yield _current;
    yield* _controller.stream;
  }

  void _emit(AuthUser? u) {
    _current = u;
    _controller.add(u);
  }

  AuthUser? _fromSession(sb.Session? s) {
    final u = s?.user;
    if (u == null) return null;
    final meta = u.userMetadata ?? const {};
    final name = (meta['full_name'] ?? meta['name']) as String? ?? u.email?.split('@').first;
    final provider = u.appMetadata['provider'] as String? ?? 'email';
    return AuthUser(id: u.id, email: u.email, displayName: name, provider: provider);
  }

  Future<void> _restoreLocal() async {
    final row = await (_db.select(_db.settingsKvTable)..where((t) => t.key.equals(_localSessionKey))).getSingleOrNull();
    if (row == null) return;
    final m = jsonDecode(row.value) as Map<String, dynamic>;
    _local = AuthUser(
      id: m['id'] as String,
      displayName: m['name'] as String?,
      email: m['email'] as String?,
      provider: m['provider'] as String,
    );
    _emit(_local);
  }

  Future<void> _setLocal(AuthUser u) async {
    _local = u;
    await _db
        .into(_db.settingsKvTable)
        .insertOnConflictUpdate(
          SettingsKvTableCompanion.insert(
            key: _localSessionKey,
            value: jsonEncode({'id': u.id, 'name': u.displayName, 'email': u.email, 'provider': u.provider}),
          ),
        );
    _emit(u);
  }

  @override
  Future<bool> signInsPaused() async {
    final client = _client;
    if (client == null) return false;
    try {
      return await client.rpc<dynamic>('get_app_flag', params: {'p_key': 'signup_gate'}) == true;
    } catch (_) {
      return false; // fail open: a gate lookup failure must not lock everyone out
    }
  }

  sb.SupabaseClient get _api {
    final c = _client;
    if (c == null) throw const AuthException(AuthFailure.network, 'No backend configured.');
    return c;
  }

  Future<void> _guarded(Future<void> Function() body) async {
    try {
      await body();
    } on sb.AuthException catch (e) {
      final m = e.message.toLowerCase();
      // Transport errors arrive wrapped as AuthRetryableFetchException.
      final failure = e is sb.AuthRetryableFetchException || m.contains('socket') || m.contains('connection')
          ? AuthFailure.network
          : m.contains('banned')
          ? AuthFailure.banned
          : m.contains('invalid')
          ? AuthFailure.invalidCredentials
          : AuthFailure.unknown;
      throw AuthException(failure, e.message);
    } on AuthException {
      rethrow;
    } catch (e) {
      throw AuthException(AuthFailure.network, '$e');
    }
  }

  Future<void> _requireOpen() async {
    if (await signInsPaused()) throw const AuthException(AuthFailure.signInsPaused, 'Sign-ins are paused.');
  }

  @override
  Future<void> signInWithEmail(String email, String password) => _guarded(() async {
    await _api.auth.signInWithPassword(email: email, password: password);
  });

  @override
  Future<void> signInAsSuperadmin(String email, String password) => _guarded(() async {
    await _api.auth.signInWithPassword(email: email, password: password);
    var isSuper = false;
    try {
      isSuper = await _api.rpc<dynamic>('is_superadmin') == true;
    } catch (_) {
      isSuper = false; // fail closed: if we cannot prove it, they are not a superadmin
    }
    if (!isSuper) {
      await signOut();
      throw const AuthException(AuthFailure.notSuperadmin, 'Not a superadmin account.');
    }
    final uid = _api.auth.currentUser?.id;
    if (uid != null) await _rememberSuperadmin(uid); // so the next cold start drops this session without asking
  });

  @override
  Future<void> signUpWithEmail(String email, String password, {String? displayName}) => _guarded(() async {
    await _requireOpen();
    await _api.auth.signUp(email: email, password: password, data: {'full_name': ?displayName});
  });

  @override
  Future<void> resetPassword(String email) => _guarded(() => _api.auth.resetPasswordForEmail(email));

  @override
  Stream<bool> watchPasswordRecovery() => _recovery.stream;

  @override
  Future<void> updatePassword(String newPassword) => _guarded(() async {
    await _api.auth.updateUser(sb.UserAttributes(password: newPassword));
    _recovery.add(false);
  });

  @override
  Future<void> signInWithGoogleIdToken(String idToken, {String? nonce}) => _guarded(() async {
    await _requireOpen();
    await _api.auth.signInWithIdToken(provider: sb.OAuthProvider.google, idToken: idToken, nonce: nonce);
  });

  @override
  Future<void> signInWithGoogleOAuth({required String redirectTo}) => _guarded(() async {
    await _requireOpen();
    await _api.auth.signInWithOAuth(sb.OAuthProvider.google, redirectTo: redirectTo);
  });

  @override
  Future<void> signInWithAppleIdToken(String idToken, {String? nonce, String? fullName}) => _guarded(() async {
    await _requireOpen();
    await _api.auth.signInWithIdToken(provider: sb.OAuthProvider.apple, idToken: idToken, nonce: nonce);
    // Apple sends the name only on first authorization (AUTH_SETUP §2).
    if (fullName != null && fullName.trim().isNotEmpty) {
      await _api.auth.updateUser(sb.UserAttributes(data: {'full_name': fullName.trim()}));
    }
  });

  @override
  Future<void> signInAsGuest({String displayName = 'Traveler'}) =>
      _setLocal(AuthUser(id: 'guest-traveler-user-id', displayName: displayName, provider: 'guest'));

  @override
  Future<void> signInAsDemo() => _setLocal(
    const AuthUser(
      id: 'demo-user',
      displayName: 'Demo Traveler',
      email: 'traveler@triptracker.local',
      provider: 'demo',
    ),
  );

  Future<void> _wipeLocal() async {
    try {
      await beforeWipe?.call();
    } catch (e) {
      AppLogger.warn('beforeWipe failed: $e');
    }
    await _db.transaction(() async {
      for (final t in _db.allTables) {
        await _db.delete(t).go();
      }
    });
    _local = null;
  }

  @override
  Future<void> updateDisplayName(String name) async {
    final u = _current;
    final clean = name.trim();
    if (u == null || clean.isEmpty) return;
    if (u.isLocalOnly) {
      await _setLocal(AuthUser(id: u.id, displayName: clean, email: u.email, provider: u.provider));
      return;
    }
    await _guarded(() async {
      await _api.auth.updateUser(sb.UserAttributes(data: {'full_name': clean}));
      await _api.from('profiles').update({'display_name': clean}).eq('id', u.id);
    });
    _emit(AuthUser(id: u.id, email: u.email, displayName: clean, provider: u.provider));
  }

  @override
  Future<void> signOut() async {
    final u = _current;
    if (u != null && !u.isLocalOnly) {
      try {
        await unregisterPush?.call(u.id);
      } catch (e) {
        AppLogger.warn('Push unregister failed: $e');
      }
    }
    await _wipeLocal();
    try {
      await _client?.auth.signOut();
    } catch (_) {
      // Offline sign-out: local session is cleared by the SDK regardless.
    }
    _emit(null);
  }

  @override
  Future<void> deleteAccount() async {
    final u = _current;
    if (u == null || u.isLocalOnly) return signOut();
    await _guarded(() async {
      await _api.rpc<dynamic>('delete_own_account');
    });
    await signOut();
  }

  Future<void> dispose() async {
    await _sub?.cancel();
    await _controller.close();
    await _recovery.close();
  }
}
