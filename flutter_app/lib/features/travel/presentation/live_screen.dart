import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_scaffold.dart';

class LiveScreen extends StatelessWidget {
  const LiveScreen({super.key, required this.token});

  final String token;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return AppScaffold(
      appBar: AppBar(
        title: const Text('Live Location Sharing'),
        leading: IconButton(
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: tokens.successColor.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(
                AppIcons.location,
                size: 40,
                color: tokens.successColor,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Live Travel Radar Active',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: tokens.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Session token: $token\nRealtime updates enabled for trip squad members.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: tokens.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
