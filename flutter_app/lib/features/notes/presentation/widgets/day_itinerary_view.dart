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
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../expenses/application/expenses_providers.dart';
import '../../../trip_details/application/trip_nav.dart';
import '../../application/itinerary_providers.dart';
import 'itinerary_activity_sheet.dart';

const _categoryEmojis = {
  'activity': '🎟️',
  'food': '🍝',
  'sightseeing': '🏛️',
  'transport': '🚕',
  'lodging': '🏨',
  'other': '✨',
};

class DayItineraryView extends ConsumerStatefulWidget {
  final String tripId;

  const DayItineraryView({required this.tripId, super.key});

  @override
  ConsumerState<DayItineraryView> createState() => _DayItineraryViewState();
}

class _DayItineraryViewState extends ConsumerState<DayItineraryView> {
  String? _selectedDateFilter; // null = all days
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final trip = ref.watch(tripProvider(widget.tripId)).value;
    final activities = ref.watch(tripItineraryProvider(widget.tripId));
    final passes = trip?.passes ?? const [];
    final expenses = ref.watch(tripExpensesProvider(widget.tripId)).value ?? const <Expense>[];
    final currency = trip?.baseCurrency ?? 'INR';

    final days = buildItineraryTimeline(
      tripStartDate: trip?.startDate,
      tripEndDate: trip?.endDate,
      activities: activities,
      passes: passes,
      expenses: expenses,
    );

    if (days.isEmpty) {
      return EmptyState(
        icon: Icons.map_outlined,
        title: 'No itinerary scheduled',
        subtitle: 'Add scheduled activities, flights, or sightseeing stops to build your day-by-day plan.',
        action: AppButton(
          label: '+ Add Activity',
          onPressed: () {
            ItineraryActivitySheet.show(
              context,
              tripId: widget.tripId,
              initialDate: trip?.startDate ?? DateTime.now().toIso8601String().substring(0, 10),
              tripStartDate: trip?.startDate,
              tripEndDate: trip?.endDate,
            );
          },
        ),
      );
    }

    final visibleDays = _selectedDateFilter == null
        ? days
        : days.where((d) => d.date == _selectedDateFilter).toList();

    return Column(
      children: [
        // Day selector chip row
        if (days.length > 1)
          Container(
            height: 48,
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: FilterChip(
                    label: const Text('All Days', style: TextStyle(fontSize: 12)),
                    selected: _selectedDateFilter == null,
                    onSelected: (_) {
                      AppHaptics.selection();
                      setState(() => _selectedDateFilter = null);
                    },
                  ),
                ),
                for (final d in days)
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: FilterChip(
                      label: Text(
                        d.dayNumber != null ? 'Day ${d.dayNumber}' : d.dateLabel,
                        style: const TextStyle(fontSize: 12),
                      ),
                      selected: _selectedDateFilter == d.date,
                      avatar: d.items.isNotEmpty
                          ? Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: tokens.primaryAccent,
                                shape: BoxShape.circle,
                              ),
                            )
                          : null,
                      onSelected: (_) {
                        AppHaptics.selection();
                        setState(() => _selectedDateFilter = d.date);
                      },
                    ),
                  ),
              ],
            ),
          ),

        // Day list
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
            itemCount: visibleDays.length,
            itemBuilder: (context, index) {
              final group = visibleDays[index];
              return _DaySection(
                group: group,
                tripId: widget.tripId,
                currency: currency,
                tripStartDate: trip?.startDate,
                tripEndDate: trip?.endDate,
              );
            },
          ),
        ),
      ],
    );
  }
}

class _DaySection extends ConsumerWidget {
  final DayItineraryGroup group;
  final String tripId;
  final String currency;
  final String? tripStartDate;
  final String? tripEndDate;

  const _DaySection({
    required this.group,
    required this.tripId,
    required this.currency,
    this.tripStartDate,
    this.tripEndDate,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Day Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: tokens.primaryAccent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  group.dayNumber != null ? 'DAY ${group.dayNumber}' : 'DAY',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: tokens.primaryAccent,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  group.dateLabel,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: tokens.textPrimary,
                  ),
                ),
              ),
              if (group.totalSpend > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: tokens.bgSurfaceHover,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: tokens.borderColor),
                  ),
                  child: Text(
                    formatMoney(context, group.totalSpend, currency),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: tokens.textPrimary,
                    ),
                  ),
                ),
              const SizedBox(width: 6),
              IconButton(
                icon: const Icon(AppIcons.add, size: 16),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                tooltip: 'Add Activity',
                onPressed: () {
                  ItineraryActivitySheet.show(
                    context,
                    tripId: tripId,
                    initialDate: group.date,
                    tripStartDate: tripStartDate,
                    tripEndDate: tripEndDate,
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Day items
          if (group.items.isEmpty)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: tokens.bgSurface,
                borderRadius: BorderRadius.circular(tokens.radiusSm),
                border: Border.all(color: tokens.borderColor.withValues(alpha: 0.6)),
              ),
              child: Row(
                children: [
                  Icon(AppIcons.notes, size: 16, color: tokens.textMuted),
                  const SizedBox(width: 8),
                  Text(
                    'No activities or bills logged for this day',
                    style: TextStyle(fontSize: 12, color: tokens.textMuted),
                  ),
                  const Spacer(),
                  InkWell(
                    onTap: () {
                      ItineraryActivitySheet.show(
                        context,
                        tripId: tripId,
                        initialDate: group.date,
                        tripStartDate: tripStartDate,
                        tripEndDate: tripEndDate,
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      child: Text(
                        '+ Activity',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: tokens.primaryAccent),
                      ),
                    ),
                  ),
                ],
              ),
            )
          else
            ...group.items.map((item) {
              if (item.kind == ItineraryItemKind.activity && item.activityData != null) {
                return _ActivityCard(
                  item: item.activityData!,
                  tripId: tripId,
                  tripStartDate: tripStartDate,
                  tripEndDate: tripEndDate,
                );
              }
              if (item.kind == ItineraryItemKind.pass && item.passData != null) {
                return _PassSummaryCard(pass: item.passData!);
              }
              if (item.kind == ItineraryItemKind.expense && item.expenseData != null) {
                return _ExpenseSummaryCard(expense: item.expenseData!, currency: currency);
              }
              return const SizedBox.shrink();
            }),
        ],
      ),
    );
  }
}

class _ActivityCard extends ConsumerWidget {
  final ItineraryItem item;
  final String tripId;
  final String? tripStartDate;
  final String? tripEndDate;

  const _ActivityCard({
    required this.item,
    required this.tripId,
    this.tripStartDate,
    this.tripEndDate,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tokens = context.tokens;
    final emoji = _categoryEmojis[item.category] ?? '🎟️';

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      decoration: BoxDecoration(
        color: tokens.bgSurface,
        borderRadius: BorderRadius.circular(tokens.radiusSm),
        border: Border.all(
          color: item.completed
              ? tokens.borderColor.withValues(alpha: 0.5)
              : tokens.primaryAccent.withValues(alpha: 0.3),
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(tokens.radiusSm),
        onTap: () {
          ItineraryActivitySheet.show(
            context,
            tripId: tripId,
            initialDate: item.date,
            initialItem: item,
            tripStartDate: tripStartDate,
            tripEndDate: tripEndDate,
          );
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Row(
            children: [
              // Checkbox
              Checkbox(
                value: item.completed,
                onChanged: (_) async {
                  await AppHaptics.light();
                  unawaited(ref.read(tripItineraryProvider(tripId).notifier).toggle(item.id));
                },
                visualDensity: VisualDensity.compact,
              ),
              const SizedBox(width: 4),

              // Emoji badge
              Text(emoji, style: const TextStyle(fontSize: 16)),
              const SizedBox(width: 8),

              // Title and metadata
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        decoration: item.completed ? TextDecoration.lineThrough : null,
                        color: item.completed ? tokens.textMuted : tokens.textPrimary,
                      ),
                    ),
                    Row(
                      children: [
                        if (item.time != null && item.time!.isNotEmpty) ...[
                          Text(
                            formatTimeDisplay(item.time),
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: tokens.primaryAccent),
                          ),
                          const SizedBox(width: 6),
                        ],
                        if (item.location != null && item.location!.isNotEmpty) ...[
                          Icon(AppIcons.location, size: 11, color: tokens.textMuted),
                          const SizedBox(width: 2),
                          Flexible(
                            child: Text(
                              item.location!,
                              style: TextStyle(fontSize: 11, color: tokens.textMuted),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),

              // Action buttons: Directions & + Bill
              if (item.location != null && item.location!.trim().isNotEmpty) ...[
                IconButton(
                  icon: Icon(AppIcons.location, size: 16, color: tokens.primaryAccent),
                  tooltip: 'Directions',
                  padding: const EdgeInsets.all(4),
                  constraints: const BoxConstraints(),
                  onPressed: () {
                    final url = getDirectionsUrl(item.location!);
                    ref.read(externalLauncherProvider)(Uri.parse(url));
                  },
                ),
                const SizedBox(width: 4),
              ],
              TextButton(
                onPressed: () {
                  context.push('/trip/$tripId/expenses/new');
                },
                style: TextButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                ),
                child: const Text('+ Bill', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PassSummaryCard extends StatelessWidget {
  final dynamic pass; // TravelPass

  const _PassSummaryCard({required this.pass});

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final isFlight = pass.type == 'flight';
    final isStay = pass.type == 'stay';

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: tokens.bgSurfaceHover,
        borderRadius: BorderRadius.circular(tokens.radiusSm),
        border: Border.all(color: tokens.borderColor),
      ),
      child: Row(
        children: [
          Icon(
            isFlight ? Icons.flight : (isStay ? Icons.hotel : Icons.confirmation_number),
            size: 16,
            color: tokens.primaryAccent,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              pass.title as String,
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: tokens.textPrimary),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (pass.referenceCode != null)
            Text(
              pass.referenceCode as String,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: tokens.textMuted),
            ),
        ],
      ),
    );
  }
}

class _ExpenseSummaryCard extends StatelessWidget {
  final Expense expense;
  final String currency;

  const _ExpenseSummaryCard({required this.expense, required this.currency});

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: tokens.bgSurface,
        borderRadius: BorderRadius.circular(tokens.radiusSm),
        border: Border.all(color: tokens.borderColor.withValues(alpha: 0.6)),
      ),
      child: Row(
        children: [
          Icon(AppIcons.ledger, size: 15, color: tokens.textMuted),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              expense.title,
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: tokens.textPrimary),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text(
            formatMoney(context, expense.amount, currency),
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: tokens.textPrimary),
          ),
        ],
      ),
    );
  }
}
