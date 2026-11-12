import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/platform/external_launcher.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_scaffold.dart';

/// One headed block of a legal summary ([heading] is optional for the opening paragraph).
class LegalSection {
  const LegalSection({this.heading, required this.body, this.bodyHeight = 1.5});

  final String? heading;
  final String body;
  final double bodyHeight;
}

/// Shared shell for the in-app Privacy and Terms summaries: the AppBar carries the title (no repeated
/// heading in the body), content is capped at 640 wide, and the full text opens in the browser.
class LegalDocScreen extends ConsumerWidget {
  const LegalDocScreen({
    required this.title,
    required this.sections,
    required this.fullUrl,
    required this.fullKey,
    super.key,
  });

  final String title;
  final List<LegalSection> sections;
  final String fullUrl;
  final Key fullKey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;

    return AppScaffold(
      appBar: AppBar(
        title: Text(title),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 640),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (var i = 0; i < sections.length; i++) ...[
                  if (i > 0) const SizedBox(height: 20),
                  if (sections[i].heading != null) ...[
                    Text(
                      sections[i].heading!,
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: tokens.textPrimary),
                    ),
                    const SizedBox(height: 8),
                  ],
                  Text(
                    sections[i].body,
                    style: TextStyle(fontSize: 14, height: sections[i].bodyHeight, color: tokens.textSecondary),
                  ),
                ],
                const SizedBox(height: 24),
                AppButton(
                  key: fullKey,
                  label: 'Read the full document online',
                  variant: AppButtonVariant.secondary,
                  icon: Icons.open_in_new_rounded,
                  isFullWidth: true,
                  onPressed: () => ref.read(externalLauncherProvider)(Uri.parse(fullUrl)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
