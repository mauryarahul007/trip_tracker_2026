import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../data/providers.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_bottom_nav.dart';
import '../../../../shared/widgets/app_sheet.dart';
import 'create_trip_sheet.dart';

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
  if (id != null && context.mounted) unawaited(context.push('/trip/$id/ledger'));
}

/// True when the window is wide enough for the desktop shell (left rail, no bottom dock).
bool isWideHome(BuildContext context) => MediaQuery.sizeOf(context).width >= kSideNavBreakpoint;

List<AppNavItem> _homeItems(BuildContext context) {
  final l10n = context.l10n;
  // ponytail: Activity / Me labels are English-only until the ARB files are regenerated.
  return [
    AppNavItem(icon: AppIcons.expenses, label: l10n.navTrips),
    AppNavItem(icon: AppIcons.ledger, label: l10n.navBalances),
    const AppNavItem(icon: AppIcons.bell, label: 'Activity'),
    const AppNavItem(icon: Icons.person_outline_rounded, label: 'Me'),
  ];
}

void _goTab(BuildContext context, HomeTab current, int i) {
  final tab = HomeTab.values[i];
  if (tab != current) context.go(_paths[tab]!);
}

/// Bottom dock for the four top-level screens, or null while `enableHorizonNav` is off (so the
/// scaffold keeps its normal safe-area handling) and on wide windows (see [wrapHomeBody]).
Widget? buildHomeDock(BuildContext context, WidgetRef ref, HomeTab current) {
  if (!ref.watch(horizonNavProvider) || isWideHome(context)) return null;
  final l10n = context.l10n;
  return AppBottomNav(
    items: _homeItems(context),
    currentIndex: current.index,
    onTap: (i) => _goTab(context, current, i),
    centerAction: () => unawaited(createTripFlow(context)),
    centerLabel: l10n.tripsNewTrip,
  );
}

/// Desktop shell (board 08): on wide windows the four top-level screens get the same left rail
/// as the trip workspace, with a New trip button on top. Narrow windows get [body] unchanged.
///
/// Back from Balances, Activity or Me returns to Trips instead of leaving the app. Pass
/// `enabled: false` for a pushed variant of a screen (e.g. the per-trip notification list).
Widget wrapHomeBody(BuildContext context, WidgetRef ref, HomeTab current, Widget body, {bool enabled = true}) {
  if (!enabled || !ref.watch(horizonNavProvider)) return body;
  if (current != HomeTab.trips) {
    body = PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) context.go('/');
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
