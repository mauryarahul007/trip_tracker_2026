import 'package:intl/intl.dart';

import '../models/expense.dart';
import '../models/itinerary_item.dart';
import '../models/travel_pass.dart';

enum ItineraryItemKind { activity, pass, expense }

class ItineraryTimelineItem {
  final ItineraryItemKind kind;
  final String id;
  final String date;
  final String time;
  final String title;
  final String? category;
  final String? location;
  final String? notes;
  final bool completed;
  final double? amount;
  final String? currency;
  final ItineraryItem? activityData;
  final TravelPass? passData;
  final Expense? expenseData;

  const ItineraryTimelineItem({
    required this.kind,
    required this.id,
    required this.date,
    required this.time,
    required this.title,
    this.category,
    this.location,
    this.notes,
    this.completed = false,
    this.amount,
    this.currency,
    this.activityData,
    this.passData,
    this.expenseData,
  });
}

class DayItineraryGroup {
  final String date; // YYYY-MM-DD
  final int? dayNumber;
  final String dateLabel;
  final bool isToday;
  final double totalSpend;
  final List<ItineraryItem> activities;
  final List<TravelPass> passes;
  final List<Expense> expenses;
  final List<ItineraryTimelineItem> items;
  final int completedActivitiesCount;
  final int totalActivitiesCount;

  const DayItineraryGroup({
    required this.date,
    this.dayNumber,
    required this.dateLabel,
    required this.isToday,
    required this.totalSpend,
    required this.activities,
    required this.passes,
    required this.expenses,
    required this.items,
    required this.completedActivitiesCount,
    required this.totalActivitiesCount,
  });
}

String formatIsoDateLabel(String dateStr) {
  final d = DateTime.tryParse(dateStr);
  if (d == null) return dateStr;
  return DateFormat('EEE, MMM d').format(d);
}

String formatTimeDisplay(String? timeStr) {
  if (timeStr == null || timeStr.trim().isEmpty) return '';
  final parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;
  final hours = int.tryParse(parts[0]);
  final minutes = int.tryParse(parts[1]);
  if (hours == null || minutes == null) return timeStr;
  final period = hours >= 12 ? 'PM' : 'AM';
  final displayHours = hours % 12 == 0 ? 12 : hours % 12;
  final displayMinutes = minutes.toString().padLeft(2, '0');
  return '$displayHours:$displayMinutes $period';
}

String getDirectionsUrl(String location) {
  final clean = location.trim();
  if (clean.isEmpty) return '';
  return 'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(clean)}';
}

(String, String) extractPassDateAndTime(TravelPass pass) {
  final raw = pass.startDateTime;
  if (raw != null && raw.isNotEmpty) {
    if (raw.contains('T')) {
      final parts = raw.split('T');
      return (parts[0], parts[1].length >= 5 ? parts[1].substring(0, 5) : '09:00');
    }
    return (raw.length >= 10 ? raw.substring(0, 10) : raw, '09:00');
  }
  return ('', '');
}

int? computeTripDayNumber(String startDate, String targetDate) {
  final s = DateTime.tryParse(startDate);
  final t = DateTime.tryParse(targetDate);
  if (s == null || t == null) return null;
  final sOnly = DateTime(s.year, s.month, s.day);
  final tOnly = DateTime(t.year, t.month, t.day);
  final diff = tOnly.difference(sOnly).inDays;
  return diff >= 0 ? diff + 1 : null;
}

List<DayItineraryGroup> buildItineraryTimeline({
  String? tripStartDate,
  String? tripEndDate,
  List<ItineraryItem> activities = const [],
  List<TravelPass> passes = const [],
  List<Expense> expenses = const [],
  bool sortAscending = true,
  String? todayIso,
}) {
  final currentIso = todayIso ?? DateFormat('yyyy-MM-dd').format(DateTime.now());
  final dateMap = <String, ({List<ItineraryItem> activities, List<TravelPass> passes, List<Expense> expenses})>{};

  void ensureDate(String d) {
    if (!dateMap.containsKey(d)) {
      dateMap[d] = (activities: <ItineraryItem>[], passes: <TravelPass>[], expenses: <Expense>[]);
    }
  }

  // 1. Expand dates from trip start to end
  if (tripStartDate != null && tripStartDate.isNotEmpty) {
    final s = DateTime.tryParse(tripStartDate);
    final e = tripEndDate != null && tripEndDate.isNotEmpty ? DateTime.tryParse(tripEndDate) : s;
    if (s != null && e != null) {
      var cur = DateTime(s.year, s.month, s.day);
      final endOnly = DateTime(e.year, e.month, e.day);
      var count = 0;
      while ((cur.isBefore(endOnly) || cur.isAtSameMomentAs(endOnly)) && count < 60) {
        final iso = DateFormat('yyyy-MM-dd').format(cur);
        ensureDate(iso);
        cur = cur.add(const Duration(days: 1));
        count++;
      }
    }
  }

  // 2. Activities
  for (final act in activities) {
    if (act.date.isEmpty) continue;
    ensureDate(act.date);
    dateMap[act.date]!.activities.add(act);
  }

  // 3. Passes
  for (final pass in passes) {
    final (date, _) = extractPassDateAndTime(pass);
    if (date.isEmpty) continue;
    ensureDate(date);
    dateMap[date]!.passes.add(pass);
  }

  // 4. Expenses
  for (final exp in expenses) {
    if (exp.date.isEmpty || exp.isSettlement) continue;
    ensureDate(exp.date);
    dateMap[exp.date]!.expenses.add(exp);
  }

  final sortedDates = dateMap.keys.toList()
    ..sort((a, b) => sortAscending ? a.compareTo(b) : b.compareTo(a));

  return sortedDates.map((date) {
    final data = dateMap[date]!;
    final dayNum = tripStartDate != null ? computeTripDayNumber(tripStartDate, date) : null;
    final dateLabel = formatIsoDateLabel(date);
    final isToday = date == currentIso;

    final totalSpend = data.expenses
        .where((e) => !e.excludeFromTotals)
        .fold<double>(0.0, (sum, e) => sum + e.amount);

    final items = <ItineraryTimelineItem>[];

    for (final pass in data.passes) {
      final (_, time) = extractPassDateAndTime(pass);
      items.add(
        ItineraryTimelineItem(
          kind: ItineraryItemKind.pass,
          id: pass.id,
          date: date,
          time: time.isNotEmpty ? time : '09:00',
          title: pass.title,
          category: pass.type,
          location: pass.origin ?? pass.destination ?? pass.address ?? pass.provider,
          passData: pass,
        ),
      );
    }

    for (final act in data.activities) {
      items.add(
        ItineraryTimelineItem(
          kind: ItineraryItemKind.activity,
          id: act.id,
          date: date,
          time: act.time?.isNotEmpty == true ? act.time! : '10:00',
          title: act.title,
          category: act.category,
          location: act.location,
          notes: act.notes,
          completed: act.completed,
          activityData: act,
        ),
      );
    }

    for (final exp in data.expenses) {
      items.add(
        ItineraryTimelineItem(
          kind: ItineraryItemKind.expense,
          id: exp.id,
          date: date,
          time: '12:00',
          title: exp.title,
          amount: exp.amount,
          currency: exp.currency,
          category: exp.category,
          expenseData: exp,
        ),
      );
    }

    // Sort items chronologically within the day
    items.sort((a, b) {
      final tDiff = a.time.compareTo(b.time);
      if (tDiff != 0) return tDiff;
      const priority = {
        ItineraryItemKind.pass: 1,
        ItineraryItemKind.activity: 2,
        ItineraryItemKind.expense: 3,
      };
      return priority[a.kind]!.compareTo(priority[b.kind]!);
    });

    final completedCount = data.activities.where((a) => a.completed).length;

    return DayItineraryGroup(
      date: date,
      dayNumber: dayNum,
      dateLabel: dateLabel,
      isToday: isToday,
      totalSpend: totalSpend,
      activities: data.activities,
      passes: data.passes,
      expenses: data.expenses,
      items: items,
      completedActivitiesCount: completedCount,
      totalActivitiesCount: data.activities.length,
    );
  }).toList();
}
