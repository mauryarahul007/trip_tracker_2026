import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/platform/external_launcher.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_scaffold.dart';

class TermsScreen extends ConsumerWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;

    return AppScaffold(
      appBar: AppBar(
        title: const Text('Terms of Service'),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Terms of Service',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: tokens.textPrimary),
            ),
            const SizedBox(height: 12),
            Text(
              'By using Trip Tracker, you agree to these Terms. Please read them carefully.',
              style: TextStyle(fontSize: 14, height: 1.5, color: tokens.textSecondary),
            ),
            const SizedBox(height: 20),
            Text(
              'Acceptable Use',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: tokens.textPrimary),
            ),
            const SizedBox(height: 8),
            Text(
              'You agree to use Trip Tracker only for lawful group budgeting, travel expense coordination, and communication. You are solely responsible for all content uploaded to your trips.',
              style: TextStyle(fontSize: 14, height: 1.5, color: tokens.textSecondary),
            ),
            const SizedBox(height: 20),
            Text(
              'Disclaimers',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: tokens.textPrimary),
            ),
            const SizedBox(height: 8),
            Text(
              'Trip Tracker is provided "as is". Currency conversion rates are provided for estimation purposes and should not be relied upon for formal financial transactions.',
              style: TextStyle(fontSize: 14, height: 1.5, color: tokens.textSecondary),
            ),
            const SizedBox(height: 24),
            OutlinedButton(
              key: const Key('legal-full-terms'),
              onPressed: () =>
                  ref.read(externalLauncherProvider)(Uri.parse('https://trip-tracker.blackmaroon.in/terms')),
              child: const Text('Read the full document online'),
            ),
          ],
        ),
      ),
    );
  }
}
