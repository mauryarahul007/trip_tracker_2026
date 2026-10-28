import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/format/money.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/burn_rate.dart';
import '../../../domain/logic/category_color.dart';
import '../../../domain/logic/group_spend.dart';
import '../../../domain/logic/refunds.dart';
import '../../../domain/logic/spend_insights.dart';
import '../../../domain/logic/summary_features.dart';
import '../../../domain/models/expense.dart';
import '../../../domain/models/member.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/app_surface.dart';
import '../../trip_details/application/trip_nav.dart';
import '../application/expenses_providers.dart';
import '../application/trip_budget.dart';
import 'widgets/expense_detail_sheet.dart';

/// Flag `enableInsightsV2`: the upgraded Insights page in the Calm Passport look. Hero total, budget pace, daily
/// bars, running total, ranked categories, who paid vs their share and the biggest expenses. Refunds are netted.
class SpendInsightsV2Body extends ConsumerWidget {
  const SpendInsightsV2Body({required this.tripId, super.key});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final trip = ref.watch(tripProvider(tripId)).value;
    final expenses = ref.watch(tripExpensesProvider(tripId)).value ?? const <Expense>[];
    final categories = {for (final c in ref.watch(tripCategoriesProvider(tripId))) c.id: c};
    final members = ref.watch(tripMembersProvider(tripId)).value ?? const <Member>[];
    final names = {for (final m in members) m.id: m.name};
    final days = spendByDay(expenses);
    final cats = spendByCategory(expenses);
    final total = days.fold<double>(0, (s, d) => s + d.total);
    final currency = trip?.baseCurrency ?? 'INR';
    final burn = trip == null ? null : computeBurnRateInsight(trip.startDate, trip.endDate, total);
    final avg = burn?.dailyAverage ?? (days.isEmpty ? 0.0 : total / days.length);
    final budgetOn = ref.watch(flagProvider(('enableTripBudget', tripId))).value ?? false;
    final budget = budgetOn ? ref.watch(tripBudgetProvider(tripId)) : 0.0;
    final spend = memberSpend(applyRefunds(expenses.where((e) => !e.isSettlement).toList()));
    final people = [
      for (final id in {...spend.paid.keys, ...spend.share.keys})
        if (((spend.paid[id] ?? 0) - (spend.share[id] ?? 0)).abs() >= 0.01 || (spend.paid[id] ?? 0) > 0)
          (id: id, name: names[id] ?? '?', net: (spend.paid[id] ?? 0) - (spend.share[id] ?? 0)),
    ]..sort((a, b) => b.net.compareTo(a.net));
    final top = topExpenses(expenses);
    String money(double v) => formatMoney(context, v, currency);

    Widget section(String title, String? note, Widget child, {Key? key}) => Padding(
      key: key,
      padding: const EdgeInsets.only(top: 20),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontFamily: AppTypography.fontTitle, fontSize: 17, fontWeight: FontWeight.w800),
            ),
            if (note != null) ...[
              const SizedBox(height: 2),
              Text(note, style: TextStyle(fontSize: 12.5, color: tokens.textSecondary)),
            ],
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );

    return days.isEmpty
        ? Center(
            child: Text('Add some expenses to see insights.', style: TextStyle(color: tokens.textSecondary)),
          )
        : ListView(
            key: const Key('insights-v2'),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              _HeroTotal(
                total: money(total),
                eyebrow: burn == null
                    ? 'Spent · ${days.length} ${days.length == 1 ? 'day' : 'days'}'
                    : 'Spent · day ${burn.daysElapsed} of ${burn.daysTotal}',
                avg: money(avg),
                projected: burn == null ? null : money(burn.projectedTotal),
                budget: budget > 0 ? (spent: total, budget: budget, label: money) : null,
              ),
              section(
                'Daily spend',
                'Tap a bar to see that day. The dashed line is your daily average.',
                _DailyBars(days: days, avg: avg, money: money),
                key: const Key('insight-daily'),
              ),
              if (days.length >= 2)
                section(
                  'Running total',
                  budget > 0 ? 'How spending built up. The dashed line is your budget.' : 'How spending built up.',
                  SizedBox(
                    height: 140,
                    child: CustomPaint(
                      key: const Key('insight-running'),
                      size: Size.infinite,
                      painter: _RunningPainter(
                        runningTotals(days),
                        budget,
                        tokens.primaryAccent,
                        tokens.borderColor,
                        tokens.textMuted,
                      ),
                    ),
                  ),
                ),
              section(
                'By category',
                null,
                _CategoryBars(
                  rows: [
                    for (final c in cats)
                      (
                        name: categories[c.categoryId]?.name ?? c.categoryId,
                        color: Color(categoryColorArgb(c.categoryId)),
                        total: c.total,
                      ),
                  ],
                  total: total,
                  money: money,
                ),
                key: const Key('insight-categories'),
              ),
              if (people.length >= 2)
                section(
                  'Paid vs share',
                  'Green paid more than their share. Red paid less. Before settle-ups.',
                  _PeopleBars(people: people, money: money),
                  key: const Key('insight-people'),
                ),
              if (top.isNotEmpty)
                section(
                  'Biggest expenses',
                  null,
                  Column(
                    children: [
                      for (final (i, e) in top.indexed)
                        _TopRow(
                          key: Key('insight-top-$i'),
                          rank: i + 1,
                          title: e.title,
                          sub: '${_day(e.date)} · ${categories[e.category]?.name ?? e.category}',
                          amount: money(e.amount),
                          color: Color(categoryColorArgb(e.category)),
                          onTap: () => AppSheet.show<void>(
                            context: context,
                            builder: (sheetCtx) => ExpenseDetailSheet(
                              tripId: tripId,
                              expenseId: e.id,
                              onEdit: () => Navigator.of(sheetCtx).pop(),
                              onDelete: () => Navigator.of(sheetCtx).pop(),
                            ),
                          ),
                        ),
                    ],
                  ),
                  key: const Key('insight-top'),
                ),
            ],
          );
  }
}

String _day(String yyyyMmDd) {
  final d = DateTime.tryParse(yyyyMmDd);
  return d == null ? yyyyMmDd : DateFormat('d MMM').format(d);
}

/// Night hero tile: what was spent, with daily average, projected total and the budget meter under it.
class _HeroTotal extends StatelessWidget {
  const _HeroTotal({
    required this.total,
    required this.eyebrow,
    required this.avg,
    required this.projected,
    required this.budget,
  });

  final String total;
  final String eyebrow;
  final String avg;
  final String? projected;
  final ({double spent, double budget, String Function(double) label})? budget;

  @override
  Widget build(BuildContext context) {
    Widget stat(String label, String value, Key key) => Expanded(
      child: Column(
        key: key,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontFamily: AppTypography.fontMono,
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
              color: Colors.white60,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              fontFeatures: AppTypography.tabularFigures,
            ),
          ),
        ],
      ),
    );
    final b = budget;
    final status = b == null ? null : budgetStatus(b.spent, b.budget);
    final meter = switch (status?.level) {
      BudgetLevel.over => const Color(0xFFFF8A73),
      BudgetLevel.warn => AppColors.budgetWarn,
      _ => const Color(0xFF4FD1C1),
    };
    return Container(
      key: const Key('insight-hero'),
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.heroNavyDeep, AppColors.heroNavy, AppColors.heroTeal],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            eyebrow.toUpperCase(),
            style: const TextStyle(
              fontFamily: AppTypography.fontMono,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.6,
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 6),
          Text(total, style: AppTypography.moneyDisplay(fontSize: 34, color: Colors.white)),
          const SizedBox(height: 14),
          Row(
            children: [
              stat('Daily avg', avg, const Key('insight-avg')),
              if (projected != null) stat('On track for', projected!, const Key('insight-projected')),
            ],
          ),
          if (b != null && status != null) ...[
            const SizedBox(height: 16),
            Semantics(
              label: 'Budget ${(b.spent / b.budget * 100).round()} percent used',
              child: ClipRRect(
                key: const Key('insight-budget'),
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: status.fraction,
                  minHeight: 8,
                  backgroundColor: Colors.white.withValues(alpha: 0.16),
                  valueColor: AlwaysStoppedAnimation(meter),
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              status.remaining >= 0
                  ? '${(b.spent / b.budget * 100).round()}% of ${b.label(b.budget)} budget · ${b.label(status.remaining)} left'
                  : 'Over budget by ${b.label(-status.remaining)}',
              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Colors.white70),
            ),
          ],
        ],
      ),
    );
  }
}

/// One bar per spending day. Tap a bar to read it; the readout above shows the day, or the average when none is picked.
class _DailyBars extends StatefulWidget {
  const _DailyBars({required this.days, required this.avg, required this.money});

  final List<DaySpend> days;
  final double avg;
  final String Function(double) money;

  @override
  State<_DailyBars> createState() => _DailyBarsState();
}

class _DailyBarsState extends State<_DailyBars> {
  int? _picked;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final days = widget.days;
    final top = days.reduce((a, b) => b.total > a.total ? b : a);
    final picked = _picked == null || _picked! >= days.length ? null : days[_picked!];
    final readout = picked == null
        ? ('Biggest · ${_day(top.date)}', widget.money(top.total))
        : (_day(picked.date), widget.money(picked.total));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Text(
                readout.$1,
                key: const Key('insight-daily-readout'),
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: t.textSecondary),
              ),
            ),
            Text(
              readout.$2,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: t.textPrimary,
                fontFeatures: AppTypography.tabularFigures,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        LayoutBuilder(
          builder: (_, c) => GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTapDown: (d) {
              final i = (d.localPosition.dx / c.maxWidth * days.length).floor().clamp(0, days.length - 1);
              setState(() => _picked = _picked == i ? null : i);
            },
            child: SizedBox(
              height: 150,
              width: c.maxWidth,
              child: CustomPaint(
                key: const Key('insight-bars'),
                painter: _BarsPainter(
                  [for (final d in days) d.total],
                  widget.avg,
                  _picked,
                  t.primaryAccent,
                  t.textMuted,
                  t.borderColor,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            Text(_day(days.first.date), style: TextStyle(fontSize: 11, color: t.textMuted)),
            const Spacer(),
            if (days.length > 1) Text(_day(days.last.date), style: TextStyle(fontSize: 11, color: t.textMuted)),
          ],
        ),
      ],
    );
  }
}

class _BarsPainter extends CustomPainter {
  const _BarsPainter(this.values, this.avg, this.picked, this.bar, this.muted, this.grid);

  final List<double> values;
  final double avg;
  final int? picked;
  final Color bar;
  final Color muted;
  final Color grid;

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;
    final maxV = math.max(values.reduce(math.max), avg);
    if (maxV <= 0) return;
    canvas.drawLine(
      Offset(0, size.height),
      Offset(size.width, size.height),
      Paint()
        ..color = grid
        ..strokeWidth = 1,
    );
    final slot = size.width / values.length;
    final w = math.min(28.0, math.max(2.0, slot - 2)); // 2px surface gap between bars
    for (var i = 0; i < values.length; i++) {
      final h = math.max(2.0, values[i] / maxV * (size.height - 4));
      final x = i * slot + (slot - w) / 2;
      final r = RRect.fromRectAndCorners(
        Rect.fromLTWH(x, size.height - h, w, h),
        topLeft: Radius.circular(math.min(4, w / 2)),
        topRight: Radius.circular(math.min(4, w / 2)),
      );
      final dim = picked != null && picked != i;
      canvas.drawRRect(r, Paint()..color = dim ? bar.withValues(alpha: 0.35) : bar);
    }
    // Dashed average line.
    final y = size.height - avg / maxV * (size.height - 4);
    final dash = Paint()
      ..color = muted
      ..strokeWidth = 1.5;
    for (var x = 0.0; x < size.width; x += 8) {
      canvas.drawLine(Offset(x, y), Offset(math.min(x + 4, size.width), y), dash);
    }
  }

  @override
  bool shouldRepaint(_BarsPainter old) =>
      old.values != values || old.picked != picked || old.avg != avg || old.bar != bar;
}

/// Running total as a 2px line with a soft fill, end dot, and the budget as a dashed line when there is one.
class _RunningPainter extends CustomPainter {
  const _RunningPainter(this.values, this.budget, this.line, this.grid, this.muted);

  final List<double> values;
  final double budget;
  final Color line;
  final Color grid;
  final Color muted;

  @override
  void paint(Canvas canvas, Size size) {
    if (values.length < 2) return;
    final maxV = math.max(values.last, budget);
    if (maxV <= 0) return;
    const pad = 6.0;
    Offset pt(int i) => Offset(
      pad + i * (size.width - 2 * pad) / (values.length - 1),
      size.height - values[i] / maxV * (size.height - 2 * pad),
    );
    canvas.drawLine(
      Offset(0, size.height),
      Offset(size.width, size.height),
      Paint()
        ..color = grid
        ..strokeWidth = 1,
    );
    final path = Path()..moveTo(pt(0).dx, pt(0).dy);
    for (var i = 1; i < values.length; i++) {
      path.lineTo(pt(i).dx, pt(i).dy);
    }
    final area = Path.from(path)
      ..lineTo(pt(values.length - 1).dx, size.height)
      ..lineTo(pt(0).dx, size.height)
      ..close();
    canvas.drawPath(
      area,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [line.withValues(alpha: 0.22), line.withValues(alpha: 0.0)],
        ).createShader(Offset.zero & size),
    );
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeJoin = StrokeJoin.round
        ..color = line,
    );
    final end = pt(values.length - 1);
    canvas.drawCircle(end, 5, Paint()..color = line);
    if (budget > 0) {
      final y = size.height - budget / maxV * (size.height - 2 * pad);
      final dash = Paint()
        ..color = muted
        ..strokeWidth = 1.5;
      for (var x = 0.0; x < size.width; x += 8) {
        canvas.drawLine(Offset(x, y), Offset(math.min(x + 4, size.width), y), dash);
      }
    }
  }

  @override
  bool shouldRepaint(_RunningPainter old) => old.values != values || old.budget != budget || old.line != line;
}

/// Ranked category bars: name, amount and share of the total. Past six, the rest fold into "Other".
class _CategoryBars extends StatelessWidget {
  const _CategoryBars({required this.rows, required this.total, required this.money});

  final List<({String name, Color color, double total})> rows;
  final double total;
  final String Function(double) money;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final shown = rows.length <= 6
        ? rows
        : [
            ...rows.take(5),
            (name: 'Other', color: t.textMuted, total: rows.skip(5).fold<double>(0, (s, r) => s + r.total)),
          ];
    final maxV = shown.isEmpty ? 1.0 : shown.map((r) => r.total).reduce(math.max);
    return Column(
      children: [
        for (final r in shown)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: r.color),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        r.name,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontWeight: FontWeight.w600, color: t.textPrimary),
                      ),
                    ),
                    Text(
                      money(r.total),
                      style: const TextStyle(fontFeatures: AppTypography.tabularFigures, fontWeight: FontWeight.w700),
                    ),
                    SizedBox(
                      width: 44,
                      child: Text(
                        total <= 0 ? '' : '${(r.total / total * 100).round()}%',
                        textAlign: TextAlign.right,
                        style: TextStyle(
                          fontSize: 12,
                          color: t.textSecondary,
                          fontFeatures: AppTypography.tabularFigures,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: maxV <= 0 ? 0 : r.total / maxV,
                    minHeight: 8,
                    backgroundColor: t.borderColor.withValues(alpha: 0.35),
                    valueColor: AlwaysStoppedAnimation(r.color),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Diverging bars around a centre line: paid minus share per person. Sign and arrow carry the meaning, not only colour.
class _PeopleBars extends StatelessWidget {
  const _PeopleBars({required this.people, required this.money});

  final List<({String id, String name, double net})> people;
  final String Function(double) money;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final maxAbs = people.map((p) => p.net.abs()).fold<double>(0, math.max);
    return Column(
      children: [
        for (final p in people)
          Padding(
            key: Key('insight-person-${p.id}'),
            padding: const EdgeInsets.symmetric(vertical: 5),
            child: Row(
              children: [
                SizedBox(
                  width: 84,
                  child: Text(
                    p.name,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontWeight: FontWeight.w600, color: t.textPrimary),
                  ),
                ),
                Expanded(
                  child: SizedBox(
                    height: 14,
                    child: CustomPaint(
                      painter: _DivergePainter(
                        maxAbs <= 0 ? 0 : p.net / maxAbs,
                        p.net >= 0 ? t.colorSuccess : t.colorDanger,
                        t.borderColor,
                      ),
                    ),
                  ),
                ),
                SizedBox(
                  width: 104,
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerRight,
                    child: Text(
                      p.net.abs() < 0.01 ? 'even' : '${p.net > 0 ? '↑ +' : '↓ -'}${money(p.net.abs())}',
                      maxLines: 1,
                      textAlign: TextAlign.right,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: t.textPrimary,
                        fontFeatures: AppTypography.tabularFigures,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _DivergePainter extends CustomPainter {
  const _DivergePainter(this.ratio, this.color, this.axis);

  /// -1..1 of the widest bar.
  final double ratio;
  final Color color;
  final Color axis;

  @override
  void paint(Canvas canvas, Size size) {
    final mid = size.width / 2;
    canvas.drawLine(
      Offset(mid, 0),
      Offset(mid, size.height),
      Paint()
        ..color = axis
        ..strokeWidth = 1,
    );
    final w = (size.width / 2 - 4) * ratio.abs();
    if (w < 0.5) return;
    final rect = ratio >= 0
        ? Rect.fromLTWH(mid + 1, 2, w, size.height - 4)
        : Rect.fromLTWH(mid - 1 - w, 2, w, size.height - 4);
    final r = RRect.fromRectAndCorners(
      rect,
      topRight: ratio >= 0 ? const Radius.circular(4) : Radius.zero,
      bottomRight: ratio >= 0 ? const Radius.circular(4) : Radius.zero,
      topLeft: ratio < 0 ? const Radius.circular(4) : Radius.zero,
      bottomLeft: ratio < 0 ? const Radius.circular(4) : Radius.zero,
    );
    canvas.drawRRect(r, Paint()..color = color);
  }

  @override
  bool shouldRepaint(_DivergePainter old) => old.ratio != ratio || old.color != color;
}

class _TopRow extends StatelessWidget {
  const _TopRow({
    required this.rank,
    required this.title,
    required this.sub,
    required this.amount,
    required this.color,
    required this.onTap,
    super.key,
  });

  final int rank;
  final String title;
  final String sub;
  final String amount;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: color.withValues(alpha: 0.18), shape: BoxShape.circle),
              child: Text(
                '$rank',
                style: TextStyle(fontFamily: AppTypography.fontMono, fontWeight: FontWeight.w800, color: t.textPrimary),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontWeight: FontWeight.w700, color: t.textPrimary),
                  ),
                  Text(sub, style: TextStyle(fontSize: 12, color: t.textSecondary)),
                ],
              ),
            ),
            Text(
              amount,
              style: const TextStyle(fontWeight: FontWeight.w800, fontFeatures: AppTypography.tabularFigures),
            ),
          ],
        ),
      ),
    );
  }
}
