import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_scaffold.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return AppScaffold(
      appBar: AppBar(
        title: const Text('Privacy Policy'),
        leading: IconButton(
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
              'Privacy Policy',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: tokens.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Trip Tracker respects your personal privacy. We only collect the minimal information necessary to sync your trip expenses, itineraries, and receipts across your devices and with your designated travel companions.',
              style: TextStyle(
                fontSize: 14,
                height: 1.5,
                color: tokens.textSecondary,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Data We Store',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: tokens.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '• Account email and name\n• Trip details, categories, currencies, and timestamps\n• Expenses, splits, and settlement transaction logs\n• Uploaded receipt images and notes',
              style: TextStyle(
                fontSize: 14,
                height: 1.6,
                color: tokens.textSecondary,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Your Rights',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: tokens.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'You can request complete deletion of your account and all associated personal data at any time from Settings or via the Delete Account option.',
              style: TextStyle(
                fontSize: 14,
                height: 1.5,
                color: tokens.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
