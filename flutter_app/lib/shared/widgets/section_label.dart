import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import '../theme/app_typography.dart';

/// The small uppercase label above a group of rows (Settings sections, trip phases, notification days, search
/// results). One style for the whole app.
TextStyle sectionLabelStyle(BuildContext context) => TextStyle(
  fontFamily: AppTypography.fontBody,
  fontSize: 12,
  fontWeight: FontWeight.w700,
  letterSpacing: 0.8,
  color: context.tokens.textMuted,
);

class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {this.padding = const EdgeInsets.only(bottom: 6), super.key});

  final String text;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) => Padding(
    padding: padding,
    child: Text(text.toUpperCase(), style: sectionLabelStyle(context)),
  );
}
