import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/auth/social_auth.dart';
import '../../../data/providers.dart';
import '../../../domain/repositories/repositories.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/brand_mark.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_surface.dart';
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
  bool _showAdmin = false;
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

  Future<void> _submitSuperadmin() async {
    final email = _email.text.trim();
    if (email.isEmpty || _password.text.isEmpty) {
      setState(() => _error = context.l10n.authErrorEmailRequired);
      return;
    }
    final repo = ref.read(authRepositoryProvider);
    await _run(() => repo.signInAsSuperadmin(email, _password.text));
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
    return AppScaffold(
      maxContentWidth: MediaQuery.sizeOf(context).width >= _kSplitBreakpoint ? null : 960,
      body: _splitOnWide(
        context,
        SafeArea(
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Center(child: BrandMark()),
                const SizedBox(height: 20),
                Text(
                  l10n.authWelcome,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: AppTypography.fontTitle,
                    fontSize: 30,
                    fontWeight: FontWeight.w800,
                    color: tokens.textPrimary,
                    letterSpacing: -0.9,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.authSubtitle,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 15, color: tokens.textSecondary),
                ),
                const SizedBox(height: 24),
                if (paused)
                  _Banner(key: const Key('paused-banner'), text: l10n.authSignInsPaused, color: tokens.warningColor),
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
                const SizedBox(height: 12),
                _SuperadminSection(
                  expanded: _showAdmin,
                  busy: _busy,
                  email: _email,
                  password: _password,
                  onToggle: () => setState(() {
                    _showAdmin = !_showAdmin;
                    _error = null;
                  }),
                  onSubmit: _submitSuperadmin,
                ),
                const SizedBox(height: 20),
                AppTextField(
                  controller: _code,
                  hint: l10n.authTripCodeHint,
                  textInputAction: TextInputAction.go,
                  onSubmitted: _goJoin,
                  prefixIcon: const Icon(Icons.confirmation_number_outlined),
                ),
                const SizedBox(height: 16),
                Text(
                  l10n.authLegal,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: tokens.textMuted, fontSize: 12),
                ),
                Wrap(
                  alignment: WrapAlignment.center,
                  children: [
                    TextButton(
                      onPressed: () => context.push('/terms'),
                      child: Text(l10n.authTerms, style: TextStyle(color: tokens.textMuted, fontSize: 12)),
                    ),
                    TextButton(
                      onPressed: () => context.push('/privacy'),
                      child: Text(l10n.authPrivacy, style: TextStyle(color: tokens.textMuted, fontSize: 12)),
                    ),
                  ],
                ),
              ],
            ),
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
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: color.withValues(alpha: 0.4)),
    ),
    child: Text(text, style: TextStyle(color: color, fontSize: 13, height: 1.4)),
  );
}

/// Collapsed by default so normal users only ever see Google; admins expand it.
class _SuperadminSection extends StatelessWidget {
  const _SuperadminSection({
    required this.expanded,
    required this.busy,
    required this.email,
    required this.password,
    required this.onToggle,
    required this.onSubmit,
  });

  final bool expanded;
  final bool busy;
  final TextEditingController email;
  final TextEditingController password;
  final VoidCallback onToggle;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: TextButton.icon(
            key: const Key('superadmin-toggle'),
            onPressed: busy ? null : onToggle,
            icon: Icon(
              expanded ? Icons.expand_less_rounded : Icons.admin_panel_settings_outlined,
              size: 18,
              color: tokens.textSecondary,
            ),
            label: Text(
              l10n.authSuperadminLogin,
              style: TextStyle(color: tokens.textSecondary, fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
        ),
        if (expanded)
          AppCard(
            key: const Key('superadmin-form'),
            child: AutofillGroup(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(l10n.authSuperadminHint, style: TextStyle(color: tokens.textSecondary, fontSize: 13)),
                  const SizedBox(height: 14),
                  AppTextField(
                    controller: email,
                    label: l10n.authEmail,
                    hint: l10n.authEmailHint,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    prefixIcon: const Icon(Icons.mail_outline_rounded),
                  ),
                  const SizedBox(height: 14),
                  AppTextField(
                    controller: password,
                    label: l10n.authPassword,
                    obscureText: true,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => onSubmit(),
                    prefixIcon: const Icon(Icons.lock_outline_rounded),
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () => context.push('/reset-password'),
                      child: Text(
                        l10n.authForgotPassword,
                        style: TextStyle(color: tokens.primaryAccent, fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  AppButton(
                    label: l10n.actionSignIn,
                    isLoading: busy,
                    isFullWidth: true,
                    onPressed: busy ? null : onSubmit,
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// Window width from which sign-in becomes a two-pane landing (board 08).
const double _kSplitBreakpoint = 1024;

/// Desktop landing: Night Sky pitch on the left, the sign-in form on the right.
Widget _splitOnWide(BuildContext context, Widget form) {
  if (MediaQuery.sizeOf(context).width < _kSplitBreakpoint) return form;
  return Row(
    children: [
      const Expanded(
        child: DecoratedBox(
          key: Key('login-hero'),
          decoration: BoxDecoration(gradient: AppTokens.nightSkyGradient),
          child: Padding(
            padding: EdgeInsets.all(56),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ponytail: English-only pitch until the ARB files are regenerated.
                Text(
                  'Plan it.\nSplit it.\nRemember it.',
                  style: TextStyle(fontSize: 56, height: 1.02, fontWeight: FontWeight.w800, color: Colors.white),
                ),
                SizedBox(height: 16),
                Text(
                  'The shared wallet for every trip with friends: expenses, passes and memories in one place.',
                  style: TextStyle(fontSize: 17, color: Colors.white70, height: 1.4),
                ),
              ],
            ),
          ),
        ),
      ),
      Expanded(
        child: Center(
          child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 460), child: form),
        ),
      ),
    ],
  );
}
