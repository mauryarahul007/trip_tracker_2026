import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/flags/compass_flags.dart';
import '../../../../core/platform/share_service.dart';
import '../../../../domain/logic/trip_utilities.dart' show buildCanonicalJoinLink;
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/compass.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../../../expenses/application/expenses_providers.dart';
import '../../../expenses/presentation/widgets/add_expense_fab.dart' show startAddExpense;
import '../../../trips/presentation/widgets/share_trip_sheet.dart';
import '../../application/trip_nav.dart';

/// Flag `enableTripGetStarted`: what a trip with no expenses shows in place of an empty Summary or Expenses list.
const tripGetStartedFlag = 'enableTripGetStarted';

/// "Get this trip rolling": invite the group (share link, copy link, code and QR) and add the first expense.
class TripGetStarted extends ConsumerWidget {
  const TripGetStarted({required this.tripId, super.key});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final l10n = context.l10n;
    final trip = ref.watch(tripProvider(tripId)).value;
    final members = ref.watch(visibleMembersProvider(tripId)).length;
    final compass = ref.watch(compassFlagProvider((compassNavFlag, tripId)));
    final code = trip?.joinCode ?? '';
    final link = code.isEmpty ? '' : buildCanonicalJoinLink(code);

    Future<void> shareLink() =>
        ref.read(shareServiceProvider).share(l10n.inviteShareText(trip?.name ?? '', link, code), subject: trip?.name);

    Future<void> copyLink() async {
      await ref.read(shareServiceProvider).copy(link);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invite link copied')));
      }
    }

    Widget step(IconData icon, String title, String body, List<Widget> actions) => DecoratedBox(
      decoration: BoxDecoration(
        color: t.bgSurface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: t.borderColor),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(color: t.primarySoft, borderRadius: BorderRadius.circular(14)),
                  child: Icon(icon, color: t.primaryAccent),
                ),
                const SizedBox(width: 12),
                Expanded(child: Text(title, style: Theme.of(context).textTheme.titleMedium)),
              ],
            ),
            const SizedBox(height: 8),
            Text(body, style: TextStyle(color: t.textSecondary)),
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 8, children: actions),
          ],
        ),
      ),
    );

    return ListView(
      key: const Key('trip-get-started'),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
      children: [
        Text('Get this trip rolling', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 4),
        Text(
          'Invite your group, then add the first expense. Balances and settle-up show up as soon as there is something to split.',
          style: TextStyle(color: t.textSecondary),
        ),
        const SizedBox(height: 16),
        step(
          Icons.group_add_outlined,
          'Invite your group',
          members <= 1 ? 'Just you so far. Send the link and they join in one tap.' : '$members travelers so far.',
          [
            FilledButton.icon(
              key: const Key('started-share-link'),
              onPressed: link.isEmpty ? null : shareLink,
              icon: const Icon(Icons.share_outlined),
              label: const Text('Share invite link'),
            ),
            OutlinedButton.icon(
              key: const Key('started-copy-link'),
              onPressed: link.isEmpty ? null : copyLink,
              icon: const Icon(Icons.link_rounded),
              label: const Text('Copy link'),
            ),
            TextButton(
              key: const Key('started-code-qr'),
              onPressed: () => AppSheet.show<void>(
                context: context,
                title: l10n.inviteSheetTitle,
                builder: (_) => ShareTripSheet(tripId: tripId),
              ),
              child: const Text('Code and QR'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        step(Icons.receipt_long_outlined, 'Add your first expense', 'Log what you paid and who shares it.', [
          FilledButton.icon(
            key: const Key('started-add-expense'),
            style: compass ? FilledButton.styleFrom(backgroundColor: t.sun, foregroundColor: t.onSun) : null,
            onPressed: () => startAddExpense(context, ref, tripId),
            icon: const Icon(Icons.add_rounded),
            label: Text(l10n.expAdd),
          ),
        ]),
      ],
    );
  }
}
