import 'dart:collection';
import 'dart:developer' as dev;

import '../../domain/logic/pii_scrub.dart';

enum LogLevel { debug, info, warning, error }

class AppLogger {
  static const _keep = 200;
  static final Queue<String> _recent = Queue<String>();

  /// Last ~200 lines, already scrubbed of emails, tokens and phone numbers. Safe to attach
  /// to a bug report or share from Diagnostics.
  static List<String> get recent => List.unmodifiable(_recent);

  static void log(String message, {LogLevel level = LogLevel.info, Object? error, StackTrace? stackTrace}) {
    final prefix = switch (level) {
      LogLevel.debug => '🔍 [DEBUG]',
      LogLevel.info => 'ℹ️ [INFO]',
      LogLevel.warning => '⚠️ [WARN]',
      LogLevel.error => '🚨 [ERROR]',
    };

    _recent.addLast(scrubPii('${DateTime.now().toIso8601String()} $prefix $message'));
    if (_recent.length > _keep) _recent.removeFirst();

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
  static void warning(String message, [Object? error]) => log(message, level: LogLevel.warning, error: error);
  static void warn(String message, [Object? error]) => warning(message, error);
  static void error(String message, [Object? error, StackTrace? stackTrace]) =>
      log(message, level: LogLevel.error, error: error, stackTrace: stackTrace);
}
