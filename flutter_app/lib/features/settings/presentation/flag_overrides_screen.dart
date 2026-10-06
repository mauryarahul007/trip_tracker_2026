import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/providers.dart';
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/widgets/app_scaffold.dart';

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
    final keys = defaultFeatureFlags.keys.where((k) => k.toLowerCase().contains(_q.toLowerCase())).toList()..sort();
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
            child: const Text('Reset all'),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              key: const Key('flags-search'),
              decoration: const InputDecoration(hintText: 'Search flags', prefixIcon: Icon(AppIcons.search)),
              onChanged: (v) => setState(() => _q = v),
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: keys.length,
              itemBuilder: (_, i) {
                final k = keys[i];
                final o = store.all[k];
                return ListTile(
                  key: Key('flag-$k'),
                  title: Text(k, style: const TextStyle(fontSize: 13)),
                  subtitle: Text(o == null ? 'Server value' : (o ? 'Forced ON' : 'Forced OFF')),
                  trailing: PopupMenuButton<int>(
                    key: Key('flag-menu-$k'),
                    onSelected: (v) async {
                      await store.set(k, v == 0 ? null : v == 1);
                      setState(() {});
                    },
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 0, child: Text('Use server value')),
                      PopupMenuItem(value: 1, child: Text('Force ON')),
                      PopupMenuItem(value: 2, child: Text('Force OFF')),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
