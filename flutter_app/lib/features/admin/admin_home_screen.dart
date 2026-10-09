import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/platform/external_launcher.dart';
import '../../data/providers.dart';
import '../../l10n/l10n_ext.dart';
import '../../shared/theme/app_tokens.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_button.dart';
import 'admin_mode.dart';

/// The Ops Deck (Command Center, Flags, Users, Trips, Analytics, Audit, Tools) is the web app's
/// admin portal on `main`; superadmins land there after signing in. Override per build with
/// `--dart-define=WEB_APP_URL=...`.
const _webAppUrl = String.fromEnvironment(
  'WEB_APP_URL',
  defaultValue: 'https://mauryarahul007.github.io/trip_tracker_2026/',
);

class AdminHomeScreen extends ConsumerWidget {
  const AdminHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final t = context.tokens;
    final email = ref.watch(authRepositoryProvider).currentUser?.email;
    return Scaffold(
      backgroundColor: t.bgApp,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: t.headerGradient,
                    borderRadius: BorderRadius.circular(t.radiusLg),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.admin_panel_settings_rounded, color: Colors.white, size: 36),
                      const SizedBox(height: 12),
                      Text(
                        l10n.adminTitle,
                        style: const TextStyle(
                          fontFamily: AppTypography.fontTitle,
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      if (email != null) Text(email, style: const TextStyle(color: Colors.white70)),
                      const SizedBox(height: 8),
                      Text(l10n.adminSubtitle, style: const TextStyle(color: Colors.white70, fontSize: 14)),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                AppButton(
                  key: const Key('admin-open-ops-deck'),
                  label: l10n.adminOpenOpsDeck,
                  icon: Icons.open_in_new_rounded,
                  isFullWidth: true,
                  onPressed: () => ref.read(externalLauncherProvider)(Uri.parse(_webAppUrl)),
                ),
                const SizedBox(height: 12),
                AppButton(
                  key: const Key('admin-view-traveller'),
                  label: l10n.adminViewTraveller,
                  variant: AppButtonVariant.secondary,
                  isFullWidth: true,
                  onPressed: () {
                    ref.read(adminModeProvider.notifier).set(false);
                    context.go('/');
                  },
                ),
                const SizedBox(height: 12),
                AppButton(
                  key: const Key('admin-sign-out'),
                  label: l10n.adminSignOut,
                  variant: AppButtonVariant.secondary,
                  isFullWidth: true,
                  onPressed: () async {
                    ref.read(adminModeProvider.notifier).set(false);
                    await ref.read(authRepositoryProvider).signOut();
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
