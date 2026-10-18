import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/theme/app_tokens.dart';
import '../application/feedback_providers.dart';

/// "2 messages saved on this phone, waiting for a connection": shown above the form while the offline queue is not empty.
class PendingFeedbackNote extends ConsumerWidget {
  const PendingFeedbackNote({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final n = ref.watch(feedbackQueueProvider).length;
    if (n == 0) return const SizedBox.shrink();
    final t = context.tokens;
    return Container(
      key: const Key('feedback-pending'),
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: t.primaryAccent.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          Icon(Icons.cloud_upload_outlined, color: t.primaryAccent),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              n == 1
                  ? '1 message is saved on this phone and will be sent when you are online.'
                  : '$n messages are saved on this phone and will be sent when you are online.',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
