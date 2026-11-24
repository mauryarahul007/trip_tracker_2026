import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/format/money.dart';
import '../../../../core/platform/external_launcher.dart';
import '../../../../core/platform/haptics.dart';
import '../../../../domain/logic/itinerary_timeline_logic.dart';
import '../../../../domain/models/expense.dart';
import '../../../../domain/models/itinerary_item.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../../../../shared/widgets/confirm_dialog.dart';
import '../../application/itinerary_providers.dart';
import 'itinerary_activity_sheet.dart';

const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/// Tint and icon for an itinerary category ("Itinerary day" mockup: tinted tile per stop).
(BentoTone, IconData) _look(String? category) => switch (category) {
  'food' => (BentoTone.peach, Icons.restaurant_rounded),
  'sightseeing' => (BentoTone.lilac, Icons.account_balance_outlined),
  'transport' => (BentoTone.mint, Icons.directions_car_outlined),
  'lodging' => (BentoTone.sky, Icons.hotel_outlined),
  'other' => (BentoTone.butter, Icons.auto_awesome_outlined),
  _ => (BentoTone.lilac, Icons.local_activity_outlined),
};

(BentoTone, IconData) _passLook(String type) => switch (type) {
  'flight' => (BentoTone.sky, Icons.flight_rounded),
  'stay' => (BentoTone.sky, Icons.hotel_outlined),
  'train' => (BentoTone.mint, Icons.train_outlined),
  'transit' => (BentoTone.mint, Icons.directions_bus_outlined),
  _ => (BentoTone.butter, Icons.confirmation_number_outlined),
};

/// "08:30" from "8:30" / "08:30:00"; empty when there is no usable time.
/// The stop's own time: an activity saved without one has none (the shared timeline fills in 10:00 to sort it).
String _timeOf(ItineraryTimelineItem i) => _hhmm(i.activityData != null ? i.activityData!.time : i.time);

String _hhmm(String? raw) {
  final parts = (raw ?? '').trim().split(':');
  if (parts.length < 2) return '';
  final h = int.tryParse(parts[0]);
  final m = int.tryParse(parts[1]);
  if (h == null || m == null) return '';
  return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
}

/// Horizon itinerary (flag `enableHorizonUi`): a date strip, one day at a time, and a vertical timeline with the
/// time on the left. Tapping a stop opens its actions (directions, add bill, done, edit, delete). That day's bills
/// fold into one "Spent" row under the plan.
class HorizonItineraryDays extends ConsumerStatefulWidget {
  const HorizonItineraryDays({
    super.key,
    required this.tripId,
    required this.days,
    required this.currency,
    this.tripStartDate,
    this.tripEndDate,
    this.now,
  });

  final String tripId;
  final List<DayItineraryGroup> days;
  final String currency;
  final String? tripStartDate;
  final String? tripEndDate;

  /// Test seam for "which stop is next".
  final DateTime? now;

  @override
  ConsumerState<HorizonItineraryDays> createState() => _HorizonItineraryDaysState();
}

class _HorizonItineraryDaysState extends ConsumerState<HorizonItineraryDays> {
  String? _selected;
  bool _billsOpen = false;
  final _strip = ScrollController();

  @override
  void dispose() {
    _strip.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    // Bring the opening day (today during the trip) into view in the date strip.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_strip.hasClients) return;
      final i = widget.days.indexOf(_day);
      if (i > 2) _strip.jumpTo(((i - 2) * 62.0).clamp(0.0, _strip.position.maxScrollExtent));
    });
  }

  DayItineraryGroup get _day {
    final days = widget.days;
    final hit = days.where((d) => d.date == _selected).firstOrNull;
    if (hit != null) return hit;
    // Opens on today during the trip, else on the first day.
    return days.where((d) => d.isToday).firstOrNull ?? days.first;
  }

  void _add(String date) => ItineraryActivitySheet.show(
    context,
    tripId: widget.tripId,
    initialDate: date,
    tripStartDate: widget.tripStartDate,
    tripEndDate: widget.tripEndDate,
  );

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final day = _day;
    final d = DateTime.tryParse(day.date);
    final longLabel = d == null ? day.dateLabel : '${_weekdays[d.weekday - 1]} ${d.day} ${_months[d.month - 1]}';
    final shortLabel = d == null ? day.dateLabel : '${_weekdays[d.weekday - 1]} ${d.day}';
    final stops = day.items.where((i) => i.kind != ItineraryItemKind.expense).toList();
    final anytime = stops.where((i) => _timeOf(i).isEmpty).toList();
    final timed = stops.where((i) => _timeOf(i).isNotEmpty).toList()..sort((a, b) => _timeOf(a).compareTo(_timeOf(b)));
    String? nextId;
    if (day.isToday) {
      final now = widget.now ?? DateTime.now();
      final nowHm = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
      nextId = timed
          .where((i) => i.kind == ItineraryItemKind.activity && !i.completed && _timeOf(i).compareTo(nowHm) >= 0)
          .firstOrNull
          ?.id;
    }

    return Column(
      key: const Key('horizon-itinerary'),
      children: [
        if (widget.days.length > 1)
          SizedBox(
            height: 78,
            child: ListView(
              controller: _strip,
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 6),
              children: [
                for (final g in widget.days)
                  _DayPill(
                    group: g,
                    selected: g.date == day.date,
                    onTap: () {
                      AppHaptics.selection();
                      setState(() {
                        _selected = g.date;
                        _billsOpen = false;
                      });
                    },
                  ),
              ],
            ),
          ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          day.dayNumber != null ? 'Day ${day.dayNumber} · $longLabel' : longLabel,
                          key: const Key('itin-day-title'),
                          style: TextStyle(
                            fontFamily: AppTypography.fontBody,
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: t.textPrimary,
                          ),
                        ),
                        if (stops.isNotEmpty)
                          Text(
                            '${stops.length} ${stops.length == 1 ? 'stop' : 'stops'}'
                            '${day.totalActivitiesCount > 0 ? ' · ${day.completedActivitiesCount}/${day.totalActivitiesCount} done' : ''}',
                            style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 12, color: t.textSecondary),
                          ),
                      ],
                    ),
                  ),
                  FilledButton.tonalIcon(
                    key: const Key('itin-add'),
                    style: FilledButton.styleFrom(
                      backgroundColor: t.primaryAccentLight,
                      foregroundColor: t.primaryAccent,
                      minimumSize: const Size(48, 40),
                      textStyle: const TextStyle(fontFamily: AppTypography.fontBody, fontWeight: FontWeight.w700),
                    ),
                    onPressed: () => _add(day.date),
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text('Add'),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              if (stops.isEmpty)
                _EmptyDay(label: shortLabel, onAdd: () => _add(day.date))
              else ...[
                if (anytime.isNotEmpty) ...[
                  const _Eyebrow('ANYTIME'),
                  for (final i in anytime) _stop(i, time: null, next: false, last: true),
                  if (timed.isNotEmpty) const SizedBox(height: 8),
                ],
                for (final (n, i) in timed.indexed)
                  _stop(i, time: _timeOf(i), next: i.id == nextId, last: n == timed.length - 1),
              ],
              if (day.expenses.isNotEmpty) ...[
                const SizedBox(height: 8),
                _BillsFold(
                  expenses: day.expenses,
                  total: day.totalSpend,
                  currency: widget.currency,
                  open: _billsOpen,
                  onToggle: () => setState(() => _billsOpen = !_billsOpen),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _stop(ItineraryTimelineItem i, {required String? time, required bool next, required bool last}) {
    final card = _StopCard(
      item: i,
      next: next,
      currency: widget.currency,
      onTap: i.activityData == null ? null : () => _actions(i.activityData!),
    );
    if (time == null) return Padding(padding: const EdgeInsets.only(bottom: 10), child: card);
    return _TimelineRow(time: time, next: next, last: last, child: card);
  }

  Future<void> _actions(ItineraryItem item) async {
    final notifier = ref.read(tripItineraryProvider(widget.tripId).notifier);
    final hasPlace = item.location != null && item.location!.trim().isNotEmpty;
    final picked = await AppSheet.show<String>(
      context: context,
      title: item.title,
      builder: (ctx) {
        final t = ctx.tokens;
        Widget row(String key, IconData icon, String label, {Color? color}) => ListTile(
          key: Key('itin-act-$key'),
          leading: Icon(icon, color: color ?? t.primaryAccent),
          title: Text(
            label,
            style: TextStyle(fontFamily: AppTypography.fontBody, fontWeight: FontWeight.w600, color: color),
          ),
          onTap: () => Navigator.of(ctx).pop(key),
        );
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (hasPlace) row('directions', Icons.directions_outlined, 'Directions'),
            row('bill', Icons.receipt_long_outlined, 'Add bill for this'),
            row(
              'done',
              item.completed ? Icons.undo_rounded : Icons.check_circle_outline_rounded,
              item.completed ? 'Mark not done' : 'Mark done',
            ),
            row('edit', Icons.edit_outlined, 'Edit'),
            row('delete', Icons.delete_outline_rounded, 'Delete', color: t.colorDanger),
          ],
        );
      },
    );
    if (!mounted || picked == null) return;
    switch (picked) {
      case 'directions':
        unawaited(ref.read(externalLauncherProvider)(Uri.parse(getDirectionsUrl(item.location!))));
      case 'bill':
        // The form titles the expense with the stop and guesses its category, like the meal nudge does.
        unawaited(context.push('/trip/${widget.tripId}/expenses/new?meal=${Uri.encodeQueryComponent(item.title)}'));
      case 'done':
        unawaited(AppHaptics.light());
        unawaited(notifier.toggle(item.id));
      case 'edit':
        unawaited(
          ItineraryActivitySheet.show(
            context,
            tripId: widget.tripId,
            initialDate: item.date,
            initialItem: item,
            tripStartDate: widget.tripStartDate,
            tripEndDate: widget.tripEndDate,
          ),
        );
      case 'delete':
        final ok = await ConfirmDialog.show(
          context: context,
          title: 'Delete this stop?',
          message: '"${item.title}" will be removed from the plan.',
          confirmLabel: 'Delete',
          isDestructive: true,
        );
        if (ok) unawaited(notifier.delete(item.id));
    }
  }
}

class _DayPill extends StatelessWidget {
  const _DayPill({required this.group, required this.selected, required this.onTap});
  final DayItineraryGroup group;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final d = DateTime.tryParse(group.date);
    final fg = selected ? t.ctaFg : t.textPrimary;
    final has = group.items.any((i) => i.kind != ItineraryItemKind.expense);
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Semantics(
        selected: selected,
        button: true,
        label: '${group.dayNumber != null ? 'Day ${group.dayNumber}, ' : ''}${group.dateLabel}',
        child: Material(
          color: selected ? t.primaryAccent : t.bgSurface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(
              color: selected
                  ? t.primaryAccent
                  : (group.isToday ? t.primaryAccent.withValues(alpha: 0.5) : t.borderColor),
            ),
          ),
          child: InkWell(
            key: Key('itin-day-${group.date}'),
            borderRadius: BorderRadius.circular(14),
            onTap: onTap,
            child: SizedBox(
              width: 54,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    d == null ? '' : _weekdays[d.weekday - 1],
                    style: TextStyle(
                      fontFamily: AppTypography.fontBody,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: selected ? fg.withValues(alpha: 0.85) : t.textSecondary,
                    ),
                  ),
                  Text(
                    d == null ? group.dateLabel : '${d.day}',
                    style: TextStyle(
                      fontFamily: AppTypography.fontBody,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: fg,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Container(
                    width: 5,
                    height: 5,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: has ? (selected ? fg : t.primaryAccent) : Colors.transparent,
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

class _Eyebrow extends StatelessWidget {
  const _Eyebrow(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(
      text,
      style: TextStyle(
        fontFamily: AppTypography.fontMono,
        fontSize: 11,
        letterSpacing: 1.2,
        fontWeight: FontWeight.w600,
        color: context.tokens.textMuted,
      ),
    ),
  );
}

/// Time on the left, a dot and a line down the day, the stop card on the right.
class _TimelineRow extends StatelessWidget {
  const _TimelineRow({required this.time, required this.next, required this.last, required this.child});
  final String time;
  final bool next;
  final bool last;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 46,
            child: Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Text(
                time,
                style: TextStyle(
                  fontFamily: AppTypography.fontMono,
                  fontFeatures: AppTypography.tabularFigures,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: next ? t.primaryAccent : t.textSecondary,
                ),
              ),
            ),
          ),
          SizedBox(
            width: 18,
            child: Column(
              children: [
                const SizedBox(height: 19),
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: next ? t.primaryAccent : t.bgSurface,
                    border: Border.all(color: next ? t.primaryAccent : t.borderColor, width: 2),
                  ),
                ),
                if (!last) Expanded(child: Container(width: 2, color: t.borderColor)),
              ],
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Padding(padding: const EdgeInsets.only(bottom: 10), child: child),
          ),
        ],
      ),
    );
  }
}

class _StopCard extends StatelessWidget {
  const _StopCard({required this.item, required this.next, required this.currency, this.onTap});
  final ItineraryTimelineItem item;
  final bool next;
  final String currency;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final pass = item.passData;
    final (tone, icon) = pass != null ? _passLook(pass.type) : _look(item.category);
    final tint = t.tones[tone];
    final done = item.completed;
    final sub = pass != null
        ? [
            if (pass.provider?.isNotEmpty == true) pass.provider!,
            if (pass.referenceCode?.isNotEmpty == true) pass.referenceCode!,
          ].join(' · ')
        : (item.location?.trim().isNotEmpty == true ? item.location!.trim() : (item.notes?.trim() ?? ''));
    final cost = item.activityData?.costEstimate ?? item.amount;
    return Opacity(
      opacity: done ? 0.55 : 1,
      child: Material(
        color: t.bgSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: next ? t.primaryAccent : t.borderColor, width: next ? 1.6 : 1),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          key: Key('itin-stop-${item.id}'),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(color: tint.bg, borderRadius: BorderRadius.circular(12)),
                  child: Icon(done ? Icons.check_rounded : icon, size: 20, color: tint.accent),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: AppTypography.fontBody,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: t.textPrimary,
                          decoration: done ? TextDecoration.lineThrough : null,
                        ),
                      ),
                      if (sub.isNotEmpty)
                        Text(
                          sub,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 12, color: t.textSecondary),
                        ),
                      if (next)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            'NEXT UP',
                            key: const Key('itin-next'),
                            style: TextStyle(
                              fontFamily: AppTypography.fontMono,
                              fontSize: 10,
                              letterSpacing: 1,
                              fontWeight: FontWeight.w700,
                              color: t.primaryAccent,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                if (cost != null && cost > 0) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: t.bgPage, borderRadius: BorderRadius.circular(99)),
                    child: Text(
                      formatMoney(context, cost, item.currency ?? currency),
                      style: TextStyle(
                        fontFamily: AppTypography.fontMono,
                        fontFeatures: AppTypography.tabularFigures,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: t.textPrimary,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyDay extends StatelessWidget {
  const _EmptyDay({required this.label, required this.onAdd});
  final String label;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Container(
      key: const Key('itin-empty-day'),
      padding: const EdgeInsets.fromLTRB(16, 22, 16, 18),
      decoration: BoxDecoration(
        color: t.bgSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: t.borderColor),
      ),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(color: t.tones[BentoTone.sky].bg, borderRadius: BorderRadius.circular(14)),
            child: Icon(Icons.wb_sunny_outlined, color: t.tones[BentoTone.sky].accent),
          ),
          const SizedBox(height: 10),
          Text(
            'Nothing planned for $label',
            style: TextStyle(
              fontFamily: AppTypography.fontBody,
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: t.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Add a stop, a meal or a ride to plan the day.',
            textAlign: TextAlign.center,
            style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 12, color: t.textSecondary),
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            key: const Key('itin-empty-add'),
            onPressed: onAdd,
            icon: const Icon(Icons.add_rounded, size: 18),
            label: const Text('Add a stop'),
          ),
        ],
      ),
    );
  }
}

class _BillsFold extends StatelessWidget {
  const _BillsFold({
    required this.expenses,
    required this.total,
    required this.currency,
    required this.open,
    required this.onToggle,
  });
  final List<Expense> expenses;
  final double total;
  final String currency;
  final bool open;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final n = expenses.length;
    return Material(
      color: t.bgSurface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: t.borderColor),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          InkWell(
            key: const Key('itin-bills'),
            onTap: onToggle,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 8, 12),
              child: Row(
                children: [
                  Icon(Icons.receipt_long_outlined, size: 20, color: t.textSecondary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Spent ${formatMoney(context, total, currency)} · $n ${n == 1 ? 'bill' : 'bills'}',
                      style: TextStyle(
                        fontFamily: AppTypography.fontBody,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: t.textPrimary,
                      ),
                    ),
                  ),
                  Icon(open ? Icons.expand_less_rounded : Icons.expand_more_rounded, color: t.textMuted),
                ],
              ),
            ),
          ),
          if (open)
            for (final e in expenses)
              Container(
                padding: const EdgeInsets.fromLTRB(42, 8, 14, 8),
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(color: t.borderColor)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        e.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 13, color: t.textPrimary),
                      ),
                    ),
                    Text(
                      formatMoney(context, e.amount, currency),
                      style: TextStyle(
                        fontFamily: AppTypography.fontMono,
                        fontFeatures: AppTypography.tabularFigures,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: t.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}
