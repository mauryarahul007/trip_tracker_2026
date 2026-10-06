class BurnRateInsight {
  final int daysElapsed;
  final int daysTotal;
  final double dailyAverage;
  final double projectedTotal;

  const BurnRateInsight({
    required this.daysElapsed,
    required this.daysTotal,
    required this.dailyAverage,
    required this.projectedTotal,
  });

  Map<String, dynamic> toJson() => {
    'daysElapsed': daysElapsed,
    'daysTotal': daysTotal,
    'dailyAverage': dailyAverage % 1 == 0 ? dailyAverage.toInt() : dailyAverage,
    'projectedTotal': projectedTotal % 1 == 0 ? projectedTotal.toInt() : projectedTotal,
  };
}

BurnRateInsight? computeBurnRateInsight(String startDate, String endDate, double totalSpent, [DateTime? now]) {
  final startParts = startDate.split('-').map(int.parse).toList();
  final endParts = endDate.split('-').map(int.parse).toList();
  final start = DateTime.utc(startParts[0], startParts[1], startParts[2]);
  final end = DateTime.utc(endParts[0], endParts[1], endParts[2]);

  final clock = now ?? DateTime.now();
  final today = DateTime.utc(clock.year, clock.month, clock.day);

  if (today.isBefore(start) || today.isAfter(end)) return null;
  if (totalSpent <= 0) return null;

  const msPerDay = 24 * 60 * 60 * 1000;
  final daysTotal = ((end.millisecondsSinceEpoch - start.millisecondsSinceEpoch) / msPerDay).round() + 1;
  final totalDaysClamped = daysTotal < 1 ? 1 : daysTotal;

  final elapsed = ((today.millisecondsSinceEpoch - start.millisecondsSinceEpoch) / msPerDay).round() + 1;
  final daysElapsed = elapsed > totalDaysClamped ? totalDaysClamped : (elapsed < 1 ? 1 : elapsed);

  final dailyAverage = totalSpent / daysElapsed;
  final projectedTotal = dailyAverage * totalDaysClamped;

  return BurnRateInsight(
    daysElapsed: daysElapsed,
    daysTotal: totalDaysClamped,
    dailyAverage: dailyAverage,
    projectedTotal: projectedTotal,
  );
}
