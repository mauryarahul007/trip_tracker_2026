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

enum FeedbackBannerTone { info, success, error }

/// Small tinted card for a feedback form's sign-in note, success and error messages (shared by the bug and
/// feature screens). [textKey] sits on the message [Text] so tests and screen readers find the copy itself.
class FeedbackBanner extends StatelessWidget {
  const FeedbackBanner({required this.message, required this.tone, this.textKey, super.key});

  final String message;
  final FeedbackBannerTone tone;
  final Key? textKey;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final (Color color, IconData icon) = switch (tone) {
      FeedbackBannerTone.success => (t.successColor, Icons.check_circle_outline_rounded),
      FeedbackBannerTone.error => (t.dangerColor, Icons.error_outline_rounded),
      FeedbackBannerTone.info => (t.primaryAccent, Icons.info_outline_rounded),
    };
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              key: textKey,
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: t.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}
