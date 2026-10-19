import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/format/money.dart';
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../domain/logic/ops_analytics.dart';
import '../../../domain/logic/ops_growth_metrics.dart';
import '../../../domain/models/admin.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_surface.dart';
import '../application/admin_providers.dart';
import 'admin_widgets.dart';

/// Platform analytics in five tabs, like the web Ops Deck: Growth, Overview, Financial, Engagement, Health.
/// The fleet-wide figures are computed on the device from one read of every trip, member and expense;
/// retention, reliability, delivery and device counts come from server-side queries.
class AnalyticsPage extends ConsumerStatefulWidget {
  const AnalyticsPage({super.key});

  @override
  ConsumerState<AnalyticsPage> createState() => _AnalyticsPageState();
}

class _AnalyticsPageState extends ConsumerState<AnalyticsPage> with SingleTickerProviderStateMixin {
  late final _tabs = TabController(length: 5, vsync: this);

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    for (final p in [
      adminUsersProvider,
      adminTripsProvider,
      adminBugsProvider,
      adminFleetProvider,
      adminAuditProvider,
      adminFlagOverridesProvider,
      adminRetentionProvider,
      adminRepeatCreatorsProvider,
      adminReliabilityProvider,
      adminNotificationStatsProvider,
      adminDevicesProvider,
      adminRecycledCountProvider,
    ]) {
      ref.invalidate(p);
    }
    await ref.read(adminFleetProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Column(
      children: [
        TabBar(
          key: const Key('analytics-tabs'),
          controller: _tabs,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          labelColor: t.textPrimary,
          unselectedLabelColor: t.textSecondary,
          indicatorColor: t.primaryAccent,
          tabs: const [
            Tab(text: 'Growth'),
            Tab(text: 'Overview'),
            Tab(text: 'Financial'),
            Tab(text: 'Engagement'),
            Tab(text: 'Health'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabs,
            children: [
              _Tab(onRefresh: _refresh, child: const _GrowthTab()),
              _Tab(onRefresh: _refresh, child: const _OverviewTab()),
              _Tab(onRefresh: _refresh, child: const _FinancialTab()),
              _Tab(onRefresh: _refresh, child: const _EngagementTab()),
              _Tab(onRefresh: _refresh, child: const _HealthTab()),
            ],
          ),
        ),
      ],
    );
  }
}

class _Tab extends StatelessWidget {
  const _Tab({required this.onRefresh, required this.child});

  final Future<void> Function() onRefresh;
  final Widget child;

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: onRefresh,
    child: ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 60), children: [child]),
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------------------------------------------------

class _Card extends StatelessWidget {
  const _Card(this.title, this.child, {this.sub, super.key});

  final String title;
  final String? sub;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title,
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: t.textPrimary),
            ),
            if (sub != null) ...[
              const SizedBox(height: 2),
              Text(sub!, style: TextStyle(fontSize: 12, color: t.textSecondary)),
            ],
            const SizedBox(height: 10),
            child,
          ],
        ),
      ),
    );
  }
}

/// Loading / error wrapper for one card's data.
Widget _async<T>(BuildContext context, AsyncValue<T> v, Widget Function(T) build) => v.when(
  data: build,
  loading: () => const Padding(padding: EdgeInsets.all(8), child: LinearProgressIndicator()),
  error: (e, _) => Text('$e', style: TextStyle(color: context.tokens.textSecondary)),
);

String _pct(double v) => '${v.round()}%';

/// Horizontal bars scaled to [maxValue] (default: the largest row). [trailing] overrides the right-hand label.
class _Bars extends StatelessWidget {
  const _Bars({required this.rows, required this.color, this.maxValue, this.trailing});

  final List<(String, num)> rows;
  final Color color;
  final num? maxValue;
  final String Function(num)? trailing;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final max = maxValue ?? rows.fold<num>(1, (m, r) => r.$2 > m ? r.$2 : m);
    return Column(
      children: [
        for (final r in rows)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 3),
            child: Row(
              children: [
                SizedBox(
                  width: 118,
                  child: Text(
                    r.$1,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12.5, color: t.textSecondary),
                  ),
                ),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: LinearProgressIndicator(
                      value: max == 0 ? 0 : (r.$2 / max).clamp(0, 1).toDouble(),
                      minHeight: 8,
                      color: color,
                      backgroundColor: t.borderColor,
                    ),
                  ),
                ),
                SizedBox(
                  width: 62,
                  child: Text(
                    trailing?.call(r.$2) ?? '${r.$2}',
                    textAlign: TextAlign.end,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Column chart for a series, with caption labels under it.
class _Columns extends StatelessWidget {
  const _Columns({required this.values, required this.left, required this.right, required this.summary});

  final List<double> values;
  final String left;
  final String right;
  final String summary;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final max = values.fold<double>(1, (m, v) => v > m ? v : m);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 70,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              for (final v in values)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 1.5),
                    child: Container(
                      height: 4 + 66 * v / max,
                      decoration: BoxDecoration(
                        color: v == 0 ? t.borderColor : t.primaryAccent,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(left, style: TextStyle(fontSize: 11, color: t.textMuted)),
            Expanded(
              child: Text(
                summary,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 11, color: t.textSecondary),
              ),
            ),
            Text(right, style: TextStyle(fontSize: 11, color: t.textMuted)),
          ],
        ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontFamily: AppTypography.fontMono,
              fontSize: 10,
              letterSpacing: 0.6,
              color: t.textSecondary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(
              fontFamily: AppTypography.fontTitle,
              fontSize: 19,
              fontWeight: FontWeight.w800,
              color: t.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

Widget _empty(BuildContext context, String text) => Text(text, style: TextStyle(color: context.tokens.textSecondary));

// ---------------------------------------------------------------------------------------------------------------------
// Growth
// ---------------------------------------------------------------------------------------------------------------------

class _GrowthTab extends ConsumerWidget {
  const _GrowthTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final now = ref.watch(adminNowProvider)();
    final users = ref.watch(adminUsersProvider).value ?? const <AdminUser>[];
    final audit = ref.watch(adminAuditProvider).value ?? const <AuditEntry>[];
    final overrides = ref.watch(adminFlagOverridesProvider).value ?? const <FlagOverride>[];
    final armed = {
      ...defaultFeatureFlags,
      for (final o in overrides)
        if (o.scope == 'global') o.flagKey: o.value,
    };
    final auditPulses = [
      for (final l in audit)
        if (l.action == 'closeout_pulse' && l.details['wouldReuse'] is String) l.details['wouldReuse'] as String,
    ];
    return _async(context, ref.watch(adminFleetProvider), (d) {
      final loop = computeLoopHealth(d, now: now);
      final funnel = computeActivationFunnel(d, users);
      final ghosts = computeGhostTrips(d, now: now);
      final winBack = computeWinBackList(d, now: now);
      final flags = computeFlagUsageProxies(d, armed: armed);
      final invite = computeInviteAttribution(d);
      final slices = computeSliceLoopHealth(d, now: now);
      final pulse = computeCloseoutPulse(d, auditPulses: auditPulses);
      final splitwise = computeSplitwiseImports(d, audit: audit);
      final sources = computeSignupSources(users, audit: audit);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Card(
            'Loop health',
            sub: '${loop.tripCount} live trips',
            key: const Key('gr-loop'),
            _Bars(
              rows: [for (final s in loop.steps) (s.label, s.pct)],
              maxValue: 100,
              color: t.primaryAccent,
              trailing: (v) => _pct(v.toDouble()),
            ),
          ),
          _Card(
            'Activation funnel',
            key: const Key('gr-funnel'),
            Column(
              children: [
                for (final s in funnel)
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(s.label),
                    subtitle: LinearProgressIndicator(
                      value: s.pctOfFirst / 100,
                      minHeight: 6,
                      color: t.primaryAccent,
                      backgroundColor: t.borderColor,
                    ),
                    trailing: Text(
                      '${s.count} · ${_pct(s.pctOfPrev)}',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
              ],
            ),
          ),
          _Card(
            'Ghost trip queue',
            sub: 'Idle for a day with no spend, or over with spend and no settlement',
            key: const Key('gr-ghost'),
            ghosts.isEmpty
                ? _empty(context, 'No ghost trips.')
                : Column(
                    children: [
                      for (final g in ghosts.take(10))
                        ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text(g.name),
                          subtitle: Text(
                            '${g.kind == 'idle' ? 'Idle' : 'Unpaid'} · ${g.memberCount} members · ${g.expenseCount} expenses',
                          ),
                          trailing: Text('${g.ageDays}d'),
                        ),
                    ],
                  ),
          ),
          _Card(
            'Win-back list',
            sub: 'Settled trips quiet for 60–90 days, owner has no newer trip',
            key: const Key('gr-winback'),
            winBack.isEmpty
                ? _empty(context, 'Nobody to win back right now.')
                : Column(
                    children: [
                      for (final w in winBack.take(10))
                        ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text(w.name),
                          trailing: Text('${w.daysSinceSettle}d'),
                        ),
                    ],
                  ),
          ),
          _Card(
            'Flag used vs armed',
            sub: 'How many trips show signs of using each flagged feature',
            key: const Key('gr-flags'),
            Column(
              children: [
                for (final f in flags)
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(f.label),
                    subtitle: Text(f.proxy),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${f.used}/${f.eligible} · ${_pct(f.pct)}',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5),
                        ),
                        AdminPill(f.armed ? 'ARMED' : 'SAFED', color: f.armed ? t.colorSuccess : t.textMuted),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          _Card(
            'Invite & share attribution',
            key: const Key('gr-invite'),
            Column(
              children: [
                Row(
                  children: [
                    _Stat('Join code claimed', '${invite.joinCodeClaimed}'),
                    _Stat('Share links', '${invite.shareLinkCreated}'),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _Stat('Link views', '${invite.shareLinkViews}'),
                    _Stat('Join previews', '${invite.joinPreviews}'),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _Stat('Settled trips', '${invite.waSettleProxy}'),
                    _Stat('Unclaimed seats', '${invite.placeholderMembers}'),
                  ],
                ),
              ],
            ),
          ),
          _Card(
            'Trip-type slices',
            key: const Key('gr-slices'),
            Table(
              columnWidths: const {0: FlexColumnWidth(2.4)},
              children: [
                TableRow(
                  children: [
                    for (final h in const ['Type', 'Trips', '1st ≤10m', '2nd', 'Settle', 'Next'])
                      Text(
                        h,
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: t.textSecondary),
                      ),
                  ],
                ),
                for (final s in slices)
                  TableRow(
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Text(s.label, style: const TextStyle(fontSize: 12.5)),
                      ),
                      Text('${s.tripCount}', style: const TextStyle(fontSize: 12.5)),
                      Text(_pct(s.firstExpense10mPct), style: const TextStyle(fontSize: 12.5)),
                      Text(_pct(s.secondMemberPct), style: const TextStyle(fontSize: 12.5)),
                      Text(_pct(s.firstSettlePct), style: const TextStyle(fontSize: 12.5)),
                      Text(_pct(s.nextTrip90dPct), style: const TextStyle(fontSize: 12.5)),
                    ],
                  ),
              ],
            ),
          ),
          _Card(
            'Closeout pulse',
            sub: '"Would you use it again?" at trip closeout',
            key: const Key('gr-pulse'),
            pulse.answered == 0
                ? _empty(context, 'No answers yet.')
                : Text(
                    '${pulse.yes} yes · ${pulse.no} no · ${pulse.skip} skipped — ${_pct(pulse.wouldReusePct)} would reuse',
                    style: TextStyle(color: t.textPrimary),
                  ),
          ),
          _Card(
            'Splitwise imports',
            key: const Key('gr-splitwise'),
            Text(
              '${splitwise.tripCount} trips · ${splitwise.expenseCount} expenses imported',
              style: TextStyle(color: t.textPrimary),
            ),
          ),
          _Card(
            'Signup source (UTM)',
            key: const Key('gr-sources'),
            sources.isEmpty
                ? _empty(context, 'No signups yet.')
                : _Bars(rows: [for (final s in sources.take(8)) (s.source, s.count)], color: t.colorSuccess),
          ),
          _Card(
            'Retention by signup week',
            key: const Key('an-retention'),
            _async(context, ref.watch(adminRetentionProvider), (rows) {
              if (rows.isEmpty) return _empty(context, 'No cohorts yet.');
              String pct((int, int) h) => h.$1 == 0 ? '—' : '${(h.$2 * 100 / h.$1).round()}%';
              return Table(
                columnWidths: const {0: FlexColumnWidth(2.2)},
                children: [
                  TableRow(
                    children: [
                      for (final h in const ['Week', 'Size', 'D1', 'D7', 'D30'])
                        Text(
                          h,
                          style: TextStyle(fontWeight: FontWeight.w800, color: t.textSecondary, fontSize: 12),
                        ),
                    ],
                  ),
                  for (final r in rows)
                    TableRow(
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Text(r.week, style: const TextStyle(fontFamily: AppTypography.fontMono, fontSize: 12)),
                        ),
                        Text('${r.size}'),
                        Text(pct(r.d1)),
                        Text(pct(r.d7)),
                        Text(pct(r.d30)),
                      ],
                    ),
                ],
              );
            }),
          ),
          _Card(
            'Trip 1 → trip 2',
            key: const Key('an-repeat'),
            _async(context, ref.watch(adminRepeatCreatorsProvider), (r) {
              final pct = r.eligible == 0 ? 0 : (r.repeat * 100 / r.eligible).round();
              return Text(
                '${r.repeat} of ${r.eligible} creators made a second trip ($pct%).',
                style: TextStyle(color: t.textPrimary),
              );
            }),
          ),
        ],
      );
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------------------------------------------------

class _OverviewTab extends ConsumerWidget {
  const _OverviewTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final now = ref.watch(adminNowProvider)();
    final users = ref.watch(adminUsersProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _async(context, ref.watch(adminFleetProvider), (d) {
          final ex = activeExpenses(d);
          final life = computeLifecycle(d, ex);
          final stale = staleTrips(d, now: now);
          final join = computeJoinFunnel(d);
          final trend = computeSevenDayTrend(ex, now: now);
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _Card(
                'Fleet at a glance',
                key: const Key('ov-glance'),
                Row(
                  children: [
                    _Stat('Transactions', '${ex.length}'),
                    _Stat('Members', '${d.members.length}'),
                    _Stat('Trips', '${d.trips.length}'),
                  ],
                ),
              ),
              _Card(
                'Trip lifecycle',
                sub:
                    'Averages: ${life.avgDurationDays.toStringAsFixed(1)} days · ${life.avgMembers.toStringAsFixed(1)} members · ${life.avgExpenses.toStringAsFixed(1)} expenses',
                key: const Key('an-lifecycle'),
                _Bars(
                  rows: [('Active', life.active), ('Grounded', life.grounded), ('Archived', life.archived)],
                  color: t.primaryAccent,
                ),
              ),
              _Card(
                'Last 7 days',
                key: const Key('an-trend'),
                _Columns(
                  values: trend.dayBuckets,
                  left: '7d ago',
                  right: 'today',
                  summary:
                      '${trend.thisWeekCount} expenses · ${trend.pctChange >= 0 ? '+' : ''}${trend.pctChange.round()}% vs prior week',
                ),
              ),
              _Card(
                'Join funnel',
                key: const Key('an-join'),
                Text(
                  '${join.joined} of ${join.generated} trips have a member who joined (${_pct(join.pct)}).',
                  style: TextStyle(color: t.textPrimary),
                ),
              ),
              _Card(
                'Stale trips',
                sub: 'No expense for 30+ days',
                key: const Key('an-stale'),
                stale.isEmpty
                    ? _empty(context, 'No stale trips.')
                    : Column(
                        children: [
                          for (final s in stale.take(10))
                            ListTile(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              title: Text(s.name),
                              trailing: Text('${s.days}d'),
                            ),
                        ],
                      ),
              ),
            ],
          );
        }),
        _Card(
          'Signup growth · last 14 days',
          key: const Key('an-signups'),
          _async(context, users, (list) {
            final today = DateTime.fromMillisecondsSinceEpoch(now);
            final days = [
              for (var i = 13; i >= 0; i--) DateTime(today.year, today.month, today.day).subtract(Duration(days: i)),
            ];
            final counts = [
              for (final d in days)
                list
                    .where((u) {
                      final c = u.createdAt?.toLocal();
                      return c != null && c.year == d.year && c.month == d.month && c.day == d.day;
                    })
                    .length
                    .toDouble(),
            ];
            return _Columns(
              values: counts,
              left: '${days.first.day}/${days.first.month}',
              right: 'today',
              summary: '${counts.fold<double>(0, (a, b) => a + b).round()} signups',
            );
          }),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Financial
// ---------------------------------------------------------------------------------------------------------------------

class _FinancialTab extends ConsumerWidget {
  const _FinancialTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    return _async(context, ref.watch(adminFleetProvider), (d) {
      final ex = activeExpenses(d);
      final currencies = currencyBreakdown(ex);
      final cats = categoryBreakdown(ex);
      final spenders = topSpenders(d, ex);
      final modes = splitModeBreakdown(ex);
      final health = computeSettlementHealth(d);
      final daily = dailyVolume(ex);
      final edit = computeEditRate(ex);
      String money(double v, String c) => formatMoney(context, v, c);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Card(
            'Daily spend volume',
            key: const Key('fin-daily'),
            daily.length < 2
                ? _empty(context, 'Not enough days yet.')
                : _Columns(
                    values: daily.length > 30 ? daily.sublist(daily.length - 30) : daily,
                    left: 'older',
                    right: 'latest',
                    summary: '${ex.length} expenses',
                  ),
          ),
          _Card(
            'Currency volume',
            key: const Key('fin-currency'),
            currencies.isEmpty
                ? _empty(context, 'No expenses yet.')
                : Column(
                    children: [
                      for (final c in currencies)
                        ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text(c.currency),
                          subtitle: Text('${c.count} expenses'),
                          trailing: Text(
                            money(c.total, c.currency),
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                    ],
                  ),
          ),
          _Card(
            'Category aggregate spend',
            key: const Key('fin-categories'),
            cats.isEmpty
                ? _empty(context, 'No expenses yet.')
                : _Bars(
                    rows: [for (final c in cats) ('${c.icon} ${c.name}', c.pct)],
                    maxValue: 100,
                    color: t.colorWarning,
                    trailing: (v) => _pct(v.toDouble()),
                  ),
          ),
          _Card(
            'Top spenders',
            key: const Key('fin-spenders'),
            spenders.isEmpty
                ? _empty(context, 'No expenses yet.')
                : _Bars(
                    rows: [for (final s in spenders) (s.name, s.total)],
                    color: t.primaryAccent,
                    trailing: (v) => compactNumber(v.toDouble()),
                  ),
          ),
          _Card(
            'Split-mode adoption',
            key: const Key('fin-modes'),
            modes.isEmpty
                ? _empty(context, 'No expenses yet.')
                : _Bars(
                    rows: [for (final m in modes) (m.label, m.pct)],
                    maxValue: 100,
                    color: t.colorSuccess,
                    trailing: (v) => _pct(v.toDouble()),
                  ),
          ),
          _Card(
            'Settlement health',
            key: const Key('fin-settlement'),
            Text(
              '${health.settledCount} of ${health.settledCount + health.unsettledCount} trips settled (${_pct(health.settledPct)}); '
              '${compactNumber(health.outstandingVolume)} still owed across the rest.',
              style: TextStyle(color: t.textPrimary),
            ),
          ),
          _Card(
            'Edit rate',
            key: const Key('fin-edit'),
            Text(
              '${edit.edited} expenses were edited after creation (${_pct(edit.pct)}).',
              style: TextStyle(color: t.textPrimary),
            ),
          ),
        ],
      );
    });
  }
}

/// 12.3k / 4.5M style short number for the bar labels.
String compactNumber(double v) {
  final a = v.abs();
  if (a >= 10000000) return '${(v / 10000000).toStringAsFixed(1)}Cr';
  if (a >= 100000) return '${(v / 100000).toStringAsFixed(1)}L';
  if (a >= 1000) return '${(v / 1000).toStringAsFixed(1)}k';
  return v.toStringAsFixed(v == v.roundToDouble() ? 0 : 1);
}

// ---------------------------------------------------------------------------------------------------------------------
// Engagement
// ---------------------------------------------------------------------------------------------------------------------

class _EngagementTab extends ConsumerWidget {
  const _EngagementTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final now = ref.watch(adminNowProvider)();
    final users = ref.watch(adminUsersProvider).value ?? const <AdminUser>[];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _async(context, ref.watch(adminFleetProvider), (d) {
          final ex = activeExpenses(d);
          final week = weekdayActivity(ex);
          final adoption = computeFeatureAdoption(ex);
          final ret = computeRetention(users, d, now: now);
          const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _Card(
                'Activity by day of week',
                key: const Key('en-weekday'),
                _Bars(rows: [for (var i = 0; i < 7; i++) (names[i], week[i])], color: t.primaryAccent),
              ),
              _Card(
                'Feature adoption',
                key: const Key('en-adoption'),
                Text(
                  '${_pct(adoption.receiptPct)} of expenses carry a receipt (${adoption.receipts}); ${_pct(adoption.geotagPct)} are geotagged.',
                  style: TextStyle(color: t.textPrimary),
                ),
              ),
              _Card(
                '30-day activity',
                sub: 'Users who signed up 2+ weeks ago and logged an expense in the last 30 days',
                key: const Key('en-retention'),
                Text(
                  '${ret.retained} of ${ret.eligible} (${_pct(ret.pct)})',
                  style: TextStyle(color: t.textPrimary, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          );
        }),
        _Card(
          'Notification delivery',
          key: const Key('an-notifs'),
          _async(context, ref.watch(adminNotificationStatsProvider), (n) {
            final rate = n.total == 0 ? 0 : (n.read * 100 / n.total).round();
            return Text(
              '${n.total} sent · ${n.read} read ($rate%) · ${n.last7d} in the last 7 days',
              style: TextStyle(color: t.textPrimary),
            );
          }),
        ),
        _Card(
          'Devices with push enabled',
          key: const Key('an-devices'),
          _async(
            context,
            ref.watch(adminDevicesProvider),
            (dv) => dv.isEmpty
                ? _empty(context, 'No registered devices.')
                : _Bars(rows: [for (final e in dv.entries) (e.key, e.value)], color: t.colorSuccess),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------------------------------------------------

class _HealthTab extends ConsumerWidget {
  const _HealthTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Card(
          'Bug ledger pulse',
          key: const Key('an-bugs'),
          _async(context, ref.watch(adminBugsProvider), (list) {
            final p = computeBugPulse(list);
            final origin = <String, int>{};
            for (final b in list) {
              final k = b.foundBy.isEmpty ? 'unknown' : b.foundBy;
              origin[k] = (origin[k] ?? 0) + 1;
            }
            final top = (origin.entries.toList()..sort((a, b) => b.value.compareTo(a.value))).take(5);
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _Stat('Open', '${p.open}'),
                    _Stat('Critical', '${p.critical}'),
                    _Stat('Avg fix', p.avgResolveHours == null ? '—' : '${p.avgResolveHours!.round()}h'),
                  ],
                ),
                const SizedBox(height: 10),
                _Bars(
                  rows: [
                    for (final s in adminBugSeverities) (s, list.where((b) => b.isOpen && b.severity == s).length),
                  ],
                  color: t.colorDanger,
                ),
                const SizedBox(height: 10),
                Text(
                  'Reported by · ${_pct(p.autoPct)} are auto-filed crashes',
                  style: TextStyle(fontWeight: FontWeight.w700, color: t.textPrimary),
                ),
                const SizedBox(height: 4),
                _Bars(rows: [for (final e in top) (e.key, e.value)], color: t.colorWarning),
              ],
            );
          }),
        ),
        _Card(
          'Sync reliability · last 14 days',
          key: const Key('an-reliability'),
          _async(context, ref.watch(adminReliabilityProvider), (groups) {
            if (groups.isEmpty) return _empty(context, 'No reliability events yet.');
            return Column(
              children: [
                for (final g in groups)
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text('${g.platform} ${g.appVersion}'),
                    subtitle: Text('${g.openUsers} users opened · ${g.stuckUsers} stuck · ${g.failUsers} failed'),
                  ),
              ],
            );
          }),
        ),
        _Card(
          'Recycle bins',
          key: const Key('an-recycled'),
          _async(
            context,
            ref.watch(adminRecycledCountProvider),
            (n) => Text('$n expenses are waiting in recycle bins.', style: TextStyle(color: t.textPrimary)),
          ),
        ),
      ],
    );
  }
}
