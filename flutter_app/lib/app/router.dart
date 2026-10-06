import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/account/presentation/delete_account_screen.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/auth/presentation/reset_password_screen.dart';
import '../features/legal/presentation/privacy_screen.dart';
import '../features/legal/presentation/terms_screen.dart';
import '../features/smoke_test/presentation/smoke_test_screen.dart';
import '../features/travel/presentation/live_screen.dart';
import '../features/trip_details/presentation/trip_shell_screen.dart';
import '../features/trips/presentation/join_screen.dart';
import '../features/trips/presentation/share_screen.dart';
import '../features/trips/presentation/trips_screen.dart';
import 'auth_state.dart';

final routerKey = GlobalKey<NavigatorState>(debugLabel: 'root');

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    navigatorKey: routerKey,
    initialLocation: '/',
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final isLoggingIn = state.matchedLocation == '/login';
      final isResetting = state.matchedLocation == '/reset-password';
      final isPrivacy = state.matchedLocation == '/privacy';
      final isTerms = state.matchedLocation == '/terms';
      final isJoin = state.matchedLocation.startsWith('/join');
      final isPublic =
          isLoggingIn || isResetting || isPrivacy || isTerms || isJoin;

      if (!authState.isAuthenticated && !isPublic) {
        return '/login';
      }

      if (authState.isAuthenticated && isLoggingIn) {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        name: 'trips',
        builder: (context, state) => const TripsScreen(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/reset-password',
        name: 'reset-password',
        builder: (context, state) => const ResetPasswordScreen(),
      ),
      GoRoute(
        path: '/privacy',
        name: 'privacy',
        builder: (context, state) => const PrivacyScreen(),
      ),
      GoRoute(
        path: '/terms',
        name: 'terms',
        builder: (context, state) => const TermsScreen(),
      ),
      GoRoute(
        path: '/delete-account',
        name: 'delete-account',
        builder: (context, state) => const DeleteAccountScreen(),
      ),
      GoRoute(
        path: '/join/:code',
        name: 'join',
        builder: (context, state) {
          final code = state.pathParameters['code'] ?? '';
          return JoinScreen(inviteCode: code);
        },
      ),
      GoRoute(
        path: '/live/:token',
        name: 'live',
        builder: (context, state) {
          final token = state.pathParameters['token'] ?? '';
          return LiveScreen(token: token);
        },
      ),
      GoRoute(
        path: '/share/:token',
        name: 'share',
        builder: (context, state) {
          final token = state.pathParameters['token'] ?? '';
          return ShareScreen(token: token);
        },
      ),
      GoRoute(
        path: '/trip/:id/:tab',
        name: 'trip-tab',
        builder: (context, state) {
          final tripId = state.pathParameters['id'] ?? '';
          final tab = state.pathParameters['tab'] ?? 'expenses';
          return TripShellScreen(tripId: tripId, currentTab: tab);
        },
      ),
      GoRoute(
        path: '/smoke-test',
        name: 'smoke-test',
        builder: (context, state) => const SmokeTestScreen(),
      ),
    ],
  );
});
