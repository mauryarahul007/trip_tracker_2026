import '../../notifications/application/notification_prefs_providers.dart';
import '../../chat/application/chat_providers.dart';
import '../../../domain/models/expense.dart';
import 'widgets/edit_trip_sheet.dart';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/platform/haptics.dart';
import '../../../data/providers.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/compass.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/bento_tile.dart';
import '../../../shared/widgets/compass_cover.dart';
import '../../expenses/application/expenses_providers.dart';
import '../../expenses/presentation/trip_tools_sheet.dart';
import '../../travel/presentation/live_location_share_modal.dart';
import '../../trips/application/trips_providers.dart';
import '../../trips/presentation/widgets/share_trip_sheet.dart';
import '../application/trip_nav.dart';
import '../domain/trip_tabs.dart';

enum _HubHaptic { selection, medium, light }

class _HubTile {
  const _HubTile(
    this.key,
    this.icon,
    this.title,
    this.subtitle,
    this.onTap, {
    this.tone,
    this.isWide = false,
    this.eyebrow,
    this.hapticType = _HubHaptic.selection,
  });

  final String key;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final BentoTone? tone;
  final bool isWide;
  final String? eyebrow;
  final _HubHaptic hapticType;
}

/// The Compass "Trip" tab: a cover and a grid of everything that is not the daily loop (People, Plans,
/// Receipts, Insights, Invite, Live location, Tools, Settings).
/// Enhanced with an asymmetric Material 3 Bento Grid behind flag `enableBentoHub`.
class TripHubScreen extends ConsumerWidget {
  const TripHubScreen({required this.tripId, super.key});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final t = context.tokens;
    final isBento = ref.watch(flagProvider(('enableBentoHub', tripId))).value ?? false;
    final trip = ref.watch(tripProvider(tripId)).value;
    final cover = trip == null ? null : ref.watch(tripCoverProvider(tripCoverKey(trip))).value;
    final members = ref.watch(tripMembersProvider(tripId)).value?.length ?? 0;
    final hasNotes = ref.watch(visibleTabsProvider(tripId)).contains(TripNavTab.notes);
    final mapOpen = ref.watch(tripMapOpenProvider(tripId));
    final receipts = (ref.watch(tripExpensesProvider(tripId)).value ?? const <Expense>[])
        .where((e) => (e.receiptImage ?? e.receiptPath ?? '').isNotEmpty)
        .length;
    final receiptsFact = receipts == 0 ? 'Photos on expenses' : '$receipts receipt${receipts == 1 ? '' : 's'}';
    final unreadChat = ref.watch(chatUnreadProvider(tripId));
    final muted = ref.watch(tripMutedProvider(tripId)).value ?? false;

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
      _HubTile(
        'hub-home',
        Icons.home_outlined,
        'All trips',
        'Back to your trips',
        () => context.go('/'),
        eyebrow: 'NAVIGATE',
        hapticType: _HubHaptic.selection,
      ),
      _HubTile(
        'hub-people',
        AppIcons.members,
        l10n.navMembers,
        '$members traveler${members == 1 ? '' : 's'}',
        () => context.go('/trip/$tripId/members'),
        tone: BentoTone.sky,
        eyebrow: 'PEOPLE',
        hapticType: _HubHaptic.selection,
      ),
      // Calm Passport keeps Chat in the dock and Plans (checklist, notes, passes) here.
      if (hasNotes)
        _HubTile(
          t.calm ? 'hub-plans' : 'hub-notes',
          t.calm ? Icons.confirmation_number_outlined : AppIcons.notes,
          t.calm ? 'Plans' : l10n.navNotes,
          t.calm
              ? 'Checklist, notes, passes'
              : unreadChat && !ref.watch(visibleTabsProvider(tripId)).contains(TripNavTab.chat)
              ? 'New chat messages'
              : 'Notes, chat, passes',
          () => context.go('/trip/$tripId/notes'),
          tone: BentoTone.butter,
          eyebrow: 'PLANS',
          hapticType: _HubHaptic.selection,
        ),
      _HubTile(
        'hub-receipts',
        Icons.receipt_long_outlined,
        l10n.receiptsTitle,
        receiptsFact,
        () => context.push('/trip/$tripId/receipts'),
        tone: BentoTone.peach,
        eyebrow: 'VAULT',
        hapticType: _HubHaptic.selection,
      ),
      _HubTile(
        'hub-invite',
        AppIcons.share,
        'Invite',
        (trip?.joinCode ?? '').isEmpty ? 'Code, link, QR' : 'Code ${trip!.joinCode}',
        () {
          AppSheet.show<void>(
            context: context,
            title: l10n.inviteSheetTitle,
            builder: (_) => ShareTripSheet(tripId: tripId),
          );
        },
        tone: BentoTone.lilac,
        eyebrow: 'SHARE',
        hapticType: _HubHaptic.medium,
      ),
      _HubTile(
        'hub-edit',
        Icons.edit_outlined,
        'Edit trip',
        'Name, dates, destination',
        () {
          AppSheet.show<bool>(
            context: context,
            title: 'Edit Trip',
            builder: (_) => EditTripSheet(tripId: tripId),
          );
        },
        tone: BentoTone.sky,
        eyebrow: 'MANAGE',
        hapticType: _HubHaptic.medium,
      ),
      _HubTile(
        'hub-map',
        mapOpen ? Icons.map : Icons.map_outlined,
        l10n.tripRouteMap,
        mapOpen ? 'Showing' : 'Hidden',
        () {
          ref.read(tripMapOpenProvider(tripId).notifier).toggle();
        },
        tone: BentoTone.mint,
        isWide: true,
        eyebrow: 'ROUTE',
        hapticType: _HubHaptic.light,
      ),
      _HubTile(
        'hub-mute',
        muted ? Icons.notifications_off_outlined : Icons.notifications_none_rounded,
        muted ? 'Unmute alerts' : 'Mute alerts',
        muted ? 'Silenced on this phone' : 'Silence this trip',
        () async {
          await ref.read(notificationPrefsRepositoryProvider).setTripMuted(tripId, !muted);
          ref.invalidate(tripMutedProvider(tripId));
        },
        tone: BentoTone.peach,
        eyebrow: 'ALERTS',
        hapticType: _HubHaptic.light,
      ),
      _HubTile(
        'hub-live',
        AppIcons.location,
        'Live location',
        'Share where you are',
        live,
        tone: BentoTone.mint,
        eyebrow: 'SAFETY',
        hapticType: _HubHaptic.medium,
      ),
      _HubTile(
        'hub-tools',
        Icons.build_circle_outlined,
        'Tools',
        'Export, import, wrapped',
        () {
          AppSheet.show<void>(
            context: context,
            builder: (_) => TripToolsSheet(tripId: tripId),
          );
        },
        tone: BentoTone.lilac,
        eyebrow: 'UTILITIES',
        hapticType: _HubHaptic.medium,
      ),
      _HubTile(
        'hub-settings',
        AppIcons.settings,
        l10n.tripSettingsMenu,
        'Currency, rules, members',
        () => context.push('/trip/$tripId/settings'),
        eyebrow: 'PREFERENCES',
        hapticType: _HubHaptic.selection,
      ),
      _HubTile(
        'hub-app-settings',
        Icons.tune_rounded,
        l10n.tripAppSettings,
        'Theme, language, account',
        () => context.push('/settings'),
        eyebrow: 'SYSTEM',
        hapticType: _HubHaptic.selection,
      ),
    ];

    void triggerTileTap(_HubTile tile) {
      switch (tile.hapticType) {
        case _HubHaptic.selection:
          AppHaptics.selection();
          break;
        case _HubHaptic.medium:
          AppHaptics.medium();
          break;
        case _HubHaptic.light:
          AppHaptics.light();
          break;
      }
      tile.onTap();
    }

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
            final isWideScreen = c.maxWidth >= 560;
            final cols = isWideScreen ? 3 : 2;
            final gap = isBento ? 12.0 : 10.0;
            final regularWidth = (c.maxWidth - gap * (cols - 1)) / cols;

            if (isBento) {
              return Wrap(
                spacing: gap,
                runSpacing: gap,
                children: [
                  for (int i = 0; i < tiles.length; i++)
                    Builder(
                      builder: (context) {
                        final tile = tiles[i];
                        final width = (tile.isWide && !isWideScreen) ? c.maxWidth : regularWidth;
                        final tone = tile.tone;

                        return SizedBox(
                          width: width,
                          child: BentoEntrance(
                            index: i,
                            child: Material(
                              color: Colors.transparent,
                              borderRadius: BorderRadius.circular(22),
                              clipBehavior: Clip.antiAlias,
                              child: InkWell(
                                key: Key(tile.key),
                                borderRadius: BorderRadius.circular(22),
                                onTap: () => triggerTileTap(tile),
                                child: BentoTile(
                                  tone: tone,
                                  radius: 22,
                                  padding: const EdgeInsets.all(14),
                                  child: ConstrainedBox(
                                    constraints: BoxConstraints(minHeight: tile.isWide ? 90 : 108),
                                    child: ExcludeSemantics(
                                      child: tile.isWide && !isWideScreen
                                          ? Row(
                                              children: [
                                                Container(
                                                  width: 44,
                                                  height: 44,
                                                  decoration: BoxDecoration(
                                                    color: tone != null
                                                        ? t.tones[tone].accent.withValues(alpha: 0.16)
                                                        : t.primarySoft,
                                                    borderRadius: BorderRadius.circular(14),
                                                  ),
                                                  child: Icon(
                                                    tile.icon,
                                                    size: 22,
                                                    color: tone != null ? t.tones[tone].accent : t.primaryAccent,
                                                  ),
                                                ),
                                                const SizedBox(width: 14),
                                                Expanded(
                                                  child: Column(
                                                    crossAxisAlignment: CrossAxisAlignment.start,
                                                    mainAxisSize: MainAxisSize.min,
                                                    children: [
                                                      if (tile.eyebrow != null && tone != null)
                                                        BentoTile.eyebrow(context, tone, tile.eyebrow!),
                                                      Text(
                                                        tile.title,
                                                        style: const TextStyle(
                                                          fontWeight: FontWeight.w700,
                                                          fontSize: 15,
                                                        ),
                                                      ),
                                                      Text(
                                                        tile.subtitle,
                                                        maxLines: 1,
                                                        overflow: TextOverflow.ellipsis,
                                                        style: TextStyle(fontSize: 12.5, color: t.textMuted),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                  decoration: BoxDecoration(
                                                    color: tone != null
                                                        ? t.tones[tone].accent.withValues(alpha: 0.18)
                                                        : t.primarySoft,
                                                    borderRadius: BorderRadius.circular(12),
                                                  ),
                                                  child: Text(
                                                    tile.subtitle,
                                                    style: TextStyle(
                                                      fontSize: 11.5,
                                                      fontWeight: FontWeight.w700,
                                                      color: tone != null ? t.tones[tone].accent : t.textSecondary,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            )
                                          : Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    Container(
                                                      width: 38,
                                                      height: 38,
                                                      decoration: BoxDecoration(
                                                        color: tone != null
                                                            ? t.tones[tone].accent.withValues(alpha: 0.16)
                                                            : t.primarySoft,
                                                        borderRadius: BorderRadius.circular(12),
                                                      ),
                                                      child: Icon(
                                                        tile.icon,
                                                        size: 20,
                                                        color: tone != null ? t.tones[tone].accent : t.primaryAccent,
                                                      ),
                                                    ),
                                                    if (tile.eyebrow != null && tone != null)
                                                      BentoTile.eyebrow(context, tone, tile.eyebrow!),
                                                  ],
                                                ),
                                                const SizedBox(height: 12),
                                                Text(
                                                  tile.title,
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.w700,
                                                    fontSize: 14.5,
                                                  ),
                                                ),
                                                const SizedBox(height: 2),
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
                        );
                      },
                    ),
                ],
              );
            }

            // Fallback classic wrap
            return Wrap(
              spacing: gap,
              runSpacing: gap,
              children: [
                for (final tile in tiles)
                  SizedBox(
                    width: regularWidth,
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
                          onTap: () => triggerTileTap(tile),
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
