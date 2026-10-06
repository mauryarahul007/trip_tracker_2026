import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/empty_state.dart';

/// Placeholder until Phase 10 (settings, currencies, categories).
class TripSettingsStub extends StatelessWidget {
  const TripSettingsStub({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AppScaffold(
      appBar: AppBar(
        title: Text(l10n.navSettings),
        leading: IconButton(icon: const Icon(AppIcons.back, size: 20), onPressed: () => context.pop()),
      ),
      body: EmptyState(icon: AppIcons.settings, title: l10n.navSettings, subtitle: l10n.tripSettingsComingSoon),
    );
  }
}
