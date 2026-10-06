import 'dart:developer' as dev;

enum LogLevel { debug, info, warning, error }

class AppLogger {
  static void log(
    String message, {
    LogLevel level = LogLevel.info,
    Object? error,
    StackTrace? stackTrace,
  }) {
    final prefix = switch (level) {
      LogLevel.debug => '🔍 [DEBUG]',
      LogLevel.info => 'ℹ️ [INFO]',
      LogLevel.warning => '⚠️ [WARN]',
      LogLevel.error => '🚨 [ERROR]',
    };

    dev.log(
      '$prefix $message',
      time: DateTime.now(),
      level: switch (level) {
        LogLevel.debug => 500,
        LogLevel.info => 800,
        LogLevel.warning => 900,
        LogLevel.error => 1000,
      },
      error: error,
      stackTrace: stackTrace,
    );
  }

  static void debug(String message) => log(message, level: LogLevel.debug);
  static void info(String message) => log(message, level: LogLevel.info);
  static void warning(String message, [Object? error]) =>
      log(message, level: LogLevel.warning, error: error);
  static void warn(String message, [Object? error]) => warning(message, error);
  static void error(String message, [Object? error, StackTrace? stackTrace]) =>
      log(message, level: LogLevel.error, error: error, stackTrace: stackTrace);
}
