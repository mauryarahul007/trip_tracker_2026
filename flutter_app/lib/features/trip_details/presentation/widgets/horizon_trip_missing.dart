import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../trips/presentation/widgets/join_code_sheet.dart';

/// Horizon (flag `enableHorizonUi`): shown when a trip link points at a trip this device does not have, e.g. it was
/// deleted or the person was removed. Offers a way home and a way back in with a code, instead of an empty shell.
class HorizonTripMissing extends StatelessWidget {
  const HorizonTripMissing({super.key});

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final l10n = context.l10n;
    return Scaffold(
      key: const Key('trip-missing'),
      backgroundColor: t.bgPage,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(color: t.tones.sky.bg, shape: BoxShape.circle),
                  child: Icon(Icons.explore_off_outlined, size: 32, color: t.tones.sky.accent),
                ),
                const SizedBox(height: 20),
                Text(
                  l10n.horizonTripMissingTitle,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: AppTypography.fontTitle,
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: t.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.horizonTripMissingBody,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 14, color: t.textSecondary),
                ),
                const SizedBox(height: 24),
                AppButton(
                  key: const Key('trip-missing-home'),
                  label: l10n.horizonTripMissingHome,
                  isFullWidth: true,
                  onPressed: () => context.go('/'),
                ),
                const SizedBox(height: 10),
                AppButton(
                  key: const Key('trip-missing-join'),
                  label: l10n.horizonJoinWithCode,
                  variant: AppButtonVariant.secondary,
                  isFullWidth: true,
                  onPressed: () => showJoinCodeSheet(context),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
