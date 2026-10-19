import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../domain/logic/flag_defaults.g.dart';
import '../../../domain/models/admin.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/bento_tile.dart';
import '../../../shared/widgets/empty_state.dart';
import '../application/admin_providers.dart';
import 'admin_widgets.dart';

/// Feature flags: global switches plus per-trip and per-user overrides, backed by `feature_flag_overrides`.
class FlagsPage extends ConsumerStatefulWidget {
  const FlagsPage({super.key});

  @override
  ConsumerState<FlagsPage> createState() => _FlagsPageState();
}

class _FlagsPageState extends ConsumerState<FlagsPage> {
  String _query = '';
  String _pack = '';
  final _busy = <String>{};

  Future<void> _refresh() async {
    ref.invalidate(adminFlagOverridesProvider);
    await ref.read(adminFlagOverridesProvider.future);
  }

  Future<void> _toggle(String key, bool value) async {
    setState(() => _busy.add(key));
    try {
      await ref.read(adminRepositoryProvider).setFlagOverride('global', '', key, value);
      ref.invalidate(adminFlagOverridesProvider);
      await ref.read(adminFlagOverridesProvider.future);
    } catch (e) {
      if (mounted) adminToast(context, '$e');
    } finally {
      if (mounted) setState(() => _busy.remove(key));
    }
  }

  @override
  Widget build(BuildContext context) {
    final overrides = ref.watch(adminFlagOverridesProvider);
    final t = context.tokens;
    return AdminAsync<List<FlagOverride>>(
      value: overrides,
      onRefresh: _refresh,
      builder: (context, all) {
        final global = {
          for (final o in all)
            if (o.scope == 'global') o.flagKey: o.value,
        };
        final q = _query.trim().toLowerCase();
        bool matches(String k) =>
            q.isEmpty || k.toLowerCase().contains(q) || (flagMeta[k]?.label ?? '').toLowerCase().contains(q);
        // Same grouping as the web Ops Deck: one section per consumer pack, in rail order.
        final inPack = {for (final ks in consumerPacks.values) ...ks};
        final sections = <({String id, String title, String tagline, List<String> keys})>[
          for (final p in consumerPackInfo)
            if (_pack.isEmpty || _pack == p.id)
              (
                id: p.id,
                title: p.title,
                tagline: p.tagline,
                keys: [
                  for (final k in consumerPacks[p.id] ?? const <String>[])
                    if (flagMeta.containsKey(k) && matches(k)) k,
                ]..sort((a, b) => flagMeta[a]!.label.compareTo(flagMeta[b]!.label)),
              ),
          if (_pack.isEmpty)
            (
              id: 'other',
              title: 'Other flags',
              tagline: 'Not part of a consumer pack',
              keys: [
                for (final k in flagMeta.keys)
                  if (!inPack.contains(k) && matches(k)) k,
              ]..sort(),
            ),
        ];
        bool armed(String k) => global[k] ?? defaultFeatureFlags[k] ?? false;
        Widget row(String k) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: BentoTile(
            key: Key('flag-$k'),
            padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
            onTap: () => AppSheet.show<void>(
              context: context,
              title: flagMeta[k]!.label,
              builder: (_) => FlagDetailSheet(flagKey: k),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        flagMeta[k]!.label,
                        style: TextStyle(fontWeight: FontWeight.w700, color: t.textPrimary),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        k,
                        style: TextStyle(fontFamily: AppTypography.fontMono, fontSize: 11, color: t.textSecondary),
                      ),
                      if (global.containsKey(k) || all.any((o) => o.flagKey == k && o.scope != 'global')) ...[
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          children: [
                            if (global.containsKey(k)) AdminPill('OVERRIDDEN', color: t.primaryAccent),
                            if (all.any((o) => o.flagKey == k && o.scope != 'global'))
                              AdminPill(
                                '${all.where((o) => o.flagKey == k && o.scope != 'global').length} SCOPED',
                                color: t.colorWarning,
                              ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                Switch(
                  key: Key('flag-switch-$k'),
                  value: armed(k),
                  onChanged: _busy.contains(k) ? null : (v) => _toggle(k, v),
                ),
              ],
            ),
          ),
        );
        final visible = sections.where((s) => s.keys.isNotEmpty).toList();
        return ListView(
          key: const Key('flag-list'),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
          children: [
            AdminSearchField(hint: 'Search ${flagMeta.length} flags', onChanged: (v) => setState(() => _query = v)),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  AdminFilterChip(label: 'All', selected: _pack.isEmpty, onTap: () => setState(() => _pack = '')),
                  for (final p in consumerPackInfo)
                    AdminFilterChip(
                      key: Key('flag-pack-${p.id}'),
                      label: _short(p.code),
                      selected: _pack == p.id,
                      onTap: () => setState(() => _pack = _pack == p.id ? '' : p.id),
                    ),
                ],
              ),
            ),
            if (visible.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 24),
                child: EmptyState(
                  icon: Icons.flag_outlined,
                  title: 'No flags',
                  subtitle: 'Nothing matches these filters.',
                ),
              )
            else
              for (final s in visible) ...[
                Padding(
                  key: Key('flag-section-${s.id}'),
                  padding: const EdgeInsets.fromLTRB(4, 18, 4, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              s.title,
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: t.textPrimary),
                            ),
                          ),
                          AdminPill('${s.keys.where(armed).length}/${s.keys.length} ON', color: t.primaryAccent),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(s.tagline, style: TextStyle(fontSize: 12.5, color: t.textSecondary)),
                    ],
                  ),
                ),
                for (final k in s.keys) row(k),
              ],
          ],
        );
      },
    );
  }
}

String _short(String code) => code.isEmpty ? code : code[0] + code.substring(1).toLowerCase();

/// What a flag does, its default, a reset for the global value, and its per-trip / per-user overrides.
class FlagDetailSheet extends ConsumerStatefulWidget {
  const FlagDetailSheet({required this.flagKey, super.key});

  final String flagKey;

  @override
  ConsumerState<FlagDetailSheet> createState() => _FlagDetailSheetState();
}

class _FlagDetailSheetState extends ConsumerState<FlagDetailSheet> {
  String _scope = 'trip';
  String? _scopeId;
  bool _value = true;
  String? _error;

  Future<void> _set(String scope, String scopeId, bool? value) async {
    setState(() => _error = null);
    try {
      await ref.read(adminRepositoryProvider).setFlagOverride(scope, scopeId, widget.flagKey, value);
      ref.invalidate(adminFlagOverridesProvider);
      await ref.read(adminFlagOverridesProvider.future);
      if (mounted) setState(() => _scopeId = null);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final meta = flagMeta[widget.flagKey]!;
    final overrides = [
      for (final o in ref.watch(adminFlagOverridesProvider).value ?? const <FlagOverride>[])
        if (o.flagKey == widget.flagKey) o,
    ];
    final trips = ref.watch(adminTripsProvider).value ?? const <AdminTrip>[];
    final users = ref.watch(adminUsersProvider).value ?? const <AdminUser>[];
    String name(FlagOverride o) => o.scope == 'trip'
        ? (trips.where((x) => x.id == o.scopeId).firstOrNull?.name ?? o.scopeId)
        : o.scope == 'user'
        ? (users.where((u) => u.id == o.scopeId).firstOrNull?.label ?? o.scopeId)
        : 'Everyone';
    final options = _scope == 'trip'
        ? [for (final x in trips) (x.id, x.name)]
        : [for (final u in users) (u.id, u.label)];
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            widget.flagKey,
            style: TextStyle(fontFamily: AppTypography.fontMono, fontSize: 12, color: t.textSecondary),
          ),
          const SizedBox(height: 8),
          Text(meta.description, style: TextStyle(color: t.textPrimary, height: 1.35)),
          const SizedBox(height: 8),
          Text(
            'Default: ${(defaultFeatureFlags[widget.flagKey] ?? false) ? 'ON' : 'OFF'} · Pack: ${meta.pack}',
            style: TextStyle(color: t.textSecondary),
          ),
          const SizedBox(height: 12),
          if (overrides.any((o) => o.scope == 'global'))
            AppButton(
              key: const Key('flag-reset-global'),
              label: 'Reset global value to default',
              variant: AppButtonVariant.secondary,
              onPressed: () => _set('global', '', null),
            ),
          const AdminSectionLabel('Overrides'),
          if (overrides.where((o) => o.scope != 'global').isEmpty)
            Text('No per-trip or per-user overrides.', style: TextStyle(color: t.textSecondary))
          else
            for (final o in overrides.where((o) => o.scope != 'global'))
              ListTile(
                key: Key('flag-override-${o.scope}-${o.scopeId}'),
                contentPadding: EdgeInsets.zero,
                dense: true,
                title: Text(name(o)),
                subtitle: Text('${o.scope} · ${o.value ? 'ON' : 'OFF'}'),
                trailing: IconButton(
                  tooltip: 'Remove override',
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => _set(o.scope, o.scopeId, null),
                ),
              ),
          const AdminSectionLabel('Add override'),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'trip', label: Text('Trip')),
              ButtonSegment(value: 'user', label: Text('User')),
            ],
            selected: {_scope},
            onSelectionChanged: (s) => setState(() {
              _scope = s.first;
              _scopeId = null;
            }),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            key: Key('flag-scope-$_scope'),
            initialValue: _scopeId,
            isExpanded: true,
            hint: Text('Pick a $_scope'),
            items: [
              for (final (id, label) in options)
                DropdownMenuItem(
                  value: id,
                  child: Text(label, overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: (v) => setState(() => _scopeId = v),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(_value ? 'Force ON' : 'Force OFF'),
            value: _value,
            onChanged: (v) => setState(() => _value = v),
          ),
          AppButton(
            key: const Key('flag-add-override'),
            label: 'Save override',
            onPressed: _scopeId == null ? null : () => _set(_scope, _scopeId!, _value),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                _error!,
                key: const Key('flag-error'),
                style: TextStyle(color: t.colorDanger),
              ),
            ),
        ],
      ),
    );
  }
}
