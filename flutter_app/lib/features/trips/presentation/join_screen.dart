import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_scaffold.dart';
import '../../../../shared/widgets/app_text_field.dart';

class JoinScreen extends StatefulWidget {
  const JoinScreen({super.key, required this.inviteCode});

  final String inviteCode;

  @override
  State<JoinScreen> createState() => _JoinScreenState();
}

class _JoinScreenState extends State<JoinScreen> {
  late final TextEditingController _codeController;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _codeController = TextEditingController(text: widget.inviteCode);
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _handleJoin() async {
    setState(() => _isLoading = true);
    await Future<void>.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    setState(() => _isLoading = false);
    context.go('/trip/demo-trip-123/expenses');
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return AppScaffold(
      appBar: AppBar(
        title: const Text('Join Trip'),
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
            Center(
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: tokens.primaryAccent.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(AppIcons.qr, size: 32, color: tokens.primaryAccent),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Enter Trip Invitation Code',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: tokens.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Paste the code or invitation link shared by your trip organizer.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: tokens.textSecondary),
            ),
            const SizedBox(height: 32),
            AppTextField(
              controller: _codeController,
              label: 'Invitation Code',
              hint: 'e.g. TOKYO2026',
            ),
            const SizedBox(height: 24),
            AppButton(
              label: 'Join Trip',
              isLoading: _isLoading,
              onPressed: _handleJoin,
              isFullWidth: true,
            ),
          ],
        ),
      ),
    );
  }
}
