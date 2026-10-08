import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/providers.dart';
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_surface.dart' show AppCard, Eyebrow;

/// Dev and staging only: force a flag on or off on this device. The store is never wired
/// in prod builds (see `flagsRepositoryProvider`), so this screen is inert there.
class FlagOverridesScreen extends ConsumerStatefulWidget {
  const FlagOverridesScreen({super.key});

  @override
  ConsumerState<FlagOverridesScreen> createState() => _FlagOverridesScreenState();
}

class _FlagOverridesScreenState extends ConsumerState<FlagOverridesScreen> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final store = ref.watch(flagOverrideStoreProvider);
    final all = defaultFeatureFlags.keys.where((k) => k.toLowerCase().contains(_q.toLowerCase())).toList()..sort();
    // Forced flags first so an override is never forgotten.
    final forced = [
      for (final k in all)
        if (store.all[k] != null) k,
    ];
    final rest = [
      for (final k in all)
        if (store.all[k] == null) k,
    ];
    final t = context.tokens;
    Widget row(String k) => Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: AppCard(
        key: Key('flag-$k'),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(k, style: const TextStyle(fontFamily: AppTypography.fontMono, fontSize: 12.5)),
                  const SizedBox(height: 2),
                  Text(
                    store.all[k] == null ? 'Server value' : (store.all[k]! ? 'Forced ON' : 'Forced OFF'),
                    style: TextStyle(fontSize: 11.5, color: t.textMuted),
                  ),
                  Text(
                    'Default: ${defaultFeatureFlags[k] == true ? 'on' : 'off'}',
                    style: TextStyle(fontSize: 11, color: t.textMuted),
                  ),
                ],
              ),
            ),
            _TriState(
              flagKey: k,
              value: store.all[k],
              onChanged: (v) async {
                await store.set(k, v);
                setState(() {});
              },
            ),
          ],
        ),
      ),
    );

    return AppScaffold(
      appBar: AppBar(
        title: const Text('Flag overrides'),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.pop(),
        ),
        actions: [
          TextButton(
            key: const Key('flags-clear'),
            onPressed: () async {
              await store.clear();
              setState(() {});
            },
            child: Text('Reset all', style: TextStyle(color: t.dangerColor)),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
        children: [
          TextField(
            key: const Key('flags-search'),
            decoration: InputDecoration(
              hintText: 'Search flags',
              prefixIcon: const Icon(AppIcons.search),
              filled: true,
              fillColor: t.bgSurface,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(99), borderSide: BorderSide.none),
            ),
            onChanged: (v) => setState(() => _q = v),
          ),
          const SizedBox(height: 12),
          if (forced.isNotEmpty) ...[
            Row(
              children: [
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: t.warningColor.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    child: Text(
                      '${forced.length} overridden',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: t.warningColor),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Text('These stay until you reset them', style: TextStyle(fontSize: 12, color: t.textMuted)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            for (final k in forced) row(k),
            const SizedBox(height: 8),
          ],
          Padding(padding: const EdgeInsets.only(bottom: 8, left: 2), child: Eyebrow('All flags · ${rest.length}')),
          for (final k in rest) row(k),
        ],
      ),
    );
  }
}

/// Server / On / Off pill; forced states tint green or red.
class _TriState extends StatelessWidget {
  const _TriState({required this.flagKey, required this.value, required this.onChanged});

  final String flagKey;
  final bool? value;
  final ValueChanged<bool?> onChanged;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    Widget seg(String id, String label, bool selected, Color tint, bool? target) => InkWell(
      key: Key('flag-$id-$flagKey'),
      borderRadius: BorderRadius.circular(99),
      onTap: () => onChanged(target),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? tint.withValues(alpha: 0.16) : Colors.transparent,
          borderRadius: BorderRadius.circular(99),
        ),
        child: Text(
          label,
          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: selected ? tint : t.textSecondary),
        ),
      ),
    );
    return DecoratedBox(
      decoration: BoxDecoration(color: t.bgSurfaceHover, borderRadius: BorderRadius.circular(99)),
      child: Padding(
        padding: const EdgeInsets.all(3),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            seg('server', 'Server', value == null, t.primaryAccent, null),
            seg('on', 'On', value == true, t.successColor, true),
            seg('off', 'Off', value == false, t.dangerColor, false),
          ],
        ),
      ),
    );
  }
}
