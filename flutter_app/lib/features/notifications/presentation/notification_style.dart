import 'package:flutter/material.dart';

import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_tokens.dart';

/// Icon + tint per notification type (web `getNotificationMeta`). Pass [t] so brand and money tints follow the theme.
({IconData icon, Color color}) notificationMeta(String? type, [AppTokens? t]) => switch (type) {
  'expense_added' => (icon: AppIcons.expenses, color: AppColors.accentCyan),
  'expense_updated' => (icon: AppIcons.edit, color: (t?.colorWarning ?? AppColors.calmWarn)),
  'expense_deleted' || 'trip_deleted' => (icon: AppIcons.delete, color: (t?.colorDanger ?? AppColors.calmOwe)),
  'expense_refunded' => (icon: Icons.undo_rounded, color: (t?.colorSuccess ?? AppColors.calmOwed)),
  'expense_restored' => (icon: Icons.auto_awesome_rounded, color: (t?.colorSuccess ?? AppColors.calmOwed)),
  'member_added' || 'member_added_notice' || 'member_joined' => (icon: AppIcons.members, color: AppColors.accentViolet),
  'settlement' ||
  'settle' ||
  'settlement_reminder' => (icon: Icons.check_circle_outline_rounded, color: (t?.colorSuccess ?? AppColors.calmOwed)),
  'chat_message' => (icon: AppIcons.chat, color: (t?.primaryAccent ?? AppColors.calmTeal)),
  _ => (icon: AppIcons.bell, color: (t?.primaryAccent ?? AppColors.calmTeal)),
};
