import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/auth/social_auth.dart';
import '../../../data/providers.dart';
import '../../../domain/repositories/repositories.dart';
import '../../../l10n/l10n_ext.dart';
import '../../admin/admin_mode.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/bento_tile.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_surface.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../application/auth_messages.dart';
import '../application/social_sign_in.dart';
import '../../../shared/theme/app_theme.dart';
import '../../expenses/presentation/widgets/settle_ticket.dart' show TicketBarcode;
import 'boarding_login_widgets.dart';

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

  /// Debug builds only: the raw exception, so a misconfigured OAuth client is diagnosable on-device.
  String? _detail;

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
      _detail = null;
    });
    try {
      await action();
    } on AuthException catch (e) {
      if (mounted) {
        setState(() {
          _error = authErrorMessage(e.failure, context.l10n);
          _detail = kDebugMode ? '$e' : null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = context.l10n.authErrorGeneric;
          _detail = kDebugMode ? '$e' : null;
        });
      }
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
    // Admin mode goes on BEFORE the sign-in: once the session exists the router leaves this screen,
    // which disposes it, so anything after the await could no longer touch `ref`.
    final adminMode = ref.read(adminModeProvider.notifier)..set(true);
    await _run(() async {
      try {
        await repo.signInAsSuperadmin(email, _password.text);
      } catch (_) {
        adminMode.set(false);
        rethrow;
      }
    });
  }

  Future<void> _google() => _run(() => signInWithGoogle(ref));

  Future<void> _apple() => _run(() => signInWithApple(ref));

  void _goJoin(String raw) {
    final code = raw.trim().toUpperCase();
    if (code.length == 6) context.go('/join/$code');
  }

  /// The boarding-gate login: day's destination photo above, a torn-ticket sheet below with the boarding
  /// actions. Same sign-in, join-by-code and staff paths as the classic layout.
  Widget _buildBoarding(BuildContext context, {required bool paused, required bool apple}) {
    final l10n = context.l10n;
    const white = Colors.white;
    Widget chip(IconData icon, String label) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1B2E).withValues(alpha: 0.62),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: Colors.white.withValues(alpha: 0.16)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: const Color(0xFFFFC857)),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: white, fontSize: 12.5, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
    final hero = SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 36, 24, 24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
              decoration: BoxDecoration(
                color: const Color(0xFF0B1B2E).withValues(alpha: 0.62),
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: Colors.white.withValues(alpha: 0.16)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.wb_sunny_rounded, size: 14, color: Color(0xFFFFC857)),
                  const SizedBox(width: 7),
                  Flexible(
                    child: Text(
                      l10n.loginEdition.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontFamily: AppTypography.fontMono,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.4,
                        color: Color(0xFF7EE0D0),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Trip Tracker',
              key: Key('boarding-title'),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: AppTypography.fontSerif,
                fontSize: 44,
                fontWeight: FontWeight.w800,
                height: 1.05,
                color: white,
                shadows: [Shadow(color: Color(0x66000000), blurRadius: 16)],
              ),
            ),
            const SizedBox(height: 10),
            Text(
              l10n.loginTagline,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14.5, height: 1.4, color: Colors.white70),
            ),
            const SizedBox(height: 18),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: [
                chip(Icons.bolt_rounded, l10n.loginChipOffline),
                chip(Icons.balance_rounded, l10n.loginChipSplits),
                chip(Icons.public_rounded, l10n.loginChipSync),
              ],
            ),
          ],
        ),
      ),
    );
    final sheet = Theme(
      data: AppTheme.dark(),
      child: Builder(
        builder: (context) => Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ScallopEdge(),
            Container(
              width: double.infinity,
              color: boardingSheet,
              padding: EdgeInsets.fromLTRB(22, 6, 22, 14 + MediaQuery.paddingOf(context).bottom),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l10n.loginPassenger.toUpperCase(),
                              style: const TextStyle(
                                fontFamily: AppTypography.fontMono,
                                fontSize: 11,
                                letterSpacing: 1.4,
                                color: Colors.white54,
                              ),
                            ),
                            Text(
                              l10n.loginPassengerYou,
                              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: white),
                            ),
                          ],
                        ),
                      ),
                      Flexible(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              l10n.loginStatus.toUpperCase(),
                              style: const TextStyle(
                                fontFamily: AppTypography.fontMono,
                                fontSize: 11,
                                letterSpacing: 1.4,
                                color: Colors.white54,
                              ),
                            ),
                            Text(
                              l10n.loginNotSignedIn,
                              style: const TextStyle(
                                fontFamily: AppTypography.fontMono,
                                fontSize: 12.5,
                                color: Colors.white60,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  if (paused)
                    _Banner(
                      key: const Key('paused-banner'),
                      text: l10n.authSignInsPaused,
                      color: const Color(0xFFFFC857),
                    ),
                  if (_error != null)
                    _Banner(key: const Key('error-banner'), text: _error!, color: const Color(0xFFFF8A80)),
                  if (_detail != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: SelectableText(
                        _detail!,
                        key: const Key('error-detail'),
                        style: const TextStyle(fontSize: 11, color: Colors.white38),
                      ),
                    ),
                  _BoardButton(
                    key: const Key('board-google'),
                    label: l10n.loginBoardGoogle,
                    leading: const GoogleGlyph(),
                    onPressed: (paused || _busy) ? null : _google,
                    busy: _busy,
                  ),
                  if (apple) ...[
                    const SizedBox(height: 10),
                    _BoardButton(
                      key: const Key('board-apple'),
                      label: l10n.loginBoardApple,
                      leading: const Icon(Icons.apple, color: Colors.white),
                      dark: true,
                      onPressed: (paused || _busy) ? null : _apple,
                    ),
                  ],
                  const SizedBox(height: 12),
                  Wrap(
                    alignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(l10n.authLegal, style: const TextStyle(color: Colors.white54, fontSize: 12)),
                      TextButton(
                        style: TextButton.styleFrom(
                          minimumSize: const Size(0, 28),
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                        ),
                        onPressed: () => context.push('/terms'),
                        child: Text(l10n.authTerms, style: const TextStyle(color: Color(0xFF7EB6FF), fontSize: 12)),
                      ),
                      TextButton(
                        style: TextButton.styleFrom(
                          minimumSize: const Size(0, 28),
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                        ),
                        onPressed: () => context.push('/privacy'),
                        child: Text(l10n.authPrivacy, style: const TextStyle(color: Color(0xFF7EB6FF), fontSize: 12)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  GateCodeField(controller: _code, onChanged: (_) => setState(() {}), onJoin: _goJoin),
                  const SizedBox(height: 12),
                  if (_showAdmin)
                    _SuperadminSection(
                      showToggle: false,
                      expanded: true,
                      busy: _busy,
                      email: _email,
                      password: _password,
                      onToggle: () {},
                      onSubmit: _submitSuperadmin,
                    ),
                  Row(
                    children: [
                      const SizedBox(width: 86, child: TicketBarcode(seed: 'trip-tracker-gate', height: 22)),
                      const Spacer(),
                      TextButton(
                        key: const Key('superadmin-toggle'),
                        onPressed: _busy
                            ? null
                            : () => setState(() {
                                _showAdmin = !_showAdmin;
                                _error = null;
                              }),
                        child: Text(
                          '${l10n.loginStaff} ›',
                          style: const TextStyle(color: Colors.white60, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
    return Scaffold(
      backgroundColor: boardingSheet,
      body: Stack(
        fit: StackFit.expand,
        children: [
          const BoardingBackdrop(),
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: CustomScrollView(
                keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                slivers: [
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: Column(
                      children: [
                        Expanded(child: hero),
                        sheet,
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final paused = ref.watch(signInsPausedProvider).value ?? false;
    final apple = ref.watch(socialAuthProvider).appleAvailable;
    if (ref.watch(boardingLoginProvider)) return _buildBoarding(context, paused: paused, apple: apple);
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
                const _TileCollage(),
                const SizedBox(height: 28),
                Text(
                  l10n.authWelcome,
                  style: TextStyle(
                    fontFamily: AppTypography.fontTitle,
                    fontSize: 36,
                    height: 1.05,
                    fontWeight: FontWeight.w800,
                    color: tokens.textPrimary,
                    letterSpacing: -1.0,
                  ),
                ),
                const SizedBox(height: 10),
                Text(l10n.authSubtitle, style: TextStyle(fontSize: 16, height: 1.4, color: tokens.textSecondary)),
                const SizedBox(height: 24),
                if (paused)
                  _Banner(key: const Key('paused-banner'), text: l10n.authSignInsPaused, color: tokens.warningColor),
                if (_error != null) _Banner(key: const Key('error-banner'), text: _error!, color: tokens.colorDanger),
                if (_detail != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: SelectableText(
                      _detail!,
                      key: const Key('error-detail'),
                      style: TextStyle(fontSize: 11, color: tokens.textMuted),
                    ),
                  ),
                AppButton(
                  label: l10n.authContinueGoogle,
                  icon: Icons.g_mobiledata_rounded,
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

/// Decorative Bento collage above the sign-in form: what the app does, one pastel tile each.
/// Tiles size to their content (text scale safe); each row stretches to its tallest tile.
class _TileCollage extends StatelessWidget {
  const _TileCollage();

  Widget _tile(BuildContext context, BentoTone tone, IconData icon, String label, {double minHeight = 96}) {
    return BentoTile(
      tone: tone,
      padding: const EdgeInsets.all(14),
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: minHeight - 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, size: 26),
            const SizedBox(height: 12),
            Text(
              label,
              style: TextStyle(
                fontFamily: AppTypography.fontTitle,
                fontSize: 18,
                height: 1.05,
                fontWeight: FontWeight.w800,
                color: context.tokens.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      key: const Key('login-tiles'),
      children: [
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(flex: 3, child: _tile(context, BentoTone.mint, Icons.receipt_long_rounded, l10n.authTileSplit)),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: _tile(context, BentoTone.butter, Icons.flight_takeoff_rounded, l10n.authTileFlights),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(flex: 2, child: _tile(context, BentoTone.lilac, Icons.groups_rounded, l10n.authTileCrew)),
              const SizedBox(width: 10),
              Expanded(
                flex: 3,
                child: Column(
                  children: [
                    Expanded(
                      child: _tile(
                        context,
                        BentoTone.peach,
                        Icons.payments_rounded,
                        l10n.authTileSettle,
                        minHeight: 80,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Expanded(
                      child: _tile(
                        context,
                        BentoTone.sky,
                        Icons.cloud_off_rounded,
                        l10n.authTileOffline,
                        minHeight: 80,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
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
    this.showToggle = true,
  });

  final bool showToggle;
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
        if (showToggle)
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
      Expanded(
        child: DecoratedBox(
          key: const Key('login-hero'),
          decoration: BoxDecoration(color: context.tokens.tones.mint.bg),
          child: Padding(
            padding: const EdgeInsets.all(56),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ponytail: English-only pitch until the ARB files are regenerated.
                Text(
                  'Plan it.\nSplit it.\nRemember it.',
                  style: TextStyle(
                    fontFamily: AppTypography.fontTitle,
                    fontSize: 56,
                    height: 1.02,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -1.5,
                    color: context.tokens.textPrimary,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'The shared wallet for every trip with friends: expenses, passes and memories in one place.',
                  style: TextStyle(fontSize: 17, color: context.tokens.textSecondary, height: 1.4),
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

/// A big pill action on the dark boarding sheet: white (primary) or outlined dark.
class _BoardButton extends StatelessWidget {
  const _BoardButton({
    required this.label,
    required this.leading,
    required this.onPressed,
    this.dark = false,
    this.busy = false,
    super.key,
  });

  final String label;
  final Widget leading;
  final VoidCallback? onPressed;
  final bool dark;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final fg = dark ? Colors.white : const Color(0xFF111827);
    return Opacity(
      opacity: onPressed == null && !busy ? 0.5 : 1,
      child: Material(
        color: dark ? Colors.transparent : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: dark ? BorderSide(color: Colors.white.withValues(alpha: 0.35)) : BorderSide.none,
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onPressed,
          child: SizedBox(
            height: 56,
            child: Center(
              child: busy
                  ? SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: fg))
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        leading,
                        const SizedBox(width: 12),
                        Flexible(
                          child: Text(
                            label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: fg, fontSize: 16, fontWeight: FontWeight.w800),
                          ),
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
