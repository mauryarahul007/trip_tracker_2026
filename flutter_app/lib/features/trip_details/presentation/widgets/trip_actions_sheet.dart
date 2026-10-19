import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../../../domain/models/expense.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../../../expenses/application/expenses_providers.dart'
    show canEditTripRulesProvider, tripExpensesProvider, visibleMembersProvider;
import '../../../notifications/application/notification_prefs_providers.dart';
import '../../../trips/presentation/widgets/share_trip_sheet.dart';
import '../../application/trip_nav.dart' show tripProvider;
import '../../../settings/presentation/settings_widgets.dart' show SettingsIcon;
import 'edit_trip_sheet.dart';

/// What the trip name's long-press opens: the trip's meta line and its main actions in one place.
/// [onSwitch] is null when there is no other trip to switch to.
class TripActionsSheet extends ConsumerWidget {
  const TripActionsSheet({required this.tripId, this.onSwitch, super.key});

  final String tripId;
  final VoidCallback? onSwitch;

  static Future<void> show(BuildContext context, {required String tripId, VoidCallback? onSwitch}) =>
      AppSheet.show<void>(
        context: context,
        builder: (_) => TripActionsSheet(tripId: tripId, onSwitch: onSwitch),
      );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final trip = ref.watch(tripProvider(tripId)).value;
    if (trip == null) return const SizedBox.shrink();
    final members = ref.watch(visibleMembersProvider(tripId)).length;
    final expenses = [
      for (final e in ref.watch(tripExpensesProvider(tripId)).value ?? const <Expense>[])
        if (!e.isSettlement && e.deletedAt == null) e,
    ].length;
    final muted = ref.watch(tripMutedProvider(tripId)).value ?? false;
    final canEdit = ref.watch(canEditTripRulesProvider(tripId));
    final meta = [
      if (trip.startDate.isNotEmpty) formatDateRange(trip.startDate, trip.endDate),
      '$members member${members == 1 ? '' : 's'}',
      '$expenses expense${expenses == 1 ? '' : 's'}',
    ].join(' · ');

    // Close first, then act: the sheet's own context is gone once it pops.
    void act(VoidCallback go) {
      final nav = Navigator.of(context);
      nav.pop();
      go();
    }

    Widget row(Key key, IconData icon, String title, String subtitle, VoidCallback onTap) => ListTile(
      key: key,
      minTileHeight: 56,
      leading: SettingsIcon(icon),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(subtitle),
      onTap: onTap,
    );

    final root = Navigator.of(context, rootNavigator: true).context;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          trip.name,
          key: const Key('trip-actions-title'),
          textAlign: TextAlign.center,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 2, bottom: 10),
          child: Text(
            meta,
            key: const Key('trip-actions-meta'),
            textAlign: TextAlign.center,
            style: TextStyle(color: t.textSecondary),
          ),
        ),
        Divider(height: 1, color: t.borderColor),
        row(
          const Key('trip-action-share'),
          Icons.share_outlined,
          'Share Trip & QR Code',
          'Invite travelers with join code or scannable QR',
          () => act(
            () => AppSheet.show<void>(
              context: root,
              title: 'Invite travelers',
              builder: (_) => ShareTripSheet(tripId: tripId),
            ),
          ),
        ),
        row(
          const Key('trip-action-mute'),
          muted ? Icons.notifications_off_outlined : Icons.notifications_none_rounded,
          muted ? 'Unmute Trip Alerts' : 'Mute Trip Alerts',
          muted ? 'Push notifications for this trip are silenced' : 'Silence push notifications for this trip',
          () async {
            final nav = Navigator.of(context);
            await ref.read(notificationPrefsRepositoryProvider).setTripMuted(tripId, !muted);
            ref.invalidate(tripMutedProvider(tripId));
            nav.pop();
          },
        ),
        if (canEdit)
          row(
            const Key('trip-action-edit'),
            Icons.edit_outlined,
            'Edit Trip Details',
            'Name, dates, destination',
            () => act(
              () => AppSheet.show<bool>(
                context: root,
                title: 'Edit Trip',
                builder: (_) => EditTripSheet(tripId: tripId),
              ),
            ),
          ),
        row(
          const Key('trip-action-settings'),
          Icons.settings_outlined,
          'Settings',
          'Preferences, data, help, and this trip tools',
          () => act(() => root.push('/settings')),
        ),
        if (onSwitch != null)
          row(
            const Key('trip-action-switch'),
            Icons.chevron_left_rounded,
            'Switch to Another Trip',
            'Return to your passport trips list',
            () => act(onSwitch!),
          ),
      ],
    );
  }
}
