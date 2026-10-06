import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../application/onboarding_state.dart';

/// Three-step intro shown once per user per install (web: OnboardingSwipe).
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _controller = PageController();
  int _index = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _finish() => ref.read(onboardedProvider.notifier).markDone();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final steps = [
      ('🧳', l10n.onboardingWelcomeTitle, l10n.onboardingWelcomeBody),
      ('🗺️', l10n.onboardingTripTitle, l10n.onboardingTripBody),
      ('🧾', l10n.onboardingExpenseTitle, l10n.onboardingExpenseBody),
    ];
    final last = _index == steps.length - 1;

    return AppScaffold(
      body: SafeArea(
        child: Column(children: [
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(onPressed: _finish, child: Text(l10n.onboardingSkip)),
          ),
          Expanded(
            child: PageView.builder(
              controller: _controller,
              itemCount: steps.length,
              onPageChanged: (i) => setState(() => _index = i),
              itemBuilder: (_, i) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(steps[i].$1, style: const TextStyle(fontSize: 72)),
                  const SizedBox(height: 24),
                  Text(steps[i].$2, textAlign: TextAlign.center, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: tokens.textPrimary)),
                  const SizedBox(height: 12),
                  Text(steps[i].$3, textAlign: TextAlign.center, style: TextStyle(fontSize: 16, color: tokens.textSecondary, height: 1.4)),
                ]),
              ),
            ),
          ),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            for (var i = 0; i < steps.length; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.all(4),
                width: i == _index ? 22 : 8,
                height: 8,
                decoration: BoxDecoration(
                  color: i == _index ? tokens.primaryAccent : tokens.borderColor,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
          ]),
          Padding(
            padding: const EdgeInsets.all(24),
            child: AppButton(
              label: last ? l10n.onboardingGetStarted : l10n.onboardingNext,
              isFullWidth: true,
              onPressed: last
                  ? _finish
                  : () => _controller.nextPage(duration: const Duration(milliseconds: 250), curve: Curves.easeOut),
            ),
          ),
        ]),
      ),
    );
  }
}
