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
  ConsumerState<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends ConsumerState<DeleteAccountScreen> {
  bool _isDeleting = false;
  final _confirm = TextEditingController();

  @override
  void dispose() {
    _confirm.dispose();
    super.dispose();
  }

  bool get _confirmed => _confirm.text.trim().toUpperCase() == 'DELETE';

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
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(shape: BoxShape.circle, color: tokens.dangerColor.withValues(alpha: 0.12)),
                child: Icon(Icons.delete_outline_rounded, size: 34, color: tokens.dangerColor),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: tokens.dangerColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(tokens.radiusMd),
                border: Border.all(color: tokens.dangerColor.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Icon(AppIcons.alert, color: tokens.dangerColor, size: 28),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      'Warning: Account deletion is permanent and cannot be undone.',
                      style: TextStyle(color: tokens.dangerColor, fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'What happens when you delete your account:',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: tokens.textPrimary),
            ),
            const SizedBox(height: 12),
            for (final line in const [
              'Your user profile and authentication credentials will be erased.',
              'Trips where you are the sole creator will be deleted.',
              'In shared trips, your historical expenses remain preserved to prevent corrupting balances, but your identity will show as "Former Member".',
            ])
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.close_rounded, size: 18, color: tokens.dangerColor),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(line, style: TextStyle(height: 1.45, fontSize: 14, color: tokens.textSecondary)),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 24),
            TextField(
              key: const Key('delete-confirm'),
              controller: _confirm,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(labelText: 'Type DELETE to confirm'),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 32),
            AppButton(
              label: 'Permanently Delete My Account',
              variant: AppButtonVariant.danger,
              isLoading: _isDeleting,
              onPressed: _confirmed && !_isDeleting ? _handleDelete : null,
              isFullWidth: true,
            ),
            const SizedBox(height: 8),
            TextButton(
              key: const Key('delete-keep'),
              onPressed: () => context.pop(),
              child: const Text('Keep my account'),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
