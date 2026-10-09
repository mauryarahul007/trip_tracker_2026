import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/account/presentation/delete_account_screen.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/auth/application/onboarding_state.dart';
import '../features/auth/presentation/onboarding_screen.dart';
import '../features/auth/presentation/reset_password_screen.dart';
import '../features/auth/presentation/splash_screen.dart';
import '../features/legal/presentation/privacy_screen.dart';
import '../features/notifications/presentation/notification_prefs_screen.dart';
import '../features/notifications/presentation/notifications_screen.dart';
import '../features/feedback/presentation/bug_report_screen.dart';
import '../features/feedback/presentation/diagnostics_screen.dart';
import '../features/feedback/presentation/feature_request_screen.dart';
import '../features/settings/presentation/flag_overrides_screen.dart';
import '../features/settings/presentation/settings_screen.dart';
import '../features/legal/presentation/terms_screen.dart';
import '../features/smoke_test/presentation/smoke_test_screen.dart';
import '../features/travel/presentation/live_screen.dart';
import '../features/chat/presentation/chat_pane.dart';
import '../features/expenses/presentation/expense_form_screen.dart';
import '../features/expenses/presentation/expenses_tab.dart';
import '../features/expenses/presentation/ledger_tab.dart';
import '../features/expenses/presentation/category_screen.dart';
import '../features/expenses/presentation/recycle_bin_screen.dart';
import '../features/expenses/presentation/spend_insights_screen.dart';
import '../features/members/presentation/members_tab.dart';
import '../features/notes/presentation/notes_tab.dart';
import '../features/trip_details/application/trip_nav.dart';
import '../features/trip_details/domain/trip_tabs.dart';
import '../features/trip_details/presentation/trip_settings_screen.dart';
import '../features/trip_details/presentation/trip_shell_screen.dart';
import '../features/trips/presentation/balances_screen.dart';
import '../features/trips/presentation/join_screen.dart';
import '../features/trips/presentation/share_screen.dart';
import '../features/trips/presentation/trips_screen.dart';
import '../features/admin/admin_home_screen.dart';
import '../features/admin/admin_mode.dart';
import 'auth_state.dart';

final routerKey = GlobalKey<NavigatorState>(debugLabel: 'root');

/// Only app-internal invite return paths are honoured (no open redirects).
String? _safeNext(String? next) => next != null && RegExp(r'^/join/[A-Za-z0-9._-]{3,64}$').hasMatch(next) ? next : null;

/// Locations reachable without a session.
bool _isPublic(String loc) =>
    loc == '/login' ||
    loc == '/reset-password' ||
    loc == '/privacy' ||
    loc == '/terms' ||
    loc.startsWith('/join') ||
    loc.startsWith('/share') ||
    loc.startsWith('/live');

final routerProvider = Provider<GoRouter>((ref) {
  // One router for the app's lifetime: auth changes re-run `redirect` via
  // the listenable instead of rebuilding (and resetting) the navigation stack.
  final refresh = ValueNotifier<int>(0);
  ref.listen(authStateProvider, (_, _) => refresh.value++);
  ref.listen(onboardedProvider, (_, _) => refresh.value++);
  ref.listen(adminModeProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    navigatorKey: routerKey,
    initialLocation: '/',
    refreshListenable: refresh,
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final auth = ref.read(authStateProvider);
      final loc = state.matchedLocation;

      if (auth.isLoading) return loc == '/splash' ? null : '/splash';
      if (loc == '/splash') return auth.isAuthenticated ? '/' : '/login';
      if (!auth.isAuthenticated && !_isPublic(loc)) return '/login';
      if (auth.isAuthenticated && ref.read(adminModeProvider)) return loc == '/admin' ? null : '/admin';
      if (auth.isAuthenticated) {
        // An invite flow finishes first; the intro carousel can wait.
        if (loc.startsWith('/join')) return null;
        final next = loc == '/login' ? _safeNext(state.uri.queryParameters['next']) : null;
        if (next != null) return next;
        final onboarded = ref.read(onboardedProvider);
        if (!onboarded) return loc == '/onboarding' ? null : '/onboarding';
        if (loc == '/onboarding' || loc == '/login') return '/';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/splash', name: 'splash', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/', name: 'trips', builder: (context, state) => const TripsScreen()),
      GoRoute(path: '/balances', name: 'balances', builder: (context, state) => const BalancesScreen()),
      GoRoute(path: '/onboarding', name: 'onboarding', builder: (context, state) => const OnboardingScreen()),
      GoRoute(path: '/admin', name: 'admin', builder: (context, state) => const AdminHomeScreen()),
      GoRoute(path: '/login', name: 'login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/reset-password',
        name: 'reset-password',
        builder: (context, state) => const ResetPasswordScreen(),
      ),
      GoRoute(path: '/privacy', name: 'privacy', builder: (context, state) => const PrivacyScreen()),
      GoRoute(path: '/terms', name: 'terms', builder: (context, state) => const TermsScreen()),
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
      // Everything under /trip/:id lives in one parent route, so each trip gets its
      // own shell (no tab state leaks between trips) and branch default
      // locations stay free of path parameters, which go_router requires.
      GoRoute(
        path: '/trip/:id',
        // Bare /trip/:id opens the first visible tab (Chat when chat-first nav is on).
        redirect: (context, state) {
          final id = state.pathParameters['id']!;
          final path = state.uri.path;
          if (path != '/trip/$id' && path != '/trip/$id/') return null;
          final tabs = ref.read(visibleTabsProvider(id));
          return '/trip/$id/${(tabs.isEmpty ? TripNavTab.expenses : tabs.first).name}';
        },
        routes: [
          StatefulShellRoute(
            builder: (context, state, shell) =>
                TripShellScreen(tripId: state.pathParameters['id']!, body: shell, navigationShell: shell),
            navigatorContainerBuilder: (context, shell, children) => TripTabPager(
              tripId: GoRouterState.of(context).pathParameters['id']!,
              navigationShell: shell,
              branches: children,
            ),
            // One branch per TripNavTab, same order as the enum (the pager maps by index).
            branches: [
              for (final tab in TripNavTab.values)
                StatefulShellBranch(
                  routes: [
                    GoRoute(
                      path: tab.name,
                      name: 'trip-${tab.name}',
                      builder: (context, state) => switch (tab) {
                        TripNavTab.chat => ChatPane(tripId: state.pathParameters['id']!),
                        TripNavTab.expenses => ExpensesTab(tripId: state.pathParameters['id']!),
                        TripNavTab.ledger => LedgerTab(tripId: state.pathParameters['id']!),
                        TripNavTab.members => MembersTab(tripId: state.pathParameters['id']!),
                        TripNavTab.notes => NotesTab(tripId: state.pathParameters['id']!),
                      },
                      routes: [
                        if (tab == TripNavTab.expenses) ...[
                          // Full-screen: must cover the tab bar, so they live on the root navigator.
                          GoRoute(
                            path: 'new',
                            parentNavigatorKey: routerKey,
                            builder: (context, state) => ExpenseFormScreen(tripId: state.pathParameters['id']!),
                          ),
                          GoRoute(
                            path: ':eid/edit',
                            parentNavigatorKey: routerKey,
                            builder: (context, state) => ExpenseFormScreen(
                              tripId: state.pathParameters['id']!,
                              expenseId: state.pathParameters['eid'],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
            ],
          ),
          GoRoute(
            path: 'recycle-bin',
            name: 'trip-recycle-bin',
            builder: (context, state) => RecycleBinScreen(tripId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'insights',
            name: 'trip-insights',
            builder: (context, state) => SpendInsightsScreen(tripId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'categories',
            name: 'trip-categories',
            builder: (context, state) => CategoryScreen(tripId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'settings',
            name: 'trip-settings',
            builder: (context, state) => TripSettingsScreen(tripId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/settings',
        name: 'settings',
        builder: (context, state) => const SettingsScreen(),
        routes: [
          GoRoute(path: 'notifications', builder: (context, state) => const NotificationPrefsScreen()),
          GoRoute(path: 'report-bug', builder: (context, state) => const BugReportScreen()),
          GoRoute(path: 'feature-request', builder: (context, state) => const FeatureRequestScreen()),
          GoRoute(path: 'diagnostics', builder: (context, state) => const DiagnosticsScreen()),
          GoRoute(path: 'flag-overrides', builder: (context, state) => const FlagOverridesScreen()),
        ],
      ),
      GoRoute(
        path: '/notifications',
        name: 'notifications',
        builder: (context, state) => NotificationsScreen(tripId: state.uri.queryParameters['trip']),
      ),
      GoRoute(path: '/smoke-test', name: 'smoke-test', builder: (context, state) => const SmokeTestScreen()),
    ],
  );
});
