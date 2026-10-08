import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
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

    const onDark = Colors.white;
    return AppScaffold(
      backgroundColor: const Color(0xFF05080F),
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppTokens.nightSkyGradient),
        child: SafeArea(
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: _finish,
                  style: TextButton.styleFrom(foregroundColor: Colors.white.withValues(alpha: 0.8)),
                  child: Text(l10n.onboardingSkip),
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _controller,
                  itemCount: steps.length,
                  onPageChanged: (i) => setState(() => _index = i),
                  itemBuilder: (_, i) => Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 148,
                          height: 148,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: [
                                tokens.primaryAccent.withValues(alpha: 0.55),
                                tokens.primaryAccent.withValues(alpha: 0.08),
                              ],
                            ),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
                          ),
                          child: Text(steps[i].$1, style: const TextStyle(fontSize: 64)),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          steps[i].$2,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontFamily: AppTypography.fontTitle,
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.7,
                            color: onDark,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          steps[i].$3,
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 16, color: Colors.white.withValues(alpha: 0.7), height: 1.45),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 0; i < steps.length; i++)
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.all(4),
                      width: i == _index ? 22 : 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: i == _index ? Colors.white : Colors.white.withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                ],
              ),
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
            ],
          ),
        ),
      ),
    );
  }
}
