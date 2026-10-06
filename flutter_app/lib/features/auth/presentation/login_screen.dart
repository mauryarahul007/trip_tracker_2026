import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/env/app_env.dart';
import '../../../data/auth/social_auth.dart';
import '../../../data/providers.dart';
import '../../../domain/repositories/repositories.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../application/auth_messages.dart';
import '../application/social_sign_in.dart';

/// Whether the superadmin "signup_gate" is closing new sign-ins.
final signInsPausedProvider = FutureProvider.autoDispose<bool>(
  (ref) => ref.watch(authRepositoryProvider).signInsPaused(),
);

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _code = TextEditingController();
  bool _signUp = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _code.dispose();
    super.dispose();
  }

  /// Runs an auth action: spinner, error banner, and nothing on success
  /// because the router redirects once the session exists.
  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = authErrorMessage(e.failure, context.l10n));
    } catch (_) {
      if (mounted) setState(() => _error = context.l10n.authErrorGeneric);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submitEmail() async {
    final email = _email.text.trim();
    if (email.isEmpty || _password.text.isEmpty) {
      setState(() => _error = context.l10n.authErrorEmailRequired);
      return;
    }
    final repo = ref.read(authRepositoryProvider);
    await _run(() => _signUp ? repo.signUpWithEmail(email, _password.text) : repo.signInWithEmail(email, _password.text));
  }

  Future<void> _google() => _run(() => signInWithGoogle(ref));

  Future<void> _apple() => _run(() => signInWithApple(ref));

  void _goJoin(String raw) {
    final code = raw.trim().toUpperCase();
    if (code.length == 6) context.go('/join/$code');
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final paused = ref.watch(signInsPausedProvider).value ?? false;
    final apple = ref.watch(socialAuthProvider).appleAvailable;
    final repo = ref.read(authRepositoryProvider);

    return AppScaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(color: tokens.primaryAccent.withValues(alpha: 0.15), shape: BoxShape.circle),
                  child: Icon(AppIcons.expenses, size: 36, color: tokens.primaryAccent),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                l10n.authWelcome,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: tokens.textPrimary, letterSpacing: -0.5),
              ),
              const SizedBox(height: 8),
              Text(l10n.authSubtitle, textAlign: TextAlign.center, style: TextStyle(fontSize: 15, color: tokens.textSecondary)),
              const SizedBox(height: 24),
              if (paused) _Banner(key: const Key('paused-banner'), text: l10n.authSignInsPaused, color: tokens.warningColor),
              if (_error != null) _Banner(key: const Key('error-banner'), text: _error!, color: tokens.colorDanger),
              AppButton(
                label: l10n.authContinueGoogle,
                icon: Icons.g_mobiledata_rounded,
                variant: AppButtonVariant.secondary,
                isFullWidth: true,
                onPressed: (paused || _busy) ? null : _google,
              ),
              if (apple) ...[
                const SizedBox(height: 12),
                AppButton(
                  label: l10n.authContinueApple,
                  icon: Icons.apple,
                  variant: AppButtonVariant.secondary,
                  isFullWidth: true,
                  onPressed: (paused || _busy) ? null : _apple,
                ),
              ],
              const SizedBox(height: 20),
              Row(children: [
                Expanded(child: Divider(color: tokens.borderColor)),
                Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Text(l10n.authOr, style: TextStyle(color: tokens.textMuted))),
                Expanded(child: Divider(color: tokens.borderColor)),
              ]),
              const SizedBox(height: 20),
              AutofillGroup(
                child: Column(children: [
                  AppTextField(
                    controller: _email,
                    label: l10n.authEmail,
                    hint: l10n.authEmailHint,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    prefixIcon: const Icon(Icons.mail_outline_rounded),
                  ),
                  const SizedBox(height: 16),
                  AppTextField(
                    controller: _password,
                    label: l10n.authPassword,
                    obscureText: true,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _submitEmail(),
                    prefixIcon: const Icon(Icons.lock_outline_rounded),
                  ),
                ]),
              ),
              if (!_signUp)
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => context.push('/reset-password'),
                    child: Text(l10n.authForgotPassword, style: TextStyle(color: tokens.primaryAccent, fontSize: 13, fontWeight: FontWeight.w600)),
                  ),
                )
              else
                const SizedBox(height: 12),
              AppButton(
                label: _signUp ? l10n.authSignUp : l10n.actionSignIn,
                isLoading: _busy,
                isFullWidth: true,
                onPressed: (_busy || (_signUp && paused)) ? null : _submitEmail,
              ),
              TextButton(
                onPressed: () => setState(() {
                  _signUp = !_signUp;
                  _error = null;
                }),
                child: Text(_signUp ? l10n.authToggleToSignIn : l10n.authToggleToSignUp),
              ),
              const SizedBox(height: 8),
              Wrap(alignment: WrapAlignment.center, children: [
                TextButton(onPressed: _busy ? null : () => repo.signInAsGuest(), child: Text(l10n.authGuest)),
                if (!AppEnv.current.isProd)
                  TextButton(onPressed: _busy ? null : () => repo.signInAsDemo(), child: Text(l10n.authDemo)),
              ]),
              const SizedBox(height: 8),
              AppTextField(
                controller: _code,
                hint: l10n.authTripCodeHint,
                textInputAction: TextInputAction.go,
                onSubmitted: _goJoin,
                prefixIcon: const Icon(Icons.confirmation_number_outlined),
              ),
              const SizedBox(height: 16),
              Text(l10n.authLegal, textAlign: TextAlign.center, style: TextStyle(color: tokens.textMuted, fontSize: 12)),
              Wrap(alignment: WrapAlignment.center, children: [
                TextButton(onPressed: () => context.push('/terms'), child: Text(l10n.authTerms, style: TextStyle(color: tokens.textMuted, fontSize: 12))),
                TextButton(onPressed: () => context.push('/privacy'), child: Text(l10n.authPrivacy, style: TextStyle(color: tokens.textMuted, fontSize: 12))),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.text, required this.color, super.key});
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withValues(alpha: 0.4))),
        child: Text(text, style: TextStyle(color: color, fontSize: 13, height: 1.4)),
      );
}
