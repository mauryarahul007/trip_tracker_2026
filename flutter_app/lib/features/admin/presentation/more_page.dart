import 'package:flutter/material.dart';

import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/bento_tile.dart';
import 'analytics_page.dart';
import 'audit_page.dart';
import 'controls_page.dart';
import 'features_page.dart';
import 'tools_page.dart';

/// The rest of the portal: each entry opens a full page with a back button.
class MorePage extends StatelessWidget {
  const MorePage({super.key});

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    Widget entry(Key key, BentoTone tone, IconData icon, String title, String sub, Widget page) => Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: BentoTile(
        key: key,
        tone: tone,
        padding: const EdgeInsets.all(14),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => _SubPage(title: title, child: page),
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: t.textPrimary),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: t.textPrimary),
                  ),
                  Text(sub, style: TextStyle(fontSize: 12.5, color: t.textSecondary)),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: t.textMuted),
          ],
        ),
      ),
    );
    return ListView(
      key: const Key('admin-more'),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
      children: [
        entry(
          const Key('more-analytics'),
          BentoTone.sky,
          Icons.insights_rounded,
          'Analytics',
          'Signups, retention, reliability, delivery',
          const AnalyticsPage(),
        ),
        entry(
          const Key('more-features'),
          BentoTone.lilac,
          Icons.lightbulb_rounded,
          'Features',
          'Roadmap and requests',
          const FeaturesPage(),
        ),
        entry(
          const Key('more-audit'),
          BentoTone.butter,
          Icons.fact_check_rounded,
          'Audit log',
          'Who did what, with retention purge',
          const AuditPage(),
        ),
        entry(
          const Key('more-controls'),
          BentoTone.peach,
          Icons.tune_rounded,
          'Controls',
          'Maintenance, sign-in gate, limits, landing copy',
          const ControlsPage(),
        ),
        entry(
          const Key('more-tools'),
          BentoTone.mint,
          Icons.build_rounded,
          'Tools',
          'Service health, recycle bin, password',
          const ToolsPage(),
        ),
      ],
    );
  }
}

class _SubPage extends StatelessWidget {
  const _SubPage({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: context.tokens.bgApp,
    appBar: AppBar(backgroundColor: context.tokens.bgApp, title: Text(title)),
    body: child,
  );
}
