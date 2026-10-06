import 'package:flutter/material.dart';

import '../../../shared/theme/app_icons.dart';

/// Icon + tint per notification type (web `getNotificationMeta`).
({IconData icon, Color color}) notificationMeta(String? type) => switch (type) {
  'expense_added' => (icon: AppIcons.expenses, color: const Color(0xFF14B8A6)),
  'expense_updated' => (icon: AppIcons.edit, color: const Color(0xFFF59E0B)),
  'expense_deleted' || 'trip_deleted' => (icon: AppIcons.delete, color: const Color(0xFFF43F5E)),
  'expense_restored' => (icon: Icons.auto_awesome_rounded, color: const Color(0xFF10B981)),
  'member_added' ||
  'member_added_notice' ||
  'member_joined' => (icon: AppIcons.members, color: const Color(0xFFA855F7)),
  'settlement' ||
  'settle' ||
  'settlement_reminder' => (icon: Icons.check_circle_outline_rounded, color: const Color(0xFF10B981)),
  'chat_message' => (icon: AppIcons.chat, color: const Color(0xFF6366F1)),
  _ => (icon: AppIcons.bell, color: const Color(0xFF3B82F6)),
};
