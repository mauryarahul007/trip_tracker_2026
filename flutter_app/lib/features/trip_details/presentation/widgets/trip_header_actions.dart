import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../data/providers.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../expenses/application/expenses_providers.dart';
import '../../../notifications/presentation/notification_bell.dart';
import '../../../trips/presentation/widgets/sync_chip.dart';
import '../../application/trip_nav.dart';

/// Which trip top bar to build. Compass nav (`enableCompassNav`) shows sync and the bell only; the clean bar
/// (`enableCleanTopBar`) adds one More menu; legacy is the older row of separate buttons.
enum TripHeaderVariant { compass, clean, legacy }

/// The trip app bar's action buttons for [variant]. [onMenu] handles the menu values: share, map, edit-trip,
/// trip-settings, app-settings and location.
List<Widget> tripHeaderActions(
  BuildContext context,
  WidgetRef ref, {
  required String tripId,
  required TripHeaderVariant variant,
  required void Function(String) onMenu,
}) {
  final l10n = context.l10n;
  final trip = ref.watch(tripProvider(tripId)).value;
  final mapExpanded = ref.watch(tripMapOpenProvider(tripId));
  final sync = SyncButton(tripId: tripId);
  final bell = NotificationBell(tripId: tripId);
  const locationItem = PopupMenuItem<String>(
    key: Key('action-live-location'),
    value: 'location',
    child: ListTile(leading: Icon(AppIcons.location), title: Text('Live Location Share')),
  );

  switch (variant) {
    case TripHeaderVariant.compass:
      return [sync, bell];
    case TripHeaderVariant.clean:
      return [
        sync,
        bell,
        PopupMenuButton<String>(
          key: const Key('action-trip-more'),
          icon: const Icon(Icons.more_vert_rounded),
          tooltip: l10n.tripMoreMenu,
          onSelected: onMenu,
          itemBuilder: (_) => [
            PopupMenuItem(
              key: const Key('action-share'),
              value: 'share',
              child: ListTile(leading: const Icon(AppIcons.share), title: Text(l10n.shareTripTitle)),
            ),
            if (trip != null)
              PopupMenuItem(
                key: const Key('action-trip-map'),
                value: 'map',
                child: ListTile(
                  leading: Icon(mapExpanded ? Icons.map : Icons.map_outlined),
                  title: Text(l10n.tripRouteMap),
                ),
              ),
            if (trip != null && (ref.watch(flagProvider(('enableTripHeaderActions', tripId))).value ?? true))
              PopupMenuItem(
                key: const Key('action-edit-trip'),
                value: 'edit-trip',
                enabled: ref.watch(canEditTripRulesProvider(tripId)),
                child: const ListTile(leading: Icon(Icons.edit_outlined), title: Text('Edit trip details')),
              ),
            PopupMenuItem(
              key: const Key('action-trip-settings'),
              value: 'trip-settings',
              child: ListTile(leading: const Icon(AppIcons.settings), title: Text(l10n.tripSettingsMenu)),
            ),
            const PopupMenuDivider(),
            PopupMenuItem(
              key: const Key('action-app-settings'),
              value: 'app-settings',
              child: ListTile(leading: const Icon(Icons.tune_rounded), title: Text(l10n.tripAppSettings)),
            ),
            locationItem,
          ],
        ),
      ];
    case TripHeaderVariant.legacy:
      return [
        if (trip != null)
          IconButton(
            key: const Key('action-trip-map'),
            icon: Icon(mapExpanded ? Icons.map : Icons.map_outlined),
            tooltip: 'Route Map',
            onPressed: () => onMenu('map'),
          ),
        IconButton(icon: const Icon(AppIcons.share), tooltip: l10n.shareTripTitle, onPressed: () => onMenu('share')),
        // Live location and app-level settings live in a menu so the bell and the trip gear always fit.
        PopupMenuButton<String>(
          key: const Key('action-trip-more'),
          icon: const Icon(Icons.more_vert_rounded),
          onSelected: onMenu,
          itemBuilder: (_) => const [
            PopupMenuItem(
              key: Key('action-app-settings'),
              value: 'app-settings',
              child: ListTile(leading: Icon(AppIcons.settings), title: Text('App settings')),
            ),
            locationItem,
          ],
        ),
        bell,
        IconButton(
          icon: const Icon(AppIcons.settings),
          tooltip: l10n.navSettings,
          onPressed: () => context.push('/trip/$tripId/settings'),
        ),
      ];
  }
}
