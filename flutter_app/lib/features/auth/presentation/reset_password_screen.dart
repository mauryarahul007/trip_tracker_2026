import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/providers.dart';
import '../../../domain/repositories/repositories.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
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
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: tokens.textPrimary),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.resetSentTo(_email.text.trim()),
              textAlign: TextAlign.center,
              style: TextStyle(color: tokens.textSecondary),
            ),
            const SizedBox(height: 24),
            AppButton(label: l10n.actionBack, onPressed: () => context.canPop() ? context.pop() : context.go('/login')),
          ],
        ),
      );
    } else if (_recovering) {
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.resetNewPasswordTitle,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: tokens.textPrimary),
          ),
          const SizedBox(height: 24),
          AppTextField(controller: _password, label: l10n.resetNewPassword, obscureText: true, errorText: _error),
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
          Text(l10n.resetRequestSubtitle, style: TextStyle(fontSize: 14, color: tokens.textSecondary)),
          const SizedBox(height: 24),
          AppTextField(
            controller: _email,
            label: l10n.authEmail,
            hint: l10n.authEmailHint,
            keyboardType: TextInputType.emailAddress,
            errorText: _error,
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
