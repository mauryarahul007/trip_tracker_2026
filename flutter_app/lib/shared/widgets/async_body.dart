import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/l10n_ext.dart';
import '../theme/app_icons.dart';
import '../theme/app_tokens.dart';
import 'app_button.dart';
import 'empty_state.dart';
import 'skeleton_loader.dart';

/// Loading skeleton / error with Retry / data, for one [AsyncValue]. Keeps showing the last data
/// while a refresh is running, so a re-fetch never flashes the skeleton.
class AsyncBody<T> extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return value.when(
      skipLoadingOnReload: true,
      skipLoadingOnRefresh: true,
      loading: () => loading ?? const _SkeletonRows(),
      error: (_, _) => Center(
        child: SingleChildScrollView(
          child: EmptyState(
            key: const Key('async-error'),
            icon: AppIcons.alert,
            title: errorTitle ?? l10n.errorGenericTitle,
            subtitle: l10n.errorGenericMessage,
            action: AppButton(label: l10n.actionRetry, onPressed: onRetry),
          ),
        ),
      ),
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
