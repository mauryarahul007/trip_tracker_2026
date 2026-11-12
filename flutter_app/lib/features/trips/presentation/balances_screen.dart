import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/format/money.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/cross_trip_balances.dart';
import '../../../domain/models/expense.dart';
import '../../../domain/models/group.dart';
import '../../../domain/models/member.dart';
import '../../../domain/models/trip.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_surface.dart';
import '../../../shared/widgets/bento_tile.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../expenses/application/expenses_providers.dart';
import '../../expenses/application/money_providers.dart';
import '../../expenses/presentation/widgets/settle_sheet.dart' show showSettlementChooserOrSheet;
import 'widgets/home_dock.dart';

/// Top-level Balances tab: what you are owed or owe across every trip (net per currency, never
/// blended), then each trip's own net. Reuses [crossTripNets]; no new maths.
class BalancesScreen extends ConsumerWidget {
  const BalancesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final trips = [
      for (final t in ref.watch(allTripsProvider).value ?? const <Trip>[])
        if (!t.archived) t,
    ];
    final members = <String, List<Member>>{};
    for (final m in ref.watch(allMembersProvider).value ?? const <Member>[]) {
      final id = m.tripId;
      if (id != null) (members[id] ??= []).add(m);
    }
    final expenses = <String, List<Expense>>{};
    for (final e in ref.watch(allActiveExpensesProvider).value ?? const <Expense>[]) {
      (expenses[e.tripId] ??= []).add(e);
    }
    // Groups settle as one party, so a square household reads settled here as it does in the trip's ledger.
    final groups = {for (final t in trips) t.id: ref.watch(tripGroupsProvider(t.id)).value ?? const <Group>[]};
    final userId = ref.watch(authStateProvider).userId;
    List<CrossTripNet> netsFor(List<Trip> list) => crossTripNets(
      userId: userId,
      trips: list,
      membersByTrip: members,
      expensesByTrip: expenses,
      groupsByTrip: groups,
    );

    final total = netsFor(trips);
    final positions = tripNetPositions(
      userId: userId,
      trips: trips,
      membersByTrip: members,
      expensesByTrip: expenses,
      groupsByTrip: groups,
    );
    final debt = largestOpenDebt(positions);
    final owedTo = debt == null ? largestOwedToMe(positions) : null;
    // Load the settle chooser's trip ledger now so the CTA never opens on an empty "all caught up".
    if (debt != null) ref.watch(tripSettlementProvider(debt.tripId));
    return wrapHomeBody(
      context,
      ref,
      HomeTab.balances,
      AppScaffold(
        appBar: AppBar(title: Text(l10n.navBalances)),
        bottomNavigationBar: buildHomeDock(context, ref, HomeTab.balances),
        body: trips.isEmpty
            ? EmptyState(
                icon: Icons.account_balance_wallet_outlined,
                title: l10n.emptyTripsTitle,
                subtitle: (ref.watch(flagProvider(('enableCoachEmptyStates', null))).value ?? true)
                    ? 'Create a trip to see what you owe and are owed across journeys.'
                    : l10n.emptyTripsSubtitle,
                action: AppButton(
                  key: const Key('balances-create-trip'),
                  label: l10n.actionCreateTrip,
                  onPressed: () => createTripFlow(context),
                ),
              )
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                children: [
                  BentoTile(
                    tone: BentoTone.mint,
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        BentoTile.eyebrow(context, BentoTone.mint, l10n.ledAcrossTrips),
                        const SizedBox(height: 12),
                        if (total.isEmpty)
                          Text(
                            l10n.ledAllSettled,
                            key: const Key('balances-even'),
                            style: TextStyle(
                              fontFamily: AppTypography.fontTitle,
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: tokens.textPrimary,
                            ),
                          )
                        else
                          for (final n in total) _NetRow(n, light: true),
                        if (debt != null) ...[
                          const SizedBox(height: 12),
                          Text.rich(
                            key: const Key('balances-largest-debt'),
                            TextSpan(
                              children: [
                                TextSpan(
                                  text: l10n.balLargestDebt(debt.tripName),
                                  style: TextStyle(fontWeight: FontWeight.w600, color: tokens.textSecondary),
                                ),
                                TextSpan(
                                  text: ' -${formatMoney(context, debt.net.abs(), debt.currency)}',
                                  style: TextStyle(
                                    fontFamily: AppTypography.fontMono,
                                    fontFeatures: AppTypography.tabularFigures,
                                    fontWeight: FontWeight.w800,
                                    color: tokens.colorDanger,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          AppButton(
                            key: const Key('balances-owe-cta'),
                            label: l10n.balSettleLargest,
                            icon: Icons.swap_horiz_rounded,
                            onPressed: () => unawaited(
                              showSettlementChooserOrSheet(context: context, ref: ref, tripId: debt.tripId),
                            ),
                          ),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: TextButton(
                              key: const Key('balances-owe-open'),
                              onPressed: () => context.push('/trip/${debt.tripId}/ledger'),
                              child: Text(l10n.balOpenTripBalances(debt.tripName)),
                            ),
                          ),
                        ] else if (owedTo != null) ...[
                          const SizedBox(height: 12),
                          Text.rich(
                            key: const Key('balances-largest-owed'),
                            TextSpan(
                              children: [
                                TextSpan(
                                  text: l10n.balLargestOwed(owedTo.tripName),
                                  style: TextStyle(fontWeight: FontWeight.w600, color: tokens.textSecondary),
                                ),
                                TextSpan(
                                  text: ' +${formatMoney(context, owedTo.net, owedTo.currency)}',
                                  style: TextStyle(
                                    fontFamily: AppTypography.fontMono,
                                    fontFeatures: AppTypography.tabularFigures,
                                    fontWeight: FontWeight.w800,
                                    color: tokens.colorSuccess,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          AppButton(
                            key: const Key('balances-owed-cta'),
                            label: l10n.balOpenTripBalances(owedTo.tripName),
                            variant: AppButtonVariant.secondary,
                            onPressed: () => context.push('/trip/${owedTo.tripId}/ledger'),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Eyebrow(l10n.tripsTitle),
                  const SizedBox(height: 8),
                  for (final t in trips)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: BentoTile(
                        key: Key('balance-trip-${t.id}'),
                        tone: toneFor(t.id),
                        onTap: () => context.push('/trip/${t.id}/ledger'),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                t.name,
                                style: TextStyle(fontWeight: FontWeight.w700, color: tokens.textPrimary),
                              ),
                            ),
                            Flexible(
                              child: Builder(
                                builder: (_) {
                                  final nets = netsFor([t]);
                                  if (nets.isEmpty) return Text(l10n.ledStubSettled, style: TextStyle(color: tokens.textMuted));
                                  return Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [for (final n in nets) _NetRow(n)],
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
      ),
    );
  }
}

class _NetRow extends StatelessWidget {
  const _NetRow(this.net, {this.light = false});

  /// [light] is the big figure at the top of the screen; otherwise a compact row inside a trip tile.
  final CrossTripNet net;
  final bool light;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = context.l10n;
    final owed = net.net > 0;
    final amount = formatMoney(context, net.net.abs(), net.currency);
    // Match in-trip Balances: green owed-to-you / red you-owe (Splitwise convention).
    final moneyColor = owed ? tokens.colorSuccess : tokens.colorDanger;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Text.rich(
        TextSpan(
          children: [
            TextSpan(
              text: '${owed ? '+' : '-'}$amount',
              style: TextStyle(
                fontFamily: AppTypography.fontMono,
                fontFeatures: AppTypography.tabularFigures,
                fontSize: light ? 32 : 16,
                fontWeight: FontWeight.w800,
                letterSpacing: light ? -0.5 : 0,
                color: moneyColor,
              ),
            ),
            TextSpan(
              text: '  ${owed ? l10n.balYouAreOwed : l10n.balYouOwe}',
              style: TextStyle(fontSize: light ? 14 : 12, fontWeight: FontWeight.w600, color: tokens.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
