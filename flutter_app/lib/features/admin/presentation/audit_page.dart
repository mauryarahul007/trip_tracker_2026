import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../domain/models/admin.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../application/admin_providers.dart';
import 'admin_widgets.dart';

/// Security and operations audit trail, with the same retention purge as the web portal.
class AuditPage extends ConsumerStatefulWidget {
  const AuditPage({super.key});

  @override
  ConsumerState<AuditPage> createState() => _AuditPageState();
}

class _AuditPageState extends ConsumerState<AuditPage> {
  String _filter = 'all';

  Future<void> _refresh() async {
    ref.invalidate(adminAuditProvider);
    await ref.read(adminAuditProvider.future);
  }

  bool _matches(AuditEntry e) {
    final a = e.action;
    return switch (_filter) {
      'security' => ['auth', 'admin', 'wipe', 'purge', 'suspend'].any(a.contains),
      'trip' => a.contains('trip') || e.tripId != null,
      'user' => ['user', 'ban', 'broadcast'].any(a.contains),
      'flag' => a.contains('flag') || a.contains('config'),
      _ => true,
    };
  }

  Future<void> _purge() async {
    final days = ref.read(adminConfigProvider).value?.number('audit_log_retention_days')?.toInt() ?? 90;
    final ok = await ConfirmDialog.show(
      context: context,
      title: 'Purge old audit entries?',
      message: 'Deletes every audit log older than $days days (the retention setting). This cannot be undone.',
      confirmLabel: 'Purge',
      isDestructive: true,
    );
    if (!ok) return;
    try {
      final n = await ref.read(adminRepositoryProvider).purgeAuditLogs(days);
      ref.invalidate(adminAuditProvider);
      if (mounted) adminToast(context, 'Purged $n entries');
    } catch (e) {
      if (mounted) adminToast(context, '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final users = {for (final u in ref.watch(adminUsersProvider).value ?? const <AdminUser>[]) u.id: u.label};
    final trips = {for (final x in ref.watch(adminTripsProvider).value ?? const <AdminTrip>[]) x.id: x.name};
    return AdminAsync<List<AuditEntry>>(
      value: ref.watch(adminAuditProvider),
      onRefresh: _refresh,
      builder: (context, all) {
        final shown = all.where(_matches).toList();
        return ListView(
          key: const Key('audit-list'),
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 60),
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final (k, label) in const [
                    ('all', 'All'),
                    ('security', 'Security'),
                    ('trip', 'Trips'),
                    ('user', 'Users'),
                    ('flag', 'Flags & config'),
                  ])
                    AdminFilterChip(
                      key: Key('audit-filter-$k'),
                      label: label,
                      selected: _filter == k,
                      onTap: () => setState(() => _filter = k),
                    ),
                ],
              ),
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: AppButton(
                key: const Key('audit-purge'),
                label: 'Purge old entries',
                icon: Icons.cleaning_services_rounded,
                variant: AppButtonVariant.secondary,
                onPressed: _purge,
              ),
            ),
            const SizedBox(height: 8),
            if (shown.isEmpty)
              const EmptyState(
                icon: Icons.fact_check_outlined,
                title: 'No entries',
                subtitle: 'Nothing matches this filter.',
              )
            else
              for (final e in shown)
                ListTile(
                  key: Key('audit-${e.id}'),
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(_icon(e.action), color: t.primaryAccent),
                  title: Text(_title(e.action), style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text(
                    [
                      users[e.actorUserId] ?? e.actorUserId ?? 'Superadmin',
                      trips[e.tripId] ?? e.details['tripName'] ?? e.details['targetEmail'],
                    ].where((s) => s != null && '$s'.isNotEmpty).join(' · '),
                  ),
                  trailing: Text(
                    adminDate(e.createdAt),
                    style: TextStyle(fontFamily: AppTypography.fontMono, fontSize: 11, color: t.textSecondary),
                  ),
                ),
          ],
        );
      },
    );
  }

  static String _title(String action) {
    final words = action.replaceAll('_', ' ').trim();
    return words.isEmpty ? 'Activity' : words[0].toUpperCase() + words.substring(1);
  }

  static IconData _icon(String a) {
    if (a.contains('ban') || a.contains('suspend')) return Icons.block_rounded;
    if (a.contains('delete') || a.contains('purge') || a.contains('wipe')) return Icons.delete_outline_rounded;
    if (a.contains('flag') || a.contains('config')) return Icons.flag_outlined;
    if (a.contains('trip')) return Icons.luggage_outlined;
    if (a.contains('user') || a.contains('broadcast')) return Icons.people_outline_rounded;
    return Icons.bolt_rounded;
  }
}
