import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../data/providers.dart';
import '../../../domain/models/trip.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../notifications/application/notification_prefs_providers.dart';
import '../../settings/presentation/settings_widgets.dart';
import '../application/trip_nav.dart';

/// Per-trip settings (replaces the Phase 6 stub). Money rules and freeze/close/archive are
/// owner-only here, matching the trips list; the server enforces the same with RLS.
class TripSettingsScreen extends ConsumerWidget {
  const TripSettingsScreen({required this.tripId, super.key});

  final String tripId;

  Future<void> _threshold(BuildContext context, WidgetRef ref, Trip trip) async {
    final c = TextEditingController(text: trip.approvalThreshold?.toString() ?? '');
    final v = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Approval threshold'),
        content: TextField(
          key: const Key('threshold-field'),
          controller: c,
          autofocus: true,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(hintText: 'Amount in ${trip.baseCurrency}, empty to turn off'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            key: const Key('threshold-save'),
            onPressed: () => Navigator.pop(ctx, c.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    // No c.dispose(): the dialog is still animating out and would read a disposed controller.
    if (v == null) return;
    await ref.read(tripRepositoryProvider).setApprovalThreshold(tripId, double.tryParse(v));
  }

  Future<void> _state(
    BuildContext context,
    WidgetRef ref,
    String title,
    String message, {
    bool? frozen,
    bool? closed,
    bool? archived,
  }) async {
    final ok = await ConfirmDialog.show(context: context, title: title, message: message, confirmLabel: 'Yes');
    if (ok) {
      await ref.read(tripRepositoryProvider).setTripState(tripId, frozen: frozen, closed: closed, archived: archived);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trip = ref.watch(tripProvider(tripId)).value;
    final userId = ref.watch(authStateProvider.select((a) => a.userId));
    final repo = ref.read(tripRepositoryProvider);
    final muted = ref.watch(tripMutedProvider(tripId)).value ?? false;
    final isOwner = trip != null && trip.ownerId == userId;
    final approvalFlag = ref.watch(flagProvider(('enableExpenseApprovalThreshold', tripId))).value ?? false;
    final simplifyFlag = ref.watch(flagProvider(('enableSimplifyDebtsToggle', tripId))).value ?? false;

    return AppScaffold(
      appBar: AppBar(
        title: const Text('Trip settings'),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: trip == null
          ? const EmptyState(icon: AppIcons.settings, title: 'Trip not found', subtitle: 'It may have been deleted.')
          : ListView(
              padding: const EdgeInsets.only(bottom: 32),
              children: [
                SettingsSection(
                  title: 'Notifications',
                  children: [
                    SettingsSwitchTile(
                      key: const Key('trip-mute'),
                      title: 'Mute this trip',
                      subtitle: 'No push alerts from this trip. In-app notifications still arrive.',
                      value: muted,
                      onChanged: (v) async {
                        await ref.read(notificationPrefsRepositoryProvider).setTripMuted(tripId, v);
                        ref.invalidate(tripMutedProvider(tripId));
                      },
                    ),
                  ],
                ),
                SettingsSection(
                  title: 'Money',
                  children: [
                    if (simplifyFlag)
                      SettingsSwitchTile(
                        key: const Key('trip-simplify'),
                        title: 'Simplify debts',
                        subtitle: 'Fewest payments to settle up',
                        value: trip.simplifyDebts,
                        onChanged: isOwner ? (v) => repo.setSimplifyDebts(tripId, v) : null,
                      ),
                    if (approvalFlag)
                      SettingsTile(
                        key: const Key('trip-approval'),
                        title: 'Approval threshold',
                        subtitle: trip.approvalThreshold == null
                            ? 'Off'
                            : 'Expenses above ${trip.approvalThreshold} ${trip.baseCurrency} need approval',
                        onTap: isOwner ? () => _threshold(context, ref, trip) : null,
                      ),
                    SettingsTile(
                      key: const Key('trip-categories'),
                      title: 'Categories',
                      onTap: () => context.push('/trip/$tripId/categories'),
                    ),
                    SettingsTile(
                      key: const Key('trip-recycle'),
                      title: 'Recycle bin',
                      onTap: () => context.push('/trip/$tripId/recycle-bin'),
                    ),
                  ],
                ),
                if (isOwner)
                  SettingsSection(
                    title: 'Trip state',
                    children: [
                      SettingsSwitchTile(
                        key: const Key('trip-freeze'),
                        title: 'Freeze trip',
                        subtitle: 'Read-only: nobody can add or edit expenses',
                        value: trip.frozen,
                        onChanged: (v) => _state(
                          context,
                          ref,
                          v ? 'Freeze trip?' : 'Unfreeze trip?',
                          v
                              ? 'Members will not be able to add or edit expenses.'
                              : 'Members can add and edit expenses again.',
                          frozen: v,
                        ),
                      ),
                      SettingsSwitchTile(
                        key: const Key('trip-close'),
                        title: 'Trip closed',
                        subtitle: 'Marks the trip as settled and finished',
                        value: trip.closed,
                        onChanged: (v) => _state(
                          context,
                          ref,
                          v ? 'Close trip?' : 'Reopen trip?',
                          v ? 'The trip is marked finished and locked.' : 'The trip opens for edits again.',
                          closed: v,
                        ),
                      ),
                      SettingsSwitchTile(
                        key: const Key('trip-archive'),
                        title: 'Archive',
                        subtitle: 'Hide from the main list',
                        value: trip.archived,
                        onChanged: (v) => repo.setTripState(tripId, archived: v),
                      ),
                    ],
                  ),
              ],
            ),
    );
  }
}
