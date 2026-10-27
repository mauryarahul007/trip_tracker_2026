import 'package:flutter/material.dart';

import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../../../../core/platform/motion.dart';

/// Three short cards shown once on the first visit to the Trips list: the tiles, press and hold, and the Summary.
Future<void> showFirstRunTour(BuildContext context) =>
    AppSheet.show<void>(context: context, isDismissible: true, builder: (_) => const _Tour());

class _Tour extends StatefulWidget {
  const _Tour();

  @override
  State<_Tour> createState() => _TourState();
}

class _TourState extends State<_Tour> {
  final _page = PageController();
  var _i = 0;

  @override
  void dispose() {
    _page.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = context.tokens;
    final steps = [
      (Icons.grid_view_rounded, l10n.tourTilesTitle, l10n.tourTilesBody),
      (Icons.touch_app_rounded, l10n.tourHoldTitle, l10n.tourHoldBody),
      (Icons.account_balance_wallet_outlined, l10n.tourSummaryTitle, l10n.tourSummaryBody),
    ];
    final last = _i == steps.length - 1;
    return Padding(
      key: const Key('first-run-tour'),
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            height: 250,
            child: PageView(
              controller: _page,
              onPageChanged: (v) => setState(() => _i = v),
              children: [
                for (final (icon, title, body) in steps)
                  SingleChildScrollView(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(icon, size: 44, color: t.primaryAccent),
                        const SizedBox(height: 14),
                        Text(
                          title,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontFamily: AppTypography.fontTitle,
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          body,
                          textAlign: TextAlign.center,
                          style: TextStyle(color: t.textSecondary, height: 1.3),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var d = 0; d < steps.length; d++)
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: d == _i ? 18 : 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: d == _i ? t.primaryAccent : t.borderColor,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              TextButton(
                key: const Key('tour-skip'),
                onPressed: () => Navigator.of(context).pop(),
                child: Text(l10n.tourSkip),
              ),
              const Spacer(),
              ConstrainedBox(
                constraints: const BoxConstraints(minWidth: 120),
                child: AppButton(
                  key: const Key('tour-next'),
                  label: last ? l10n.tourDone : l10n.tourNext,
                  onPressed: () => last
                      ? Navigator.of(context).pop()
                      : _page.nextPage(duration: AppMotion.base, curve: Curves.easeOutCubic),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
