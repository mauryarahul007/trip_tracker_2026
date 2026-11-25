import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/flags/compass_flags.dart';
import '../../../../data/providers.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_bottom_nav.dart';
import '../../../../shared/widgets/app_sheet.dart';
import 'create_trip_sheet.dart';
import 'share_trip_sheet.dart';

enum HomeTab { trips, balances, activity, me }

const _paths = {
  HomeTab.trips: '/',
  HomeTab.balances: '/balances',
  HomeTab.activity: '/notifications',
  HomeTab.me: '/settings',
};

/// Superadmin flag `enableHorizonNav`. Off = the legacy Trips screen with its overflow menu.
final horizonNavProvider = Provider<bool>((ref) => ref.watch(flagProvider(('enableHorizonNav', null))).value ?? false);

/// Opens the create-trip sheet from any top-level screen, then jumps into the new trip.
Future<void> createTripFlow(BuildContext context) async {
  final id = await AppSheet.show<String>(
    context: context,
    title: context.l10n.createTripTitle,
    builder: (_) => const CreateTripSheet(),
  );
  if (id == null || !context.mounted) return;
  unawaited(context.push('/trip/$id/ledger'));
  // Horizon: the button reads "Create and invite", so the invite sheet opens on the new trip.
  if (context.tokens.horizon) {
    unawaited(
      AppSheet.show<void>(
        context: context,
        title: context.l10n.inviteSheetTitle,
        builder: (_) => ShareTripSheet(tripId: id),
      ),
    );
  }
}

/// True when the window is wide enough for the desktop shell (left rail, no bottom dock).
bool isWideHome(BuildContext context) => MediaQuery.sizeOf(context).width >= kSideNavBreakpoint;

/// Traveler-facing home dock language is always Calm Passport (Trips / Balances / Alerts / You).
/// Compass/legacy label variants stay retired so Superadmin nav experiments do not confuse travelers.
List<AppNavItem> _homeItems(BuildContext context) {
  final l10n = context.l10n;
  if (context.tokens.horizon) {
    // Horizon mockups: Trips (house), Balances (scale), Alerts, Me.
    return [
      AppNavItem(icon: Icons.home_outlined, label: l10n.navTrips),
      AppNavItem(icon: Icons.balance_rounded, label: l10n.navBalances),
      AppNavItem(icon: AppIcons.bell, label: l10n.navAlerts),
      AppNavItem(icon: Icons.person_outline_rounded, label: l10n.navMe),
    ];
  }
  return [
    AppNavItem(icon: Icons.flight_rounded, label: l10n.navTrips),
    AppNavItem(icon: Icons.swap_horiz_rounded, label: l10n.navBalances),
    AppNavItem(icon: AppIcons.bell, label: l10n.navAlerts),
    AppNavItem(icon: Icons.person_outline_rounded, label: l10n.navYou),
  ];
}

void _goTab(BuildContext context, HomeTab current, int i) {
  final tab = HomeTab.values[i];
  if (tab != current) context.go(_paths[tab]!);
}

/// Bottom dock for the four top-level screens, or null while `enableHorizonNav` is off (so the
/// scaffold keeps its normal safe-area handling) and on wide windows (see [wrapHomeBody]).
///
/// Pass [compressed] when `enableScrollCompressDock` is on and the list is scrolling down.
Widget? buildHomeDock(BuildContext context, WidgetRef ref, HomeTab current, {bool compressed = false}) {
  if (!ref.watch(horizonNavProvider) || isWideHome(context)) return null;
  final l10n = context.l10n;
  final polish = ref.watch(compassFlagProvider((navPolishFlag, null)));
  return AppBottomNav(
    centerAction: () => unawaited(createTripFlow(context)),
    centerLabel: l10n.tripsNewTrip,
    polish: polish,
    // Shipping chrome is the polished dock. Notch stays Labs: only when polish is off.
    notch: !polish && ref.watch(compassFlagProvider((notchNavFlag, null))),
    compressed: compressed,
    items: _homeItems(context),
    currentIndex: current.index,
    onTap: (i) => _goTab(context, current, i),
  );
}

/// Desktop shell (board 08): on wide windows the four top-level screens get the same left rail
/// as the trip workspace, with a New trip button on top. Narrow windows get [body] unchanged.
///
/// Back from Balances, Activity or Me returns to the previous page, or to Trips when there is none, instead of
/// leaving the app. Pass
/// `enabled: false` for a pushed variant of a screen (e.g. the per-trip notification list).
Widget wrapHomeBody(BuildContext context, WidgetRef ref, HomeTab current, Widget body, {bool enabled = true}) {
  if (!enabled || !ref.watch(horizonNavProvider)) return body;
  if (current != HomeTab.trips) {
    body = PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        // One step back when something is underneath (e.g. Settings opened from a trip); Trips only as a last resort.
        if (!didPop) context.canPop() ? context.pop() : context.go('/');
      },
      child: body,
    );
  }
  if (!isWideHome(context)) return body;
  final extended = MediaQuery.sizeOf(context).width >= kSideNavExtendedBreakpoint;
  return Material(
    color: context.tokens.bgPage,
    child: Row(
      children: [
        AppSideNav(
          items: _homeItems(context),
          currentIndex: current.index,
          extended: extended,
          onTap: (i) => _goTab(context, current, i),
          header: Padding(
            padding: const EdgeInsets.fromLTRB(8, 16, 8, 12),
            child: extended
                ? FilledButton.icon(
                    key: const Key('rail-new-trip'),
                    onPressed: () => unawaited(createTripFlow(context)),
                    icon: const Icon(Icons.add_rounded),
                    label: Text(context.l10n.tripsNewTrip),
                  )
                : IconButton.filled(
                    key: const Key('rail-new-trip'),
                    tooltip: context.l10n.tripsNewTrip,
                    onPressed: () => unawaited(createTripFlow(context)),
                    icon: const Icon(Icons.add_rounded),
                  ),
          ),
        ),
        Expanded(child: body),
      ],
    ),
  );
}
