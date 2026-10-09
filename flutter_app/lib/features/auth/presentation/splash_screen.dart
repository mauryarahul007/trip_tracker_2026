import 'package:flutter/material.dart';

import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/brand_mark.dart';

/// Shown only while the stored session is being restored, so a returning
/// user never sees a flash of the login screen.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return AppScaffold(
      backgroundColor: t.bgPage,
      body: DecoratedBox(
        decoration: BoxDecoration(color: t.bgPage),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const BrandMark(size: 88),
              const SizedBox(height: 32),
              SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: t.textPrimary)),
            ],
          ),
        ),
      ),
    );
  }
}
