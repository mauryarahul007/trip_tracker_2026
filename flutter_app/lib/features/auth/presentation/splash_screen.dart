import 'package:flutter/material.dart';

import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_scaffold.dart';

/// Shown only while the stored session is being restored, so a returning
/// user never sees a flash of the login screen.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return AppScaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: tokens.primaryAccent.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(AppIcons.expenses, size: 36, color: tokens.primaryAccent),
            ),
            const SizedBox(height: 24),
            const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2.5),
            ),
          ],
        ),
      ),
    );
  }
}
