import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format/money.dart';
import '../../../domain/logic/burn_rate.dart';
import '../../../domain/logic/category_color.dart';
import '../../../domain/logic/spend_insights.dart';
import '../../../domain/models/expense.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_surface.dart';
import '../../../shared/widgets/bento_tile.dart';
import '../../trip_details/application/trip_nav.dart';
import '../application/expenses_providers.dart';

/// Board 04 #11: Slate insights screen, opened by tapping the Expenses summary card
/// (flag `enableSpendInsights`). Daily line, projected total and category donut.
class SpendInsightsScreen extends ConsumerWidget {
  const SpendInsightsScreen({required this.tripId, super.key});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Theme(
      data: AppTheme.dark(),
      child: Builder(
        builder: (ctx) => _Body(tripId: tripId, ref: ref),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.tripId, required this.ref});

  final String tripId;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final trip = ref.watch(tripProvider(tripId)).value;
    final expenses = ref.watch(tripExpensesProvider(tripId)).value ?? const <Expense>[];
    final categories = {for (final c in ref.watch(tripCategoriesProvider(tripId))) c.id: c};
    final days = spendByDay(expenses);
    final cats = spendByCategory(expenses);
    final total = days.fold<double>(0, (s, d) => s + d.total);
    final currency = trip?.baseCurrency ?? 'INR';
    final burn = trip == null ? null : computeBurnRateInsight(trip.startDate, trip.endDate, total);
    final avg = burn?.dailyAverage ?? (days.isEmpty ? 0.0 : total / days.length);
    final biggest = days.isEmpty ? null : days.reduce((a, b) => b.total > a.total ? b : a);

    return Scaffold(
      backgroundColor: tokens.bgPage,
      appBar: AppBar(
        title: const Text('Insights'),
        leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20), onPressed: context.pop),
      ),
      body: DecoratedBox(
        decoration: BoxDecoration(color: tokens.bgPage),
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            // Desktop: keep the charts a readable width instead of stretching across the window.
            constraints: const BoxConstraints(maxWidth: 960),
            child: SafeArea(
              child: days.isEmpty
                  ? Center(
                      child: Text('Add some expenses to see insights.', style: TextStyle(color: tokens.textSecondary)),
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: _Kpi(
                                tone: BentoTone.butter,
                                label: 'Daily avg',
                                value: formatMoney(context, avg, currency),
                                key: const Key('insight-avg'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _Kpi(
                                tone: BentoTone.peach,
                                label: biggest == null ? 'Biggest day' : 'Biggest day · ${biggest.date.substring(5)}',
                                value: biggest == null ? '-' : formatMoney(context, biggest.total, currency),
                                key: const Key('insight-biggest'),
                              ),
                            ),
                          ],
                        ),
                        if (burn != null) ...[
                          const SizedBox(height: 12),
                          _Kpi(
                            tone: BentoTone.mint,
                            label: 'On track for · ${burn.daysElapsed} of ${burn.daysTotal} days',
                            value: formatMoney(context, burn.projectedTotal, currency),
                            key: const Key('insight-projected'),
                          ),
                        ],
                        const SizedBox(height: 20),
                        BentoTile(
                          tone: BentoTone.sky,
                          padding: const EdgeInsets.all(12),
                          child: SizedBox(
                            height: 160,
                            child: CustomPaint(
                              key: const Key('insight-line'),
                              painter: _LinePainter([for (final d in days) d.total], tokens.textPrimary),
                              size: Size.infinite,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        AppCard(
                          child: Row(
                            children: [
                              SizedBox(
                                width: 120,
                                height: 120,
                                child: CustomPaint(
                                  key: const Key('insight-donut'),
                                  painter: _DonutPainter(
                                    [for (final c in cats) c.total],
                                    [for (final c in cats) Color(categoryColorArgb(c.categoryId))],
                                    tokens.bgSurface,
                                  ),
                                  child: Center(
                                    child: Text(
                                      formatMoney(context, total, currency),
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  children: [
                                    for (final c in cats.take(5))
                                      Padding(
                                        padding: const EdgeInsets.symmetric(vertical: 4),
                                        child: Row(
                                          children: [
                                            Container(
                                              width: 10,
                                              height: 10,
                                              decoration: BoxDecoration(
                                                shape: BoxShape.circle,
                                                color: Color(categoryColorArgb(c.categoryId)),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Text(
                                                categories[c.categoryId]?.name ?? c.categoryId,
                                                overflow: TextOverflow.ellipsis,
                                                style: TextStyle(color: tokens.textSecondary),
                                              ),
                                            ),
                                            Text(
                                              formatMoney(context, c.total, currency),
                                              style: const TextStyle(fontWeight: FontWeight.w700),
                                            ),
                                          ],
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi({required this.tone, required this.label, required this.value, super.key});

  final BentoTone tone;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return BentoTile(
      tone: tone,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          BentoTile.eyebrow(context, tone, label),
          const SizedBox(height: 6),
          Text(value, style: AppTypography.moneyDisplay(fontSize: 26, color: context.tokens.textPrimary)),
        ],
      ),
    );
  }
}

/// Smooth line (ink on the sky tile) through the daily totals with a dot on the biggest day.
class _LinePainter extends CustomPainter {
  const _LinePainter(this.values, this.accent);

  final List<double> values;
  final Color accent;

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;
    final maxV = values.reduce(math.max);
    final minV = values.reduce(math.min);
    final span = (maxV - minV) == 0 ? 1.0 : (maxV - minV);
    const pad = 12.0;
    Offset pt(int i) {
      final x = values.length == 1 ? size.width / 2 : pad + i * (size.width - 2 * pad) / (values.length - 1);
      final y = size.height - pad - (values[i] - minV) / span * (size.height - 2 * pad);
      return Offset(x, y);
    }

    final path = Path()..moveTo(pt(0).dx, pt(0).dy);
    for (var i = 1; i < values.length; i++) {
      final a = pt(i - 1);
      final b = pt(i);
      final mid = (a.dx + b.dx) / 2;
      path.cubicTo(mid, a.dy, mid, b.dy, b.dx, b.dy);
    }
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round
      ..color = accent;
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 8
        ..color = accent.withValues(alpha: 0.18)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
    );
    canvas.drawPath(path, stroke);
    final top = values.indexOf(maxV);
    canvas.drawCircle(pt(top), 5, Paint()..color = accent);
  }

  @override
  bool shouldRepaint(_LinePainter old) => old.values != values || old.accent != accent;
}

/// Ring chart: one arc per category, with a small gap between arcs.
class _DonutPainter extends CustomPainter {
  const _DonutPainter(this.values, this.colors, this.track);

  final List<double> values;
  final List<Color> colors;
  final Color track;

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 16.0;
    final rect = Rect.fromLTWH(stroke / 2, stroke / 2, size.width - stroke, size.height - stroke);
    final sum = values.fold<double>(0, (s, v) => s + v);
    final base = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..color = track;
    canvas.drawArc(rect, 0, math.pi * 2, false, base);
    if (sum <= 0) return;
    var start = -math.pi / 2;
    const gap = 0.04;
    for (var i = 0; i < values.length; i++) {
      final sweep = values[i] / sum * math.pi * 2;
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..color = colors[i];
      canvas.drawArc(rect, start + gap / 2, math.max(0.001, sweep - gap), false, paint);
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(_DonutPainter old) => old.values != values || old.colors != colors;
}
