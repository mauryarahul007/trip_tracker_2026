import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/providers.dart';
import '../../../domain/repositories/repositories.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../application/auth_messages.dart';

/// Two modes: request a reset email, or (after opening the recovery deep
/// link, which signs the user into a recovery session) choose a new password.
class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  ConsumerState<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  StreamSubscription<bool>? _recoverySub;
  bool _recovering = false;
  bool _sent = false;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _recoverySub = ref.read(authRepositoryProvider).watchPasswordRecovery().listen((r) {
      if (mounted) setState(() => _recovering = r);
    });
  }

  @override
  void dispose() {
    _recoverySub?.cancel();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action, {void Function()? onOk}) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      if (mounted) setState(() => onOk?.call());
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = authErrorMessage(e.failure, context.l10n));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final repo = ref.read(authRepositoryProvider);

    final Widget body;
    if (_sent) {
      body = Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(AppIcons.check, size: 48, color: tokens.successColor),
            const SizedBox(height: 16),
            Text(
              l10n.resetCheckEmail,
              style: AppTypography.tripTitle(color: tokens.textPrimary, fontSize: 24),
            ),
            const SizedBox(height: 8),
            _FeedbackBanner(message: l10n.resetSentTo(_email.text.trim())),
            const SizedBox(height: 24),
            AppButton(label: l10n.actionBack, onPressed: () => context.canPop() ? context.pop() : context.go('/login')),
          ],
        ),
      );
    } else if (_recovering) {
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.resetNewPasswordTitle, style: AppTypography.tripTitle(color: tokens.textPrimary, fontSize: 24)),
          const SizedBox(height: 20),
          if (_error != null) ...[_FeedbackBanner(message: _error!, error: true), const SizedBox(height: 16)],
          // The field's own eye icon is the show / hide password toggle.
          AppTextField(
            controller: _password,
            label: l10n.resetNewPassword,
            obscureText: true,
            autofillHints: const [AutofillHints.newPassword],
          ),
          const SizedBox(height: 24),
          AppButton(
            label: l10n.resetSavePassword,
            isLoading: _busy,
            isFullWidth: true,
            onPressed: _busy
                ? null
                : () {
                    if (_password.text.length < 8) {
                      setState(() => _error = l10n.resetPasswordTooShort);
                      return;
                    }
                    _run(
                      () => repo.updatePassword(_password.text),
                      onOk: () {
                        _recovering = false;
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.resetPasswordUpdated)));
                        context.go('/');
                      },
                    );
                  },
          ),
        ],
      );
    } else {
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.resetRequestTitle, style: AppTypography.tripTitle(color: tokens.textPrimary, fontSize: 24)),
          const SizedBox(height: 8),
          Text(l10n.resetRequestSubtitle, style: TextStyle(fontSize: 14, color: tokens.textSecondary)),
          const SizedBox(height: 20),
          if (_error != null) ...[_FeedbackBanner(message: _error!, error: true), const SizedBox(height: 16)],
          AppTextField(
            controller: _email,
            label: l10n.authEmail,
            hint: l10n.authEmailHint,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
          ),
          const SizedBox(height: 24),
          AppButton(
            label: l10n.resetSendLink,
            isLoading: _busy,
            isFullWidth: true,
            onPressed: _busy
                ? null
                : () {
                    final email = _email.text.trim();
                    if (email.isEmpty) {
                      setState(() => _error = l10n.authErrorEmailRequired);
                      return;
                    }
                    _run(() => repo.resetPassword(email), onOk: () => _sent = true);
                  },
          ),
        ],
      );
    }

    return AppScaffold(
      appBar: AppBar(
        title: Text(l10n.authResetPassword),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.canPop() ? context.pop() : context.go('/login'),
        ),
      ),
      body: Padding(padding: const EdgeInsets.all(24), child: body),
    );
  }
}

/// Inline feedback under the screen title: red for a problem, green for good news. Replaces a lone SnackBar.
class _FeedbackBanner extends StatelessWidget {
  const _FeedbackBanner({required this.message, this.error = false});

  final String message;
  final bool error;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final color = error ? t.colorDanger : t.colorSuccess;
    return Semantics(
      liveRegion: true,
      container: true,
      child: Container(
        key: Key(error ? 'reset-banner-error' : 'reset-banner-success'),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(t.radiusSm + 4),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(error ? Icons.error_outline_rounded : Icons.check_circle_outline_rounded, size: 20, color: color),
            const SizedBox(width: 10),
            Expanded(
              child: Text(message, style: TextStyle(fontSize: 14, height: 1.3, color: t.textPrimary)),
            ),
          ],
        ),
      ),
    );
  }
}