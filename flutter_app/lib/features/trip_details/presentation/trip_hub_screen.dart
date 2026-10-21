import '../../chat/application/chat_providers.dart';
import 'widgets/edit_trip_sheet.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/flags/compass_flags.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/compass.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/compass_cover.dart';
import '../../expenses/application/expenses_providers.dart';
import '../../expenses/presentation/trip_tools_sheet.dart';
import '../../travel/presentation/live_location_share_modal.dart';
import '../../trips/application/trips_providers.dart';
import '../../trips/presentation/widgets/share_trip_sheet.dart';
import '../application/trip_nav.dart';
import '../domain/trip_tabs.dart';

/// The Compass "Trip" tab: a cover and a grid of everything that is not the daily loop (People, Notes,
/// Receipts, Insights, Invite, Live location, Tools, Settings). Behind flag `enableCompassNav`.
class TripHubScreen extends ConsumerWidget {
  const TripHubScreen({required this.tripId, super.key});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final t = context.tokens;
    final trip = ref.watch(tripProvider(tripId)).value;
    final cover = trip == null ? null : ref.watch(tripCoverProvider(tripCoverKey(trip))).value;
    final members = ref.watch(tripMembersProvider(tripId)).value?.length ?? 0;
    final hasNotes = ref.watch(visibleTabsProvider(tripId)).contains(TripNavTab.notes);
    final insights = ref.watch(compassFlagProvider(('enableSpendInsights', tripId)));
    final mapOpen = ref.watch(tripMapOpenProvider(tripId));
    final hasChat = ref.watch(visibleTabsProvider(tripId)).contains(TripNavTab.chat);
    final unreadChat = hasChat && ref.watch(chatUnreadProvider(tripId));

    void live() {
      final user = ref.read(authStateProvider).user;
      LiveLocationShareModal.show(
        context,
        tripId: tripId,
        memberId: ref.read(myMemberIdProvider(tripId)) ?? '',
        userId: user?.id ?? '',
      );
    }

    final tiles = <_HubTile>[
      _HubTile('hub-people', AppIcons.members, l10n.navMembers, '$members traveler${members == 1 ? '' : 's'}', () {
        context.go('/trip/$tripId/members');
      }),
      if (hasChat)
        _HubTile('hub-chat', AppIcons.chat, l10n.navChat, unreadChat ? 'New messages' : 'Talk to the group', () {
          context.go('/trip/$tripId/chat');
        }),
      if (hasNotes)
        _HubTile('hub-notes', AppIcons.notes, l10n.navNotes, 'Notes, lists, passes', () {
          context.go('/trip/$tripId/notes');
        }),
      _HubTile('hub-receipts', Icons.receipt_long_outlined, l10n.receiptsTitle, 'Photos on expenses', () {
        context.push('/trip/$tripId/receipts');
      }),
      if (insights)
        _HubTile('hub-insights', Icons.insights_rounded, 'Insights', 'Where the money went', () {
          context.push('/trip/$tripId/insights');
        }),
      _HubTile('hub-invite', AppIcons.share, 'Invite', 'Code, link, QR', () {
        AppSheet.show<void>(
          context: context,
          title: l10n.inviteSheetTitle,
          builder: (_) => ShareTripSheet(tripId: tripId),
        );
      }),
      _HubTile('hub-edit', Icons.edit_outlined, 'Edit trip', 'Name, dates, destination', () {
        AppSheet.show<bool>(
          context: context,
          title: 'Edit Trip',
          builder: (_) => EditTripSheet(tripId: tripId),
        );
      }),
      _HubTile(
        'hub-map',
        mapOpen ? Icons.map : Icons.map_outlined,
        l10n.tripRouteMap,
        mapOpen ? 'Showing' : 'Hidden',
        () {
          ref.read(tripMapOpenProvider(tripId).notifier).toggle();
        },
      ),
      _HubTile('hub-live', AppIcons.location, 'Live location', 'Share where you are', live),
      _HubTile('hub-tools', Icons.build_circle_outlined, 'Tools', 'Export, import, wrapped', () {
        AppSheet.show<void>(
          context: context,
          builder: (_) => TripToolsSheet(tripId: tripId),
        );
      }),
      _HubTile('hub-settings', AppIcons.settings, l10n.tripSettingsMenu, 'Currency, rules, members', () {
        context.push('/trip/$tripId/settings');
      }),
      _HubTile('hub-app-settings', Icons.tune_rounded, l10n.tripAppSettings, 'Theme, language, account', () {
        context.push('/settings');
      }),
    ];

    return ListView(
      key: const Key('trip-hub'),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
      children: [
        CompassCover(
          photoUrl: cover,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.end,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                trip?.name ?? '',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white),
              ),
              if ((trip?.destination ?? '').isNotEmpty)
                Text(trip!.destination!, style: const TextStyle(color: Colors.white70, fontSize: 13)),
            ],
          ),
        ),
        const SizedBox(height: 14),
        LayoutBuilder(
          builder: (context, c) {
            final cols = c.maxWidth >= 560 ? 3 : 2;
            final w = (c.maxWidth - 10 * (cols - 1)) / cols;
            return Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (final tile in tiles)
                  SizedBox(
                    width: w,
                    child: Semantics(
                      button: true,
                      label: '${tile.title}. ${tile.subtitle}',
                      child: Material(
                        color: t.bgSurface,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                          side: BorderSide(color: t.borderColor),
                        ),
                        child: InkWell(
                          key: Key(tile.key),
                          borderRadius: BorderRadius.circular(20),
                          onTap: tile.onTap,
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(minHeight: 104),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: ExcludeSemantics(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      width: 36,
                                      height: 36,
                                      decoration: BoxDecoration(
                                        color: t.primarySoft,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(tile.icon, size: 20, color: t.primaryAccent),
                                    ),
                                    const SizedBox(height: 10),
                                    Text(tile.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                                    Text(
                                      tile.subtitle,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(fontSize: 12, color: t.textMuted),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _HubTile {
  const _HubTile(this.key, this.icon, this.title, this.subtitle, this.onTap);
  final String key;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
}
