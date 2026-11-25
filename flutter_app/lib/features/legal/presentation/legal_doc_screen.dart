import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/platform/external_launcher.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
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
class LegalDocScreen extends ConsumerStatefulWidget {
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
  ConsumerState<LegalDocScreen> createState() => _LegalDocScreenState();
}

class _LegalDocScreenState extends ConsumerState<LegalDocScreen> {
  final _anchors = <int, GlobalKey>{};

  GlobalKey _anchor(int i) => _anchors.putIfAbsent(i, GlobalKey.new);

  /// Horizon (board 46): a card listing each headed section; a tap scrolls to it.
  Widget _sectionList(BuildContext context) {
    final t = context.tokens;
    final headed = [
      for (var i = 0; i < widget.sections.length; i++)
        if (widget.sections[i].heading != null) i,
    ];
    if (headed.isEmpty) return const SizedBox.shrink();
    return Container(
      key: const Key('legal-sections'),
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: t.bgSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: t.borderColor),
      ),
      child: Material(
        type: MaterialType.transparency,
        child: Column(
          children: [
            for (var n = 0; n < headed.length; n++) ...[
              if (n > 0) Divider(height: 1, indent: 16, color: t.borderColor),
              ListTile(
                key: Key('legal-section-${headed[n]}'),
                title: Text(
                  widget.sections[headed[n]].heading!,
                  style: TextStyle(
                    fontFamily: AppTypography.fontBody,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: t.textPrimary,
                  ),
                ),
                trailing: Icon(Icons.chevron_right_rounded, color: t.textMuted),
                onTap: () {
                  final c = _anchor(headed[n]).currentContext;
                  if (c != null) Scrollable.ensureVisible(c, duration: const Duration(milliseconds: 300));
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final title = widget.title;
    final sections = widget.sections;
    final fullKey = widget.fullKey;
    final fullUrl = widget.fullUrl;

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
                if (tokens.horizon) _sectionList(context),
                for (var i = 0; i < sections.length; i++) ...[
                  if (i > 0) const SizedBox(height: 20),
                  if (sections[i].heading != null) ...[
                    Text(
                      sections[i].heading!,
                      key: _anchor(i),
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
