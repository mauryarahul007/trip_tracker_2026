import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../logging/app_logger.dart';
import '../../shared/theme/app_colors.dart';

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
      AppLogger.error('Uncaught Flutter Error: ${details.exceptionAsString()}', details.exception, details.stack);
      _reportCrash(details.exception, details.stack);
    };

    PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
      AppLogger.error('Uncaught Platform Dispatcher Error: $error', error, stack);
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

class _DefaultErrorView extends StatefulWidget {
  const _DefaultErrorView({required this.details, required this.onRetry});

  final FlutterErrorDetails details;
  final VoidCallback onRetry;

  @override
  State<_DefaultErrorView> createState() => _DefaultErrorViewState();
}

class _DefaultErrorViewState extends State<_DefaultErrorView> {
  var _copied = false;

  Future<void> _copy() async {
    final text = '${widget.details.exceptionAsString()}\n${widget.details.stack ?? ''}';
    await Clipboard.setData(ClipboardData(text: text));
    if (mounted) setState(() => _copied = true);
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFF131417),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'This screen hit a problem',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              const Text(
                'Your trips and expenses are still on this device. Try again, or leave and come back if it keeps happening.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFFA3A6AD), fontSize: 15, height: 1.4),
              ),
              if (_copied) ...[
                const SizedBox(height: 12),
                const Text('Report copied', style: TextStyle(color: Color(0xFF16A34A), fontSize: 13)),
              ],
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: widget.onRetry,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accentOrange,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(44),
                ),
                child: const Text('Try again'),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: _copy,
                style: OutlinedButton.styleFrom(foregroundColor: Colors.white, minimumSize: const Size.fromHeight(44)),
                child: const Text('Copy report'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
