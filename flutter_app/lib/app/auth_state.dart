import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/providers.dart';
import '../domain/repositories/repositories.dart';

/// Live session from the auth repository (Supabase, or a local guest/demo).
final sessionProvider = StreamProvider<AuthUser?>((ref) => ref.watch(authRepositoryProvider).watchUser());

/// What the router and screens need to know about the session.
class AuthState {
  const AuthState({required this.isAuthenticated, required this.isLoading, this.user});

  final bool isAuthenticated;
  final bool isLoading;
  final AuthUser? user;

  String? get userId => user?.id;
  String? get userEmail => user?.email;

  /// Guest/demo identities have no Supabase session, so nothing syncs.
  bool get isLocalOnly => user?.isLocalOnly ?? false;

  const AuthState.loading() : this(isAuthenticated: false, isLoading: true);
  const AuthState.unauthenticated() : this(isAuthenticated: false, isLoading: false);
  AuthState.signedIn(AuthUser u) : this(isAuthenticated: true, isLoading: false, user: u);
}

final authStateProvider = Provider<AuthState>((ref) {
  return ref
      .watch(sessionProvider)
      .when(
        data: (u) => u == null ? const AuthState.unauthenticated() : AuthState.signedIn(u),
        loading: () => const AuthState.loading(),
        error: (_, _) => const AuthState.unauthenticated(),
      );
});
