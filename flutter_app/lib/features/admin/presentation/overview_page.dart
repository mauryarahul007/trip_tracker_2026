import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../domain/models/admin.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/bento_tile.dart';
import '../application/admin_providers.dart';
import 'admin_widgets.dart';
import 'bug_ledger_page.dart';

/// Platform at a glance, all computed from the lists the other tabs load (one fetch each, shared).
class OverviewPage extends ConsumerWidget {
  const OverviewPage({required this.onGo, super.key});

  /// Switches the portal to a tab index (0 overview, 1 bugs, 2 users, 3 trips, 4 flags).
  final ValueChanged<int> onGo;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bugs = ref.watch(adminBugsProvider);
    final users = ref.watch(adminUsersProvider);
    final trips = ref.watch(adminTripsProvider);
    final flags = ref.watch(adminFlagOverridesProvider);
    final t = context.tokens;

    Future<void> refresh() async {
      ref.invalidate(adminBugsProvider);
      ref.invalidate(adminUsersProvider);
      ref.invalidate(adminTripsProvider);
      ref.invalidate(adminFlagOverridesProvider);
      await Future.wait([
        ref.read(adminBugsProvider.future),
        ref.read(adminUsersProvider.future),
        ref.read(adminTripsProvider.future),
        ref.read(adminFlagOverridesProvider.future),
      ]);
    }

    Widget tile(Key key, BentoTone tone, IconData icon, String label, String value, String sub, int tab) => Expanded(
      child: BentoTile(
        key: key,
        tone: tone,
        padding: const EdgeInsets.all(14),
        onTap: () => onGo(tab),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: t.textPrimary),
            const SizedBox(height: 10),
            BentoTile.eyebrow(context, tone, label),
            const SizedBox(height: 2),
            Text(
              value,
              style: TextStyle(
                fontFamily: AppTypography.fontTitle,
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: t.textPrimary,
              ),
            ),
            Text(sub, style: TextStyle(fontSize: 12, color: t.textSecondary)),
          ],
        ),
      ),
    );

    String v<T>(AsyncValue<T> a, String Function(T) f) => a.when(data: f, loading: () => '…', error: (_, _) => '—');

    final openBugs = bugs.value?.where((b) => b.isOpen).toList() ?? const <AdminBug>[];
    final urgent = openBugs.where((b) => b.severity == 'critical' || b.severity == 'high').toList();

    return RefreshIndicator(
      onRefresh: refresh,
      child: ListView(
        key: const Key('admin-overview'),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
        children: [
          Row(
            children: [
              tile(
                const Key('ov-bugs'),
                BentoTone.peach,
                Icons.bug_report_rounded,
                'Open bugs',
                v(bugs, (b) => '${b.where((x) => x.isOpen).length}'),
                v(
                  bugs,
                  (b) =>
                      '${b.where((x) => x.isOpen && (x.severity == 'critical' || x.severity == 'high')).length} critical / high',
                ),
                1,
              ),
              const SizedBox(width: 12),
              tile(
                const Key('ov-users'),
                BentoTone.sky,
                Icons.people_alt_rounded,
                'Users',
                v(users, (u) => '${u.length}'),
                v(users, (u) => '${u.where((x) => x.banned).length} banned'),
                2,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              tile(
                const Key('ov-trips'),
                BentoTone.mint,
                Icons.luggage_rounded,
                'Trips',
                v(trips, (x) => '${x.length}'),
                v(
                  trips,
                  (x) =>
                      '${x.where((e) => e.status == 'active').length} active · ${x.where((e) => e.frozen).length} grounded',
                ),
                3,
              ),
              const SizedBox(width: 12),
              tile(
                const Key('ov-flags'),
                BentoTone.lilac,
                Icons.flag_rounded,
                'Flag overrides',
                v(flags, (f) => '${f.length}'),
                v(flags, (f) => '${f.where((o) => o.scope != 'global').length} scoped'),
                4,
              ),
            ],
          ),
          const AdminSectionLabel('Needs attention'),
          if (urgent.isEmpty)
            Text(bugs.hasValue ? 'No open critical or high bugs.' : '', style: TextStyle(color: t.textSecondary))
          else
            for (final b in urgent.take(5))
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: BugTicket(bug: b, onTap: () => onGo(1)),
              ),
        ],
      ),
    );
  }
}
