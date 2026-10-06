import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../core/platform/haptics.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/app_lock_policy.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../application/app_lock.dart';

/// Locks once on cold start and again after [appLockTimeout] in the
/// background, when the user enabled the lock and the Ops Deck flag is on.
class AppLockGate extends ConsumerStatefulWidget {
  const AppLockGate({required this.child, this.now = DateTime.now, super.key});
  final Widget child;
  final DateTime Function() now;

  @override
  ConsumerState<AppLockGate> createState() => _AppLockGateState();
}

class _AppLockGateState extends ConsumerState<AppLockGate> with WidgetsBindingObserver {
  DateTime? _backgroundedAt;
  bool _coldChecked = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  bool get _active {
    final flag = ref.read(flagProvider(('enableBiometricAuth', null))).value ?? false;
    return flag && ref.read(biometricLockEnabledProvider) && ref.read(authStateProvider).isAuthenticated;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) _backgroundedAt = widget.now();
    if (state == AppLifecycleState.resumed) {
      if (shouldLockOnResume(enabled: _active, backgroundedAt: _backgroundedAt, now: widget.now())) {
        ref.read(appLockedProvider.notifier).lock();
      }
      _backgroundedAt = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final flag = ref.watch(flagProvider(('enableBiometricAuth', null)));
    final enabled = ref.watch(biometricLockEnabledProvider);
    final locked = ref.watch(appLockedProvider);

    if (!_coldChecked && auth.isAuthenticated && flag.hasValue) {
      _coldChecked = true;
      if ((flag.value ?? false) && enabled) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) ref.read(appLockedProvider.notifier).lock();
        });
      }
    }
    // Signing out clears the lock so the next account isn't blocked by it.
    if (!auth.isAuthenticated && locked) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) ref.read(appLockedProvider.notifier).unlockNow();
      });
    }

    return Stack(
      children: [
        Positioned.fill(child: widget.child),
        if (locked && auth.isAuthenticated) const Positioned.fill(child: AppLockOverlay()),
      ],
    );
  }
}

class AppLockOverlay extends ConsumerStatefulWidget {
  const AppLockOverlay({super.key});

  @override
  ConsumerState<AppLockOverlay> createState() => _AppLockOverlayState();
}

class _AppLockOverlayState extends ConsumerState<AppLockOverlay> {
  bool _verifying = false;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    // Auto-prompt once the overlay has settled, like the web's 200 ms pause.
    Future<void>.delayed(const Duration(milliseconds: 200), () {
      if (mounted) _unlock();
    });
  }

  Future<void> _unlock() async {
    if (_verifying) return;
    final reason = context.l10n.lockReason;
    setState(() {
      _verifying = true;
      _failed = false;
    });
    unawaited(AppHaptics.light());
    final ok = await ref.read(appLockedProvider.notifier).tryUnlock(reason);
    if (!mounted) return;
    unawaited(ok ? AppHaptics.success() : AppHaptics.heavy());
    setState(() {
      _verifying = false;
      _failed = !ok;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    return Material(
      color: const Color(0xFF0A0F1A),
      child: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 380),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Semantics(
                    button: true,
                    label: l10n.lockUnlock,
                    child: InkResponse(
                      onTap: _unlock,
                      radius: 52,
                      child: Container(
                        width: 84,
                        height: 84,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: tokens.primaryAccent),
                        child: const Icon(Icons.fingerprint, size: 44, color: Colors.white),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    l10n.lockTitle,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.lockSubtitle,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Color(0xB3FFFFFF), fontSize: 14),
                  ),
                  if (_failed) ...[
                    const SizedBox(height: 16),
                    Text(
                      l10n.lockFailed,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 13),
                    ),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _verifying ? null : _unlock,
                      child: Text(l10n.lockUnlock),
                    ),
                  ),
                  TextButton(
                    onPressed: () => ref.read(authRepositoryProvider).signOut(),
                    child: Text(l10n.actionSignOut, style: const TextStyle(color: Color(0xB3FFFFFF))),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
