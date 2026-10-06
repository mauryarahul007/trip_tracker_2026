import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Represents the global authentication state of the application.
class AuthState {
  const AuthState({
    required this.isAuthenticated,
    required this.isLoading,
    this.userId,
    this.userEmail,
  });

  final bool isAuthenticated;
  final bool isLoading;
  final String? userId;
  final String? userEmail;

  factory AuthState.initial() => const AuthState(
    isAuthenticated: true, // Stubbed as true for Phase 2 navigation testing
    isLoading: false,
    userId: 'stub-user-id',
    userEmail: 'pilot@triptracker.app',
  );

  factory AuthState.unauthenticated() =>
      const AuthState(isAuthenticated: false, isLoading: false);

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    String? userId,
    String? userEmail,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      userId: userId ?? this.userId,
      userEmail: userEmail ?? this.userEmail,
    );
  }
}

/// Notifier managing authentication state transitions.
class AuthStateNotifier extends Notifier<AuthState> {
  @override
  AuthState build() => AuthState.initial();

  void setAuthenticated({required String userId, required String email}) {
    state = AuthState(
      isAuthenticated: true,
      isLoading: false,
      userId: userId,
      userEmail: email,
    );
  }

  void signOut() {
    state = AuthState.unauthenticated();
  }
}

final authStateProvider = NotifierProvider<AuthStateNotifier, AuthState>(
  () => AuthStateNotifier(),
);
