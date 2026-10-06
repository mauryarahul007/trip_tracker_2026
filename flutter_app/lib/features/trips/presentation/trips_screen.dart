import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/env/app_env.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_scaffold.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/offline_banner.dart';

class TripsScreen extends ConsumerWidget {
  const TripsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final env = AppEnv.current;

    return AppScaffold(
      appBar: AppBar(
        title: const Text('My Trips'),
        actions: [
          if (env.flavor != AppFlavor.prod)
            IconButton(
              icon: const Icon(Icons.bug_report_outlined),
              tooltip: 'Staging Smoke Test',
              onPressed: () => context.push('/smoke-test'),
            ),
          IconButton(
            icon: const Icon(AppIcons.settings),
            tooltip: 'Settings',
            onPressed: () => context.push('/trip/demo-trip-123/settings'),
          ),
        ],
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                _buildTripCard(
                  context,
                  id: 'demo-trip-123',
                  name: 'Kyoto & Tokyo Autumn 2026',
                  dates: 'Oct 12 – Oct 24, 2026',
                  membersCount: 4,
                  totalExpenses: '¥ 428,500',
                ),
                const SizedBox(height: 12),
                _buildTripCard(
                  context,
                  id: 'demo-trip-456',
                  name: 'Alps Ski Week',
                  dates: 'Dec 18 – Dec 26, 2026',
                  membersCount: 6,
                  totalExpenses: '€ 3,120',
                ),
                const SizedBox(height: 24),
                EmptyState(
                  icon: AppIcons.expenses,
                  title: 'Ready for another adventure?',
                  subtitle: 'Create a new trip or join a group with an invitation link.',
                  action: AppButton(
                    label: 'Join with Code',
                    variant: AppButtonVariant.secondary,
                    onPressed: () => context.push('/join/TESTCODE'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          context.push('/trip/demo-trip-123/expenses');
        },
        backgroundColor: tokens.primaryAccent,
        foregroundColor: Colors.white,
        icon: const Icon(AppIcons.add),
        label: const Text('New Trip'),
      ),
    );
  }

  Widget _buildTripCard(
    BuildContext context, {
    required String id,
    required String name,
    required String dates,
    required int membersCount,
    required String totalExpenses,
  }) {
    final tokens = context.tokens;

    return InkWell(
      onTap: () => context.push('/trip/$id/expenses'),
      borderRadius: BorderRadius.circular(tokens.radiusLg),
      child: Container(
        padding: const EdgeInsets.all(16.0),
        decoration: BoxDecoration(
          color: tokens.bgSurface,
          borderRadius: BorderRadius.circular(tokens.radiusLg),
          border: Border.all(color: tokens.borderColor),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    name,
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: tokens.textPrimary,
                    ),
                  ),
                ),
                const Icon(AppIcons.chevronRight, size: 18),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              dates,
              style: TextStyle(fontSize: 13, color: tokens.textSecondary),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(AppIcons.members, size: 16, color: tokens.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      '$membersCount members',
                      style: TextStyle(fontSize: 13, color: tokens.textMuted),
                    ),
                  ],
                ),
                Text(
                  totalExpenses,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: tokens.textPrimary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
