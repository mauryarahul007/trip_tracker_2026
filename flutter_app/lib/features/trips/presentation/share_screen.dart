import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/platform/haptics.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_scaffold.dart';

class ShareScreen extends StatelessWidget {
  const ShareScreen({super.key, required this.token});

  final String token;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final shareUrl = 'https://triptracker.app/join/$token';

    return AppScaffold(
      appBar: AppBar(
        title: const Text('Share Trip'),
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
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(tokens.radiusLg),
                  border: Border.all(color: tokens.borderColor, width: 2),
                ),
                child: Center(
                  child: Icon(AppIcons.qr, size: 96, color: tokens.textPrimary),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Invite Traveling Companions',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: tokens.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Anyone with this link or QR code can view trip expenses and add receipts.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: tokens.textSecondary),
            ),
            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: tokens.bgSurface,
                borderRadius: BorderRadius.circular(tokens.radiusMd),
                border: Border.all(color: tokens.borderColor),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      shareUrl,
                      style: TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 13,
                        color: tokens.textSecondary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(AppIcons.copy, size: 20),
                    tooltip: 'Copy link',
                    onPressed: () async {
                      await AppHaptics.selection();
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Link copied to clipboard'),
                          ),
                        );
                      }
                    },
                  ),
                ],
              ),
            ),
            const Spacer(),
            AppButton(
              label: 'Share Invitation Link',
              icon: AppIcons.share,
              onPressed: () async {
                await AppHaptics.medium();
              },
              isFullWidth: true,
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
