import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_scaffold.dart';
import '../../../../shared/widgets/confirm_dialog.dart';
import '../../../data/providers.dart';

class DeleteAccountScreen extends ConsumerStatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  ConsumerState<DeleteAccountScreen> createState() =>
      _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends ConsumerState<DeleteAccountScreen> {
  bool _isDeleting = false;

  Future<void> _handleDelete() async {
    final confirmed = await ConfirmDialog.show(
      context: context,
      title: 'Permanently Delete Account?',
      message: 'This action is irreversible. All your profile data, personal trips, and associations will be permanently purged.',
      confirmLabel: 'Delete Forever',
      isDestructive: true,
    );

    if (confirmed != true || !mounted) return;

    setState(() {
      _isDeleting = true;
    });

    try {
      await ref.read(authRepositoryProvider).deleteAccount();
    } catch (e) {
      if (!mounted) return;
      setState(() => _isDeleting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not delete your account. Check your connection and try again.')),
      );
      return;
    }
    // The router redirects to /login once the session is gone.
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return AppScaffold(
      appBar: AppBar(
        title: const Text('Delete Account'),
        leading: IconButton(
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: tokens.dangerColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(tokens.radiusMd),
                border: Border.all(
                  color: tokens.dangerColor.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(AppIcons.alert, color: tokens.dangerColor, size: 28),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      'Warning: Account deletion is permanent and cannot be undone.',
                      style: TextStyle(
                        color: tokens.dangerColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'What happens when you delete your account:',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 16,
                color: tokens.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              '• Your user profile and authentication credentials will be erased.\n• Trips where you are the sole creator will be deleted.\n• In shared trips, your historical expenses remain preserved to prevent corrupting balances, but your identity will show as "Former Member".',
              style: TextStyle(
                height: 1.6,
                fontSize: 14,
                color: tokens.textSecondary,
              ),
            ),
            const Spacer(),
            AppButton(
              label: 'Permanently Delete My Account',
              variant: AppButtonVariant.danger,
              isLoading: _isDeleting,
              onPressed: _handleDelete,
              isFullWidth: true,
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
