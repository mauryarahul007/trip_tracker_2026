import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/router.dart';
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
      if (env.supabaseUrl.isNotEmpty) {
        try {
          await AppSupabaseGateway.initialize(env);
        } catch (e, st) {
          AppLogger.error('Supabase initialization failed', e, st);
        }
      } else {
        AppLogger.warn(
          'Supabase URL not provided; running with mock/offline defaults.',
        );
      }

      runApp(const ProviderScope(child: TripTrackerApp()));
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
        return ErrorBoundary(child: child ?? const SizedBox.shrink());
      },
    );
  }
}
