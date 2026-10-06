import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/flags/feature_flags.dart';
import '../../../../core/platform/haptics.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_scaffold.dart';
import '../../../../shared/widgets/offline_banner.dart';
import '../domain/trip_tabs.dart';

class TripShellScreen extends ConsumerWidget {
  const TripShellScreen({
    super.key,
    required this.tripId,
    required this.currentTab,
  });

  final String tripId;
  final String currentTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final flags = ref.watch(featureFlagsProvider);
    final tokens = context.tokens;

    final shouldShowNotes = showNotesNavTab(
      isNotesEnabled: flags.isNotesEnabled,
      isPassesEnabled: flags.isPassesEnabled,
      isTripChatEnabled: flags.isTripChatEnabled,
      isChatFirstNav: flags.isChatFirstNav,
    );

    final tabs = visibleTripTabs(
      isChatFirstNav: flags.isChatFirstNav,
      showNotesTab: shouldShowNotes,
    );

    final isSettings = currentTab == 'settings';

    // Map tab name to index in visible tabs
    final activeTabIndex = tabs.indexWhere((t) => t.name == currentTab);

    return AppScaffold(
      appBar: AppBar(
        title: Text(
          isSettings ? 'Trip Settings' : 'Kyoto & Tokyo Autumn',
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
        ),
        leading: IconButton(
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () {
            if (isSettings) {
              context.go('/trip/$tripId/expenses');
            } else {
              context.go('/');
            }
          },
        ),
        actions: [
          if (!isSettings) ...[
            IconButton(
              icon: const Icon(AppIcons.share),
              tooltip: 'Share',
              onPressed: () => context.push('/share/INVITE-$tripId'),
            ),
            IconButton(
              icon: const Icon(AppIcons.settings),
              tooltip: 'Settings',
              onPressed: () => context.go('/trip/$tripId/settings'),
            ),
          ],
        ],
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(child: _buildTabContent(context, currentTab)),
        ],
      ),
      bottomNavigationBar: isSettings
          ? null
          : BottomNavigationBar(
              currentIndex: activeTabIndex >= 0 ? activeTabIndex : 0,
              type: BottomNavigationBarType.fixed,
              backgroundColor: tokens.bgSurface,
              selectedItemColor: tokens.primaryAccent,
              unselectedItemColor: tokens.textMuted,
              selectedFontSize: 12,
              unselectedFontSize: 12,
              elevation: 8,
              onTap: (index) async {
                await AppHaptics.selection();
                final targetTab = tabs[index];
                if (context.mounted) {
                  context.go('/trip/$tripId/${targetTab.name}');
                }
              },
              items: tabs.map((tab) => _buildNavItem(tab)).toList(),
            ),
    );
  }

  BottomNavigationBarItem _buildNavItem(TripNavTab tab) {
    switch (tab) {
      case TripNavTab.chat:
        return const BottomNavigationBarItem(
          icon: Icon(AppIcons.chat),
          label: 'Chat',
        );
      case TripNavTab.expenses:
        return const BottomNavigationBarItem(
          icon: Icon(AppIcons.expenses),
          label: 'Expenses',
        );
      case TripNavTab.ledger:
        return const BottomNavigationBarItem(
          icon: Icon(AppIcons.ledger),
          label: 'Balances',
        );
      case TripNavTab.members:
        return const BottomNavigationBarItem(
          icon: Icon(AppIcons.members),
          label: 'Members',
        );
      case TripNavTab.notes:
        return const BottomNavigationBarItem(
          icon: Icon(AppIcons.notes),
          label: 'Notes',
        );
    }
  }

  Widget _buildTabContent(BuildContext context, String tab) {
    final tokens = context.tokens;

    switch (tab) {
      case 'expenses':
        return _buildPlaceholder(
          tokens,
          icon: AppIcons.expenses,
          title: 'Expenses & Transactions',
          subtitle:
              'Phase 7: Full offline-first expense ledger & receipt camera.',
        );
      case 'ledger':
        return _buildPlaceholder(
          tokens,
          icon: AppIcons.ledger,
          title: 'Balances & Settlements',
          subtitle: 'Phase 7: Multi-currency split settlements and debt simplification.',
        );
      case 'members':
        return _buildPlaceholder(
          tokens,
          icon: AppIcons.members,
          title: 'Squad & Members',
          subtitle:
              'Phase 8: Trip members, role permissions, and contact invites.',
        );
      case 'notes':
        return _buildPlaceholder(
          tokens,
          icon: AppIcons.notes,
          title: 'Notes & Checklists',
          subtitle: 'Phase 8: Shared packing lists, itinerary notes, and travel passes.',
        );
      case 'chat':
        return _buildPlaceholder(
          tokens,
          icon: AppIcons.chat,
          title: 'Trip Chat',
          subtitle: 'Phase 8: Realtime squad messaging and media attachments.',
        );
      case 'settings':
        return _buildPlaceholder(
          tokens,
          icon: AppIcons.settings,
          title: 'Trip & App Settings',
          subtitle: 'Phase 10: Currencies, category configuration, and account preferences.',
        );
      default:
        return Center(child: Text('Unknown tab: $tab'));
    }
  }

  Widget _buildPlaceholder(
    AppTokens tokens, {
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: tokens.primaryAccent.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 32, color: tokens.primaryAccent),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w700,
                color: tokens.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: tokens.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
