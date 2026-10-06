import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../logging/app_logger.dart';

/// Global error boundary catching uncaught exceptions across zones,
/// framework callbacks, and rendering trees.
class ErrorBoundary extends StatefulWidget {
  const ErrorBoundary({super.key, required this.child, this.fallback});

  final Widget child;
  final Widget Function(FlutterErrorDetails details)? fallback;

  /// Global bootstrap helper for standalone apps.
  static void initialize(Widget app) {
    FlutterError.onError = (FlutterErrorDetails details) {
      FlutterError.presentError(details);
      AppLogger.error(
        'Uncaught Flutter Error: ${details.exceptionAsString()}',
        details.exception,
        details.stack,
      );
      _reportCrash(details.exception, details.stack);
    };

    PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
      AppLogger.error(
        'Uncaught Platform Dispatcher Error: $error',
        error,
        stack,
      );
      _reportCrash(error, stack);
      return true;
    };

    runZonedGuarded(() => runApp(app), (error, stack) {
      AppLogger.error('Uncaught Zone Error: $error', error, stack);
      _reportCrash(error, stack);
    });
  }

  static void _reportCrash(Object error, StackTrace? stack) {
    // Crash reporting hook: attaches to Firebase Crashlytics / Sentry in Phase 10
  }

  @override
  State<ErrorBoundary> createState() => _ErrorBoundaryState();
}

class _ErrorBoundaryState extends State<ErrorBoundary> {
  FlutterErrorDetails? _errorDetails;

  @override
  void initState() {
    super.initState();
    // Catch custom widget build errors locally if not in release
  }

  void _resetError() {
    setState(() {
      _errorDetails = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_errorDetails != null) {
      if (widget.fallback != null) {
        return widget.fallback!(_errorDetails!);
      }
      return _DefaultErrorView(details: _errorDetails!, onRetry: _resetError);
    }

    return widget.child;
  }
}

class _DefaultErrorView extends StatelessWidget {
  const _DefaultErrorView({required this.details, required this.onRetry});

  final FlutterErrorDetails details;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFF0F172A),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.warning_amber_rounded,
                color: Color(0xFFEF4444),
                size: 56,
              ),
              const SizedBox(height: 16),
              const Text(
                'Something went wrong',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                details.exceptionAsString(),
                textAlign: TextAlign.center,
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Try Again'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3B82F6),
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
