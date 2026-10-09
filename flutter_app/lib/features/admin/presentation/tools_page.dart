import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../domain/models/admin.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_surface.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../application/admin_providers.dart';
import 'admin_widgets.dart';

/// System tools: service health, recycle-bin purge and the superadmin password.
class ToolsPage extends ConsumerStatefulWidget {
  const ToolsPage({super.key});

  @override
  ConsumerState<ToolsPage> createState() => _ToolsPageState();
}

class _ToolsPageState extends ConsumerState<ToolsPage> {
  List<ServiceCheck>? _checks;
  bool _pinging = false;
  final _days = TextEditingController(text: '30');
  final _pw = TextEditingController();
  final _pw2 = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _days.dispose();
    _pw.dispose();
    _pw2.dispose();
    super.dispose();
  }

  Future<void> _ping() async {
    setState(() => _pinging = true);
    try {
      final r = await ref.read(adminRepositoryProvider).pingServices();
      if (mounted) setState(() => _checks = r);
    } catch (e) {
      if (mounted) adminToast(context, '$e');
    } finally {
      if (mounted) setState(() => _pinging = false);
    }
  }

  Future<void> _purge() async {
    final days = int.tryParse(_days.text.trim());
    if (days == null || days < 0) {
      adminToast(context, 'Enter the age in days.');
      return;
    }
    final ok = await ConfirmDialog.show(
      context: context,
      title: 'Purge the recycle bin?',
      message: 'Permanently deletes expenses that were binned more than $days days ago, in every trip.',
      confirmLabel: 'Purge',
      isDestructive: true,
    );
    if (!ok) return;
    try {
      final n = await ref.read(adminRepositoryProvider).purgeRecycleBin(days);
      ref.invalidate(adminRecycledCountProvider);
      if (mounted) adminToast(context, 'Purged $n expenses');
    } catch (e) {
      if (mounted) adminToast(context, '$e');
    }
  }

  Future<void> _changePassword() async {
    if (_pw.text.length < 8) {
      adminToast(context, 'Use at least 8 characters.');
      return;
    }
    if (_pw.text != _pw2.text) {
      adminToast(context, 'The two passwords differ.');
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(adminRepositoryProvider).changePassword(_pw.text);
      _pw.clear();
      _pw2.clear();
      if (mounted) adminToast(context, 'Password changed');
    } catch (e) {
      if (mounted) adminToast(context, '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final binned = ref.watch(adminRecycledCountProvider);
    return ListView(
      key: const Key('tools-list'),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 60),
      children: [
        const AdminSectionLabel('Service health'),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_checks == null)
                Text('Not checked yet.', style: TextStyle(color: t.textSecondary))
              else
                for (final c in _checks!)
                  ListTile(
                    key: Key('check-${c.name}'),
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      c.ok ? Icons.check_circle_rounded : Icons.error_rounded,
                      color: c.ok ? t.colorSuccess : t.colorDanger,
                    ),
                    title: Text(c.name),
                    trailing: Text(c.ok ? '${c.ms} ms' : 'DOWN'),
                  ),
              const SizedBox(height: 8),
              AppButton(
                key: const Key('tools-ping'),
                label: 'Ping services',
                icon: Icons.network_ping_rounded,
                variant: AppButtonVariant.secondary,
                isLoading: _pinging,
                onPressed: _pinging ? null : _ping,
              ),
            ],
          ),
        ),
        const AdminSectionLabel('Recycle bin'),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                binned.when(
                  data: (n) => '$n expenses are waiting in recycle bins.',
                  loading: () => 'Counting…',
                  error: (e, _) => '$e',
                ),
                key: const Key('tools-binned'),
              ),
              const SizedBox(height: 8),
              TextField(
                key: const Key('tools-days'),
                controller: _days,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Delete anything older than (days)', isDense: true),
              ),
              const SizedBox(height: 10),
              AppButton(
                key: const Key('tools-purge'),
                label: 'Purge recycle bin',
                icon: Icons.delete_sweep_rounded,
                variant: AppButtonVariant.secondary,
                onPressed: _purge,
              ),
            ],
          ),
        ),
        const AdminSectionLabel('Change password'),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                key: const Key('tools-pw'),
                controller: _pw,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'New password', isDense: true),
              ),
              const SizedBox(height: 8),
              TextField(
                key: const Key('tools-pw2'),
                controller: _pw2,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Repeat new password', isDense: true),
              ),
              const SizedBox(height: 10),
              AppButton(
                key: const Key('tools-pw-save'),
                label: 'Change password',
                isLoading: _busy,
                onPressed: _busy ? null : _changePassword,
              ),
            ],
          ),
        ),
        const AdminSectionLabel('Still in the web Ops Deck'),
        Text(
          'Landing cover gallery, brand keyword tagging, the fleet financial integrity scanner, '
          'backup and demo data, and the growth panels (activation funnel, win-back list) are only in the web portal. '
          'Use the open-in-browser button at the top.',
          style: TextStyle(color: t.textSecondary, height: 1.35),
        ),
      ],
    );
  }
}
