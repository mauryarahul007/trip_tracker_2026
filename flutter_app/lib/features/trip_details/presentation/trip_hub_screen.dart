import '../../notifications/application/notification_prefs_providers.dart';
import '../../chat/application/chat_providers.dart';
import '../../../domain/models/expense.dart';
import '../../../core/clock.dart';
import '../../../domain/logic/expense_list_logic.dart' show isActualExpense;
import '../../../domain/logic/trip_status.dart';
import '../../notes/application/itinerary_providers.dart';
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
import '../../../shared/widgets/skeleton_loader.dart';
import '../../expenses/application/expenses_providers.dart';
import '../../expenses/presentation/trip_tools_sheet.dart';
import '../../travel/presentation/live_location_share_modal.dart';
import '../../trips/application/trips_providers.dart';
import '../../trips/presentation/widgets/share_trip_sheet.dart';
import '../application/trip_nav.dart';
import '../domain/trip_tabs.dart';
import 'widgets/horizon_hub.dart';

enum _HubHaptic { selection, medium, light }

/// Sentence-case tile label (the shared Eyebrow shouts in ALL CAPS, which is noisy on the Hub).
Widget _hubEyebrow(BuildContext context, BentoTone tone, String text) => Text(
  text,
  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: context.tokens.tones[tone].accent),
);

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
    if (trip == null) return const SkeletonPage(shape: SkeletonShape.list);
    final cover = ref.watch(tripCoverProvider(tripCoverKey(trip))).value;
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
        eyebrow: 'Navigate',
        hapticType: _HubHaptic.selection,
      ),
      _HubTile(
        'hub-people',
        AppIcons.members,
        l10n.navMembers,
        '$members traveler${members == 1 ? '' : 's'}',
        () => context.go('/trip/$tripId/members'),
        tone: BentoTone.sky,
        eyebrow: 'People',
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
          eyebrow: 'Plans',
          hapticType: _HubHaptic.selection,
        ),
      _HubTile(
        'hub-receipts',
        Icons.receipt_long_outlined,
        l10n.receiptsTitle,
        receiptsFact,
        () => context.push('/trip/$tripId/receipts'),
        tone: BentoTone.peach,
        eyebrow: 'Receipts',
        hapticType: _HubHaptic.selection,
      ),
      _HubTile(
        'hub-invite',
        AppIcons.share,
        'Invite',
        trip.joinCode.isEmpty ? 'Code, link, QR' : 'Code ${trip.joinCode}',
        () {
          AppSheet.show<void>(
            context: context,
            title: l10n.inviteSheetTitle,
            builder: (_) => ShareTripSheet(tripId: tripId),
          );
        },
        tone: BentoTone.lilac,
        eyebrow: 'Share',
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
        eyebrow: 'Manage',
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
        eyebrow: 'Route',
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
        eyebrow: 'Alerts',
        hapticType: _HubHaptic.light,
      ),
      _HubTile(
        'hub-live',
        AppIcons.location,
        'Live location',
        'Share where you are',
        live,
        tone: BentoTone.mint,
        eyebrow: 'Safety',
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
        eyebrow: 'Utilities',
        hapticType: _HubHaptic.medium,
      ),
      _HubTile(
        'hub-settings',
        AppIcons.settings,
        l10n.tripSettingsMenu,
        'Currency, rules, members',
        () => context.push('/trip/$tripId/settings'),
        eyebrow: 'Preferences',
        hapticType: _HubHaptic.selection,
      ),
      _HubTile(
        'hub-app-settings',
        Icons.tune_rounded,
        l10n.tripAppSettings,
        'Theme, language, account',
        () => context.push('/settings'),
        eyebrow: 'App',
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

    if (t.horizon) {
      // Live subtitles ("Day 4 · 3 activities", "Food is 38%") in place of the fixed descriptions.
      final now = ref.read(nowProvider)();
      final status = tripStatus(trip.startDate, trip.endDate, now);
      final plans = ref.watch(tripItineraryProvider(tripId));
      final todayKey =
          '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
      final todayPlans = plans.where((p) => p.date == todayKey).length;
      final spend = (ref.watch(tripExpensesProvider(tripId)).value ?? const <Expense>[])
          .where((e) => isActualExpense(e) && !e.excludeFromTotals)
          .toList();
      final byCat = <String, double>{};
      for (final e in spend) {
        byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
      }
      final total = byCat.values.fold<double>(0, (a, b) => a + b);
      String? topCat;
      if (total > 0) {
        final top = byCat.entries.reduce((a, b) => a.value >= b.value ? a : b);
        final name = ref.watch(tripCategoriesProvider(tripId)).where((c) => c.id == top.key).firstOrNull?.name;
        if (name != null) topCat = l10n.horizonHubTopCategory(name.split(' ').first, (top.value / total * 100).round());
      }
      final groups = ref.watch(tripGroupsProvider(tripId)).value?.length ?? 0;
      final sub = <String, String>{
        if (status.phase == TripPhase.active)
          (t.calm ? 'hub-plans' : 'hub-notes'): l10n.horizonHubDayPlans(status.dayNumber, todayPlans)
        else if (plans.isNotEmpty)
          (t.calm ? 'hub-plans' : 'hub-notes'): l10n.horizonHubPlansCount(plans.length),
        'hub-people': groups > 0 ? l10n.horizonHubPeopleGroups(members, groups) : l10n.horizonHubPeople(members),
        'hub-insights': ?topCat,
        'hub-tools': l10n.horizonHubToolsSub,
        'hub-settings': l10n.horizonHubSettingsSub,
      };
      final title = <String, String>{'hub-people': l10n.horizonPeopleTitle};
      _HubTile byKey(String k) {
        final x = tiles.firstWhere((x) => x.key == k);
        return _HubTile(
          x.key,
          x.icon,
          title[k] ?? x.title,
          sub[k] ?? x.subtitle,
          x.onTap,
          tone: x.tone,
          eyebrow: x.eyebrow,
          isWide: x.isWide,
          hapticType: x.hapticType,
        );
      }

      final grid = <(_HubTile, BentoTone?)>[
        if (hasNotes) (byKey(t.calm ? 'hub-plans' : 'hub-notes'), BentoTone.sky),
        (byKey('hub-people'), BentoTone.lilac),
        (byKey('hub-receipts'), BentoTone.peach),
        (
          _HubTile(
            'hub-insights',
            Icons.bar_chart_rounded,
            l10n.horizonHubInsights,
            topCat ?? l10n.horizonHubInsightsSub,
            () => context.push('/trip/$tripId/insights'),
          ),
          BentoTone.mint,
        ),
        (byKey('hub-invite'), BentoTone.butter),
        (byKey('hub-tools'), null),
      ];
      final rows = [byKey('hub-live'), byKey('hub-settings'), byKey('hub-edit'), byKey('hub-app-settings')];
      return ListView(
        key: const Key('trip-hub'),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          HorizonRouteCard(
            key: const Key('hub-map'),
            label: mapOpen ? l10n.horizonHubRouteShowing : l10n.horizonHubRoute,
            onTap: () {
              AppHaptics.light();
              ref.read(tripMapOpenProvider(tripId).notifier).toggle();
            },
          ),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, c) {
              final w = (c.maxWidth - 10) / 2;
              return Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final (tile, tone) in grid)
                    SizedBox(
                      width: w,
                      child: HorizonHubTile(
                        key: Key(tile.key),
                        icon: tile.icon,
                        title: tile.title,
                        subtitle: tile.subtitle,
                        tone: tone,
                        onTap: () => triggerTileTap(tile),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: 12),
          Material(
            color: t.bgSurface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
              side: BorderSide(color: t.borderColor),
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                for (final (i, r) in rows.indexed) ...[
                  if (i > 0) Divider(height: 1, indent: 64, color: t.borderColor),
                  ListTile(
                    key: Key(r.key),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
                    leading: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(color: t.bgSurfaceHover, borderRadius: BorderRadius.circular(10)),
                      child: Icon(r.icon, size: 20, color: t.textSecondary),
                    ),
                    title: Text(
                      r.title,
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: t.textPrimary),
                    ),
                    subtitle: Text(r.subtitle, style: TextStyle(fontSize: 12, color: t.textSecondary)),
                    trailing: Icon(Icons.chevron_right_rounded, color: t.textMuted),
                    onTap: () => triggerTileTap(r),
                  ),
                ],
              ],
            ),
          ),
        ],
      );
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
                trip.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white),
              ),
              if ((trip.destination ?? '').isNotEmpty)
                Text(trip.destination!, style: const TextStyle(color: Colors.white70, fontSize: 13)),
            ],
          ),
        ),
        const SizedBox(height: 14),
        LayoutBuilder(
          builder: (context, c) {
            final isWideScreen = c.maxWidth >= 560;
            // Calm Hub stays 2-column max so tiles stay thumb-sized; Bento may use 3 on wide.
            final cols = isBento && isWideScreen ? 3 : 2;
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
                                                        _hubEyebrow(context, tone, tile.eyebrow!),
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
                                                      _hubEyebrow(context, tone, tile.eyebrow!),
                                                  ],
                                                ),
                                                const SizedBox(height: 12),
                                                Text(
                                                  tile.title,
                                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
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

            // Quiet 2-col grid: 4 daily trip actions up front (People, Plans/Notes, Receipts, Invite);
            // everything else, including All trips and App settings, sits under More.
            const primaryKeys = {'hub-people', 'hub-plans', 'hub-notes', 'hub-invite', 'hub-receipts'};
            final primary = [
              for (final tile in tiles)
                if (primaryKeys.contains(tile.key)) tile,
            ];
            final more = [
              for (final tile in tiles)
                if (!primaryKeys.contains(tile.key)) tile,
            ];

            Widget tileCard(_HubTile tile) => SizedBox(
              width: regularWidth,
              child: Semantics(
                button: true,
                label: '${tile.title}. ${tile.subtitle}',
                child: Material(
                  color: t.bgSurface,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: t.borderColor),
                  ),
                  child: InkWell(
                    key: Key(tile.key),
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => triggerTileTap(tile),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: 96),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: ExcludeSemantics(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(tile.icon, size: 22, color: t.textSecondary),
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
            );

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Wrap(spacing: gap, runSpacing: gap, children: [for (final tile in primary) tileCard(tile)]),
                if (more.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  // Its own transparent Material: the trip sheet behind it paints a colour, which would hide the
                  // header's ink splash (and trips the ListTile debug check).
                  Material(
                    type: MaterialType.transparency,
                    child: Theme(
                      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                      child: ExpansionTile(
                        key: const Key('hub-more'),
                        initiallyExpanded: false,
                        tilePadding: EdgeInsets.zero,
                        title: Text(
                          'More',
                          style: TextStyle(fontWeight: FontWeight.w700, color: t.textSecondary),
                        ),
                        children: [
                          Wrap(spacing: gap, runSpacing: gap, children: [for (final tile in more) tileCard(tile)]),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            );
          },
        ),
      ],
    );
  }
}
