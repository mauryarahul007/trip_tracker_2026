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
import '../../../shared/widgets/app_avatar.dart';
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
                  if (tokens.horizon) ?_horizonStats(context, positions),
                  if (tokens.horizon) ...[
                    // Horizon ("All balances" mockup): filter + by person, then one settle action.
                    _HorizonPeopleFiltered(
                      people: personNets(
                        userId: userId,
                        trips: trips,
                        membersByTrip: members,
                        expensesByTrip: expenses,
                        groupsByTrip: groups,
                      ),
                    ),
                    if (debt != null)
                      AppButton(
                        key: const Key('balances-owe-cta'),
                        label: l10n.balSettleLargest,
                        icon: Icons.swap_horiz_rounded,
                        isFullWidth: true,
                        onPressed: () =>
                            unawaited(showSettlementChooserOrSheet(context: context, ref: ref, tripId: debt.tripId)),
                      )
                    else if (total.isEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(
                          l10n.ledAllSettled,
                          key: const Key('balances-even'),
                          textAlign: TextAlign.center,
                          style: TextStyle(fontFamily: AppTypography.fontBody, color: tokens.textSecondary),
                        ),
                      ),
                    const SizedBox(height: 20),
                  ] else
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
                  if (!tokens.horizon) const SizedBox(height: 20),
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
                                  if (nets.isEmpty) {
                                    return Text(l10n.ledStubSettled, style: TextStyle(color: tokens.textMuted));
                                  }
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

/// Horizon "Owed to you" and "You owe" stat cards, summed across trips. Hidden when trips use more than one
/// currency, so nothing is blended.
Widget? _horizonStats(BuildContext context, List<TripNetPosition> positions) {
  final open = [
    for (final p in positions)
      if (p.net != 0) p,
  ];
  final currencies = {for (final p in open) p.currency};
  if (currencies.length > 1) return null;
  final currency = currencies.isEmpty ? null : currencies.first;
  var owed = 0.0;
  var owe = 0.0;
  for (final p in open) {
    if (p.net > 0) {
      owed += p.net;
    } else {
      owe -= p.net;
    }
  }
  final t = context.tokens;
  String fmt(double v) => currency == null ? '0' : formatMoney(context, v, currency);
  Widget card(String key, String label, String amount, Color color) => Expanded(
    child: Container(
      key: Key(key),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: t.bgSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: t.cardEdge),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontFamily: AppTypography.fontMono,
              fontSize: 11,
              letterSpacing: 1.4,
              fontWeight: FontWeight.w600,
              color: t.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              amount,
              style: TextStyle(
                fontFamily: AppTypography.fontMono,
                fontFeatures: AppTypography.tabularFigures,
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ],
      ),
    ),
  );
  final l10n = context.l10n;
  return Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Row(
      children: [
        card(
          'horizon-stat-owed',
          l10n.horizonOwedToYou,
          owed > 0 ? '+${fmt(owed)}' : fmt(0),
          owed > 0 ? t.colorSuccess : t.textPrimary,
        ),
        const SizedBox(width: 10),
        card(
          'horizon-stat-owe',
          l10n.horizonYouOwe,
          owe > 0 ? '−${fmt(owe)}' : fmt(0),
          owe > 0 ? t.colorDanger : t.textPrimary,
        ),
      ],
    ),
  );
}

/// Horizon "By person" list: each person's net with me across every trip (green "owes you", red "you owe"),
/// matched across trips and never blending currencies. Nothing when everyone is square.
/// All / Owed to you / You owe over the by-person list.
class _HorizonPeopleFiltered extends StatefulWidget {
  const _HorizonPeopleFiltered({required this.people});
  final List<PersonNet> people;

  @override
  State<_HorizonPeopleFiltered> createState() => _HorizonPeopleFilteredState();
}

class _HorizonPeopleFilteredState extends State<_HorizonPeopleFiltered> {
  var _filter = 0; // 0 all, 1 owed to you, 2 you owe

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (widget.people.isEmpty) return const SizedBox.shrink();
    final shown = [
      for (final p in widget.people)
        if (_filter == 0 || (_filter == 1 && p.net > 0) || (_filter == 2 && p.net < 0)) p,
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SegmentedButton<int>(
          key: const Key('balances-filter'),
          showSelectedIcon: false,
          style: SegmentedButton.styleFrom(
            textStyle: const TextStyle(fontFamily: AppTypography.fontBody, fontWeight: FontWeight.w700),
          ),
          segments: [
            ButtonSegment(value: 0, label: Text(l10n.horizonFilterAll)),
            ButtonSegment(value: 1, label: Text(l10n.horizonFilterOwed, key: const Key('balances-filter-owed'))),
            ButtonSegment(value: 2, label: Text(l10n.horizonFilterOwe, key: const Key('balances-filter-owe'))),
          ],
          selected: {_filter},
          onSelectionChanged: (v) => setState(() => _filter = v.first),
        ),
        const SizedBox(height: 14),
        if (shown.isEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 20),
            child: Text(
              l10n.ledAllSettled,
              textAlign: TextAlign.center,
              style: TextStyle(fontFamily: AppTypography.fontBody, color: context.tokens.textSecondary),
            ),
          )
        else
          ..._horizonPeople(context, shown),
      ],
    );
  }
}

List<Widget> _horizonPeople(BuildContext context, List<PersonNet> people) {
  if (people.isEmpty) return const [];
  final t = context.tokens;
  final l10n = context.l10n;
  return [
    Eyebrow(l10n.horizonByPerson),
    const SizedBox(height: 8),
    Container(
      key: const Key('horizon-by-person'),
      decoration: BoxDecoration(
        color: t.bgSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: t.cardEdge),
      ),
      child: Column(
        children: [
          for (final (i, p) in people.indexed) ...[
            if (i > 0) Divider(height: 1, indent: 64, color: t.borderColor),
            Padding(
              key: Key('person-${p.key}'),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  AppAvatar(name: p.name, size: 38),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          p.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontFamily: AppTypography.fontBody,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: t.textPrimary,
                          ),
                        ),
                        Text(
                          p.trips.length == 1 ? p.trips.first : l10n.horizonTripCount(p.trips.length),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 13, color: t.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${p.net > 0 ? '+' : '−'}${formatMoney(context, p.net.abs(), p.currency)}',
                        style: TextStyle(
                          fontFamily: AppTypography.fontMono,
                          fontFeatures: AppTypography.tabularFigures,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: p.net > 0 ? t.colorSuccess : t.colorDanger,
                        ),
                      ),
                      Text(
                        p.net > 0 ? l10n.horizonPersonOwesYou : l10n.horizonPersonYouOwe,
                        style: TextStyle(fontSize: 12, color: t.textSecondary),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    ),
    const SizedBox(height: 20),
  ];
}
