import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import '../theme/app_typography.dart';

/// "Today · Fri 14 Nov" with that day's total on the right. Groups an expense list by day.
class DayHeader extends StatelessWidget {
  const DayHeader({required this.label, this.total, super.key});

  final String label;
  final String? total;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 14, 4, 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: t.textPrimary),
            ),
          ),
          if (total != null) Text(total!, style: AppTypography.monoNumber(fontSize: 12, color: t.textMuted)),
        ],
      ),
    );
  }
}
