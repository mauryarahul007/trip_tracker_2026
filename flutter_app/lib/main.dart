import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/deep_link_listener.dart';
import 'app/router.dart';
import 'core/storage/prefs.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'features/auth/presentation/app_lock_gate.dart';
import 'app/sync_lifecycle.dart';
import 'core/env/app_env.dart';
import 'core/errors/error_boundary.dart';
import 'core/logging/app_logger.dart';
import 'core/logging/crash_reporter.dart';
import 'data/supabase/supabase_gateway.dart';
import 'l10n/app_localizations.dart';
import 'shared/theme/app_theme.dart';

void main() {
  const crashReporter = LoggerCrashReporter();

  runZonedGuarded(
    () async {
      WidgetsFlutterBinding.ensureInitialized();

      // Forward Flutter framework UI errors to logger & crash reporter
      FlutterError.onError = (FlutterErrorDetails details) {
        FlutterError.presentError(details);
        AppLogger.error(
          'FlutterError: ${details.exceptionAsString()}',
          details.exception,
          details.stack,
        );
        crashReporter.recordError(
          details.exception,
          details.stack,
          reason: details.context?.toString(),
        );
      };

      // Bootstrap compile-time environment config
      final env = AppEnv.load();
      AppLogger.info('Starting ${env.appName} [Flavor: ${env.flavor.name}]');

      // Initialize Supabase gateway if configured
      if (env.hasBackend) {
        try {
          await AppSupabaseGateway.initialize(env);
        } catch (e, st) {
          AppLogger.error('Supabase initialization failed', e, st);
        }
      } else {
        AppLogger.warn(
          'No Supabase backend configured; running local-only (guest/demo).',
        );
      }

      final prefs = await SharedPreferences.getInstance();
      runApp(
        ProviderScope(
          // Surface failures to the UI (explicit Retry buttons) instead of Riverpod 3's silent auto-retry.
          retry: (_, _) => null,
          overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
          child: const TripTrackerApp(),
        ),
      );
    },
    (error, stack) {
      AppLogger.error('Unhandled zone error: $error', error, stack);
      crashReporter.recordError(error, stack, fatal: true);
    },
  );
}

class TripTrackerApp extends ConsumerWidget {
  const TripTrackerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Trip Tracker',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      routerConfig: router,
      builder: (context, child) {
        return ErrorBoundary(
          child: DeepLinkListener(
            child: SyncLifecycle(
              child: AppLockGate(child: child ?? const SizedBox.shrink()),
            ),
          ),
        );
      },
    );
  }
}
