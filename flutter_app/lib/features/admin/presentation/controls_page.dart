import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../domain/models/admin.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_surface.dart';
import '../application/admin_providers.dart';
import 'admin_widgets.dart';

/// Server-enforced gates, limits and copy (`app_config`): they apply to every user the moment they are saved.
class ControlsPage extends ConsumerStatefulWidget {
  const ControlsPage({super.key});

  @override
  ConsumerState<ControlsPage> createState() => _ControlsPageState();
}

class _ControlsPageState extends ConsumerState<ControlsPage> {
  final _saving = <String>{};

  Future<void> _refresh() async {
    ref.invalidate(adminConfigProvider);
    await ref.read(adminConfigProvider.future);
  }

  /// Saves one key, then reloads so every field shows what the server now holds.
  Future<void> save(String key, Object? value, String label) async {
    setState(() => _saving.add(key));
    try {
      await ref.read(adminRepositoryProvider).setAppConfig(key, value);
      ref.invalidate(adminConfigProvider);
      await ref.read(adminConfigProvider.future);
      if (mounted) adminToast(context, '$label saved');
    } catch (e) {
      if (mounted) adminToast(context, '$e');
    } finally {
      if (mounted) setState(() => _saving.remove(key));
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return AdminAsync<AdminConfig>(
      value: ref.watch(adminConfigProvider),
      onRefresh: _refresh,
      builder: (context, cfg) {
        Widget gate(String key, String title, String sub) => SwitchListTile(
          key: Key('ctl-$key'),
          contentPadding: EdgeInsets.zero,
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text(sub, style: TextStyle(color: t.textSecondary, fontSize: 12.5)),
          value: cfg.flag(key),
          onChanged: _saving.contains(key) ? null : (v) => save(key, v, title),
        );
        Widget number(String key, String label, num fallback) => _ConfigField(
          key: ValueKey('ctl-field-$key'),
          label: label,
          initial: '${cfg.number(key) ?? fallback}',
          numeric: true,
          busy: _saving.contains(key),
          onSave: (v) {
            final n = num.tryParse(v.trim());
            if (n == null || n < 0) {
              adminToast(context, 'Enter a number for $label.');
              return;
            }
            save(key, n, label);
          },
        );
        Widget text(String key, String label, {int lines = 1}) => _ConfigField(
          key: ValueKey('ctl-field-$key'),
          label: label,
          initial: cfg.text(key),
          lines: lines,
          busy: _saving.contains(key),
          onSave: (v) => save(key, v.trim().isEmpty ? null : v.trim(), label),
        );
        return ListView(
          key: const Key('controls-list'),
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 60),
          children: [
            const AdminSectionLabel('Access gates'),
            AppCard(
              child: Column(
                children: [
                  gate(
                    'maintenance_mode',
                    'Maintenance mode',
                    'Blocks everyone except superadmins behind a maintenance screen.',
                  ),
                  const Divider(),
                  _MaintenanceWindow(
                    window: cfg.maintenanceWindow,
                    busy: _saving.contains('maintenance_window'),
                    onSave: (w) => save(
                      'maintenance_window',
                      w == null
                          ? null
                          : {'start': w.start.toUtc().toIso8601String(), 'end': w.end.toUtc().toIso8601String()},
                      'Maintenance window',
                    ),
                  ),
                  const Divider(),
                  gate(
                    'signup_gate',
                    'Sign-ins paused',
                    'Disables Google / Apple sign-in. Superadmin login still works.',
                  ),
                ],
              ),
            ),
            const AdminSectionLabel('Limits & retention'),
            AppCard(
              child: Column(
                children: [
                  number('join_max_attempts', 'Join-code max attempts', 5),
                  number('join_lockout_minutes', 'Join lockout (minutes)', 15),
                  number('recycle_bin_retention_hours', 'Recycle bin retention (hours)', 24),
                  number('expense_amount_ceiling', 'Expense amount ceiling', 0),
                  number('audit_log_retention_days', 'Audit log retention (days)', 90),
                ],
              ),
            ),
            const AdminSectionLabel('Alerting'),
            AppCard(child: text('ops_webhook_url', 'External webhook URL')),
            const AdminSectionLabel('Landing & empty-state copy'),
            AppCard(
              child: Column(
                children: [
                  text('landing_headline', 'Landing headline'),
                  text('landing_tagline', 'Landing tagline'),
                  text('landing_invite_blurb', 'Invite blurb', lines: 2),
                  text('empty_trip_blurb', 'Empty-trips blurb', lines: 2),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

/// One labelled setting with its own Save button.
class _ConfigField extends StatefulWidget {
  const _ConfigField({
    required this.label,
    required this.initial,
    required this.onSave,
    required this.busy,
    this.numeric = false,
    this.lines = 1,
    super.key,
  });

  final String label;
  final String initial;
  final bool numeric;
  final int lines;
  final bool busy;
  final ValueChanged<String> onSave;

  @override
  State<_ConfigField> createState() => _ConfigFieldState();
}

class _ConfigFieldState extends State<_ConfigField> {
  late final _c = TextEditingController(text: widget.initial);

  @override
  void didUpdateWidget(_ConfigField old) {
    super.didUpdateWidget(old);
    // Server value changed (after a save or refresh) while the user is not editing: show it.
    if (old.initial != widget.initial && _c.text == old.initial) _c.text = widget.initial;
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: TextField(
            controller: _c,
            minLines: 1,
            maxLines: widget.lines,
            keyboardType: widget.numeric ? TextInputType.number : TextInputType.text,
            decoration: InputDecoration(labelText: widget.label, isDense: true),
          ),
        ),
        const SizedBox(width: 10),
        FilledButton.tonal(
          key: Key('${(widget.key! as ValueKey<String>).value}-save'),
          onPressed: widget.busy ? null : () => widget.onSave(_c.text),
          child: const Text('Save'),
        ),
      ],
    ),
  );
}

class _MaintenanceWindow extends StatefulWidget {
  const _MaintenanceWindow({required this.window, required this.onSave, required this.busy});

  final ({DateTime start, DateTime end})? window;
  final bool busy;
  final ValueChanged<({DateTime start, DateTime end})?> onSave;

  @override
  State<_MaintenanceWindow> createState() => _MaintenanceWindowState();
}

class _MaintenanceWindowState extends State<_MaintenanceWindow> {
  late DateTime? _start = widget.window?.start.toLocal();
  late DateTime? _end = widget.window?.end.toLocal();

  Future<DateTime?> _pick(DateTime? current) async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: current ?? now,
      firstDate: now.subtract(const Duration(days: 1)),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (d == null || !mounted) return null;
    final tm = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(current ?? now));
    if (tm == null) return null;
    return DateTime(d.year, d.month, d.day, tm.hour, tm.minute);
  }

  String _fmt(DateTime? d) => d == null
      ? 'Not set'
      : '${adminDate(d)} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final valid = _start != null && _end != null && _end!.isAfter(_start!);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Scheduled window', style: TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            OutlinedButton(
              key: const Key('ctl-window-start'),
              onPressed: () async {
                final d = await _pick(_start);
                if (d != null) setState(() => _start = d);
              },
              child: Text('Start: ${_fmt(_start)}'),
            ),
            OutlinedButton(
              key: const Key('ctl-window-end'),
              onPressed: () async {
                final d = await _pick(_end);
                if (d != null) setState(() => _end = d);
              },
              child: Text('End: ${_fmt(_end)}'),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            AppButton(
              key: const Key('ctl-window-save'),
              label: 'Save window',
              variant: AppButtonVariant.secondary,
              onPressed: widget.busy || !valid ? null : () => widget.onSave((start: _start!, end: _end!)),
            ),
            const SizedBox(width: 8),
            TextButton(
              key: const Key('ctl-window-clear'),
              onPressed: widget.busy
                  ? null
                  : () {
                      setState(() {
                        _start = null;
                        _end = null;
                      });
                      widget.onSave(null);
                    },
              child: const Text('Clear'),
            ),
          ],
        ),
      ],
    );
  }
}
