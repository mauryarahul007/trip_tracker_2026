import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/connectivity_provider.dart';
import '../../data/providers.dart';

import '../../l10n/l10n_ext.dart';
import '../theme/app_icons.dart';
import '../theme/app_tokens.dart';
import 'app_button.dart';
import 'empty_state.dart';
import 'friendly_error.dart';
import 'skeleton_loader.dart';

/// Loading skeleton / error with Retry / data, for one [AsyncValue]. Keeps showing the last data
/// while a refresh is running, so a re-fetch never flashes the skeleton. Errors say why (offline, signed out,
/// server) via [friendlyError].
class AsyncBody<T> extends ConsumerWidget {
  const AsyncBody({
    required this.value,
    required this.builder,
    required this.onRetry,
    this.loading,
    this.errorTitle,
    super.key,
  });

  final AsyncValue<T> value;
  final Widget Function(BuildContext context, T data) builder;
  final VoidCallback onRetry;

  /// Defaults to three skeleton rows.
  final Widget? loading;

  /// Defaults to the generic message.
  final String? errorTitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final online = ref.watch(isOnlineProvider).value ?? true;
    final clear = ref.watch(flagProvider(('enableClearErrorStates', null))).value ?? true;
    return value.when(
      skipLoadingOnReload: true,
      skipLoadingOnRefresh: true,
      loading: () => loading ?? const _SkeletonRows(),
      error: (e, _) {
        final copy = friendlyError(l10n, e, online: online, clear: clear);
        return Center(
          child: SingleChildScrollView(
            child: EmptyState(
              key: const Key('async-error'),
              icon: online ? AppIcons.alert : Icons.cloud_off_rounded,
              title: errorTitle ?? copy.title,
              subtitle: copy.message,
              action: AppButton(label: l10n.actionRetry, onPressed: onRetry),
            ),
          ),
        );
      },
      data: (data) => builder(context, data),
    );
  }
}

class _SkeletonRows extends StatelessWidget {
  const _SkeletonRows();

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return ListView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        for (var i = 0; i < 3; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: SkeletonLoader(
              child: Container(
                height: 72,
                decoration: BoxDecoration(
                  color: tokens.bgSurface,
                  borderRadius: BorderRadius.circular(tokens.radiusMd),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
