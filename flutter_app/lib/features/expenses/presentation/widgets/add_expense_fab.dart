import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/flags/compass_flags.dart';
import '../../../../core/platform/haptics.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../data/providers.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../quick_add_sheet.dart';
import 'settle_sheet.dart';

/// The "Add expense" button shown on both the Summary and the Expenses tab. No hero tag: both tabs stay mounted
/// in the trip pager at once, and two heroes with one tag would clash.
///
/// With `enableQuickAddSpeedDial` it offers Quick add (type a sentence or speak) and the full form; without it the
/// button opens the full form straight away.
class AddExpenseFab extends ConsumerWidget {
  const AddExpenseFab({required this.tripId, super.key});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dial = ref.watch(flagProvider(('enableQuickAddSpeedDial', tripId))).value ?? true;
    // Compass nav has its own orange Add button in the trip dock.
    // Calm Passport has the same Add button above its dock.
    if (ref.watch(compassFlagProvider((calmPassportFlag, tripId)))) return const SizedBox.shrink();
    if (ref.watch(compassFlagProvider((compassNavFlag, tripId)))) return const SizedBox.shrink();
    return Positioned(
      right: 16,
      bottom: 16,
      child: FloatingActionButton.extended(
        key: Key('add-expense-fab-$tripId'),
        heroTag: null,
        onPressed: () => startAddExpense(context, ref, tripId, dial: dial),
        icon: const Icon(AppIcons.add),
        label: Text(context.l10n.expAdd),
      ),
    );
  }
}

/// Add expense: the Quick add / full form chooser when `enableQuickAddSpeedDial` is on, else the full form.
/// Shared by the legacy floating button and the Compass dock's centre button.
Future<void> startAddExpense(BuildContext context, WidgetRef ref, String tripId, {bool? dial}) async {
  final useDial = dial ?? ref.read(flagProvider(('enableQuickAddSpeedDial', tripId))).value ?? true;
  if (!useDial) {
    await context.push('/trip/$tripId/expenses/new');
    return;
  }
  await _chooseAdd(context, ref, tripId);
}

Future<void> _chooseAdd(BuildContext context, WidgetRef ref, String tripId) async {
  final l10n = context.l10n;
  final pick = await AppSheet.show<String>(
    context: context,
    title: l10n.expAdd,
    builder: (ctx) => Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _SpeedActionCapsuleTile(
            tileKey: 'fab-quick',
            icon: Icons.bolt_rounded,
            iconColor: const Color(0xFFD97706),
            iconBg: const Color(0xFFFEF3C7),
            title: l10n.toolsQuickAdd,
            subtitle: l10n.expQuickAddHint,
            onTap: () => Navigator.pop(ctx, 'quick'),
          ),
          const SizedBox(height: 8),
          _SpeedActionCapsuleTile(
            tileKey: 'fab-full',
            icon: Icons.edit_note_rounded,
            iconColor: const Color(0xFF4F46E5),
            iconBg: const Color(0xFFEEF2FF),
            title: l10n.expFullForm,
            subtitle: l10n.expFullFormHint,
            onTap: () => Navigator.pop(ctx, 'full'),
          ),
          const SizedBox(height: 8),
          _SpeedActionCapsuleTile(
            tileKey: 'fab-scan',
            icon: Icons.document_scanner_rounded,
            iconColor: const Color(0xFF059669),
            iconBg: const Color(0xFFD1FAE5),
            title: 'Scan receipt',
            subtitle: 'Instant photo capture and item OCR',
            onTap: () => Navigator.pop(ctx, 'scan'),
          ),
          const SizedBox(height: 8),
          _SpeedActionCapsuleTile(
            tileKey: 'fab-settle',
            icon: Icons.swap_horiz_rounded,
            iconColor: const Color(0xFF0D9488),
            iconBg: const Color(0xFFCCFBF1),
            title: 'Record settlement',
            subtitle: 'Pay back friends and clear balances',
            onTap: () => Navigator.pop(ctx, 'settle'),
          ),
        ],
      ),
    ),
  );
  if (!context.mounted || pick == null) return;
  if (pick == 'full') {
    await context.push('/trip/$tripId/expenses/new');
  } else if (pick == 'scan') {
    await context.push('/trip/$tripId/receipts');
  } else if (pick == 'settle') {
    await showSettlementChooserOrSheet(context: context, ref: ref, tripId: tripId);
  } else {
    await AppSheet.show<void>(
      context: context,
      builder: (_) => QuickAddSheet(tripId: tripId),
    );
  }
}

class _SpeedActionCapsuleTile extends StatelessWidget {
  const _SpeedActionCapsuleTile({
    required this.tileKey,
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String tileKey;
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Material(
      color: tokens.bgSurface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: tokens.borderColor.withValues(alpha: 0.6)),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: Key(tileKey),
        onTap: () {
          unawaited(AppHaptics.selection());
          onTap();
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isDark ? iconColor.withValues(alpha: 0.22) : iconBg,
                  borderRadius: BorderRadius.circular(13),
                ),
                alignment: Alignment.center,
                child: Icon(icon, color: iconColor, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: tokens.textPrimary,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12.5,
                        color: tokens.textMuted,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(Icons.chevron_right_rounded, size: 20, color: tokens.textMuted.withValues(alpha: 0.6)),
            ],
          ),
        ),
      ),
    );
  }
}
