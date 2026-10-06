import 'app_logger.dart';

/// Pluggable crash reporting interface for telemetry and crash diagnostics.
abstract class CrashReporter {
  Future<void> recordError(
    dynamic error,
    StackTrace? stack, {
    String? reason,
    bool fatal = false,
  });

  Future<void> setUserIdentifier(String identifier);

  Future<void> clearUserIdentifier();

  Future<void> log(String message);
}

/// Default logger-backed crash reporter used during development and testing.
class LoggerCrashReporter implements CrashReporter {
  const LoggerCrashReporter();

  @override
  Future<void> recordError(
    dynamic error,
    StackTrace? stack, {
    String? reason,
    bool fatal = false,
  }) async {
    AppLogger.error(
      'CrashReported [fatal=$fatal] ${reason ?? ''}: $error',
      error,
      stack,
    );
  }

  @override
  Future<void> setUserIdentifier(String identifier) async {
    AppLogger.info('CrashReporter set user: $identifier');
  }

  @override
  Future<void> clearUserIdentifier() async {
    AppLogger.info('CrashReporter cleared user');
  }

  @override
  Future<void> log(String message) async {
    AppLogger.debug('CrashReporter breadcrumb: $message');
  }
}
