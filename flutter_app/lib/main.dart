import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'features/notifications/presentation/notification_banner_host.dart';
import 'features/notifications/presentation/push_listener.dart';
import 'features/notifications/presentation/reminder_scheduler.dart';
import 'app/deep_link_listener.dart';
import 'core/platform/feedback.dart';
import 'core/platform/haptics.dart';
import 'core/platform/motion.dart';
import 'core/settings/app_settings.dart';
import 'core/version/version_gate.dart';
import 'core/flags/compass_flags.dart' show calmPassportProvider;
import 'data/providers.dart';
import 'app/router.dart';
import 'core/storage/prefs.dart';

import 'package:shared_preferences/shared_preferences.dart';

import 'features/auth/presentation/app_lock_gate.dart';
import 'app/sync_lifecycle.dart';
import 'core/env/app_env.dart';
import 'core/errors/error_boundary.dart';
import 'core/errors/tab_error_boundary.dart';
import 'core/logging/app_logger.dart';
import 'core/logging/crash_reporter.dart';
import 'core/telemetry/auto_bug_reporter.dart';
import 'data/supabase/supabase_gateway.dart';
import 'l10n/app_localizations.dart';
import 'shared/theme/app_theme.dart';

void main() {
  const crashReporter = ReportingCrashReporter();

  runZonedGuarded(
    () async {
      WidgetsFlutterBinding.ensureInitialized();
      // Receipt photos and map tiles can pile up in Flutter's default 100 MB image cache; cap it
      // (Phase 12.3) so a long session on a 2-3 GB phone does not grow without bound.
      PaintingBinding.instance.imageCache
        ..maximumSizeBytes = 64 << 20
        ..maximumSize = 150;

      installInPlaceErrorWidget(); // a tab that fails to build shows Retry in place, not a red screen

      // Forward Flutter framework UI errors to logger & crash reporter
      FlutterError.onError = (FlutterErrorDetails details) {
        FlutterError.presentError(details);
        AppLogger.error('FlutterError: ${details.exceptionAsString()}', details.exception, details.stack);
        crashReporter.recordError(details.exception, details.stack, reason: details.context?.toString());
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
        AppLogger.warn('No Supabase backend configured; running local-only (guest/demo).');
      }

      final prefs = await SharedPreferences.getInstance();
      runApp(
        ProviderScope(
          // Surface failures to the UI (explicit Retry buttons) instead of Riverpod 3's silent auto-retry.
          retry: (_, _) => null,
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            crashReporterProvider.overrideWithValue(crashReporter),
          ],
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
    final themeMode = themeModeFromPref(ref.watch(themeModePrefProvider));
    final amoled =
        ref.watch(amoledPrefProvider) && (ref.watch(flagProvider(('enableAmoledTheme', null))).value ?? false);
    // With the Haptics setting switched off by the Superadmin there is no switch, and haptics stay on.
    AppHaptics.level = (ref.watch(flagProvider(('enableHapticsSetting', null))).value ?? true)
        ? ref.watch(hapticsLevelPrefProvider)
        : HapticsLevel.all;
    final contrast =
        ref.watch(highContrastPrefProvider) && (ref.watch(flagProvider(('enableHighContrast', null))).value ?? true);
    AppFeedback.sound = ref.watch(soundFeedbackPrefProvider);
    AppFeedback.packOn = ref.watch(flagProvider(('enableFeedbackPack', null))).value ?? true;
    // Calm Passport colours are the one theme; the flag only picks the Calm layout (dock, 5-tab bar).
    final calm = ref.watch(calmPassportProvider);
    AppMotion.reduce =
        ref.watch(reduceMotionPrefProvider) && (ref.watch(flagProvider(('enableReduceMotion', null))).value ?? true);

    return MaterialApp.router(
      title: 'Trip Tracker',
      debugShowCheckedModeBanner: false,
      theme: contrast ? AppTheme.highContrastLight(calm: calm) : AppTheme.light(calm: calm),
      darkTheme: contrast
          ? AppTheme.highContrastDark(calm: calm)
          : (amoled ? AppTheme.amoled(calm: calm) : AppTheme.dark(calm: calm)),
      themeMode: themeMode,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      routerConfig: router,
      builder: (context, child) {
        return ErrorBoundary(
          child: DeepLinkListener(
            child: SyncLifecycle(
              child: VersionGateHost(
                child: AppLockGate(
                  child: PushListener(
                    child: ReminderScheduler(child: NotificationBannerHost(child: child ?? const SizedBox.shrink())),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
