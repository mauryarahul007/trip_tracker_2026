import '../models/category.dart';
import '../models/expense.dart';
import '../models/member.dart';
import '../models/trip.dart';

class TripArchetype {
  const TripArchetype({required this.title, required this.subtitle, required this.icon, required this.tag});

  final String title;
  final String subtitle;
  final String icon;
  final String tag;
}

class MemberSuperlative {
  const MemberSuperlative({required this.memberName, required this.title, required this.icon, required this.note});

  final String memberName;
  final String title;
  final String icon;
  final String note;
}

class TripRhythm {
  const TripRhythm({required this.peakDay, required this.pace, required this.vibeTag});

  final String peakDay;
  final String pace;
  final String vibeTag;
}

class MemberSpendEntry {
  const MemberSpendEntry({required this.memberName, required this.amount});

  final String memberName;
  final double amount;
}

/// Computes the overarching trip vibe persona archetype based on highest category spend.
TripArchetype getTripArchetype(List<Category> categories, List<Expense> expenses) {
  final activeExpenses = expenses.where((e) => !e.isSettlement && e.deletedAt == null).toList();
  if (activeExpenses.isEmpty) {
    return const TripArchetype(
      title: 'The Clean Slate Odyssey',
      subtitle: 'A fresh journey waiting for its first great story.',
      icon: '✨',
      tag: 'NEW HORIZONS',
    );
  }

  final categorySpendMap = <String, double>{};
  for (final e in activeExpenses) {
    categorySpendMap[e.category] = (categorySpendMap[e.category] ?? 0.0) + e.amount;
  }

  var topCategoryId = '';
  var topCategoryAmt = -1.0;
  for (final entry in categorySpendMap.entries) {
    if (entry.value > topCategoryAmt) {
      topCategoryAmt = entry.value;
      topCategoryId = entry.key;
    }
  }

  final topCategoryObj = categories.where((c) => c.id == topCategoryId).firstOrNull;
  final topCategoryName = (topCategoryObj?.name ?? '').toLowerCase();
  final topCategoryIcon = topCategoryObj?.icon ?? '';

  if (topCategoryName.contains('food') ||
      topCategoryName.contains('dining') ||
      topCategoryName.contains('cafe') ||
      topCategoryIcon == '🍔') {
    return const TripArchetype(
      title: 'The Gourmet Pilgrimage',
      subtitle: '80% culinary tastings, 20% walking to the next meal.',
      icon: '🍕',
      tag: 'FOODIE PARADISE',
    );
  }

  if (topCategoryName.contains('stay') ||
      topCategoryName.contains('hotel') ||
      topCategoryName.contains('resort') ||
      topCategoryIcon == '🏨') {
    return const TripArchetype(
      title: 'The High-Luxe Sanctuary',
      subtitle: 'Focused on comfort, deep rest, and scenic morning views.',
      icon: '🏖️',
      tag: 'PURE RELAXATION',
    );
  }

  if (topCategoryName.contains('travel') ||
      topCategoryName.contains('flight') ||
      topCategoryName.contains('transport') ||
      topCategoryName.contains('cab') ||
      topCategoryIcon == '✈️' ||
      topCategoryIcon == '🚗') {
    return const TripArchetype(
      title: 'The Fast-Paced Expedition',
      subtitle: 'Constantly on the move, chasing new vistas and open roads.',
      icon: '⛰️',
      tag: 'ADVENTURE SEEKERS',
    );
  }

  if (topCategoryName.contains('shop') || topCategoryName.contains('souvenir') || topCategoryIcon == '🛍️') {
    return const TripArchetype(
      title: 'The Collector’s Grand Tour',
      subtitle: 'No market left unexplored, bags filled with local gems.',
      icon: '🛍️',
      tag: 'RETAIL ODYSSEY',
    );
  }

  if (topCategoryName.contains('party') ||
      topCategoryName.contains('club') ||
      topCategoryName.contains('drink') ||
      topCategoryIcon == '🍺') {
    return const TripArchetype(
      title: 'The Midnight Revelry',
      subtitle: 'Late nights, golden hours, and high-octane celebration.',
      icon: '🎉',
      tag: 'NIGHT VIBES',
    );
  }

  return const TripArchetype(
    title: 'The Spontaneous Odyssey',
    subtitle: 'A beautifully balanced expedition where anything could happen.',
    icon: '✨',
    tag: 'EXPLORATION',
  );
}

/// Awards narrative superlatives and honorary roles to squad members without raw currency amounts.
List<MemberSuperlative> getMemberSuperlatives(List<Member> members, List<Expense> expenses, List<Category> categories) {
  if (members.isEmpty) return const [];

  final activeExpenses = expenses.where((e) => !e.isSettlement && e.deletedAt == null).toList();
  final memberSpendMap = <String, double>{};
  final memberCountMap = <String, int>{};
  final memberFoodSpendMap = <String, double>{};
  final memberTravelSpendMap = <String, double>{};

  final foodCatIds = categories
      .where((c) => c.name.toLowerCase().contains('food') || c.icon == '🍔')
      .map((c) => c.id)
      .toSet();

  final travelCatIds = categories
      .where((c) {
        final name = c.name.toLowerCase();
        return name.contains('travel') ||
            name.contains('cab') ||
            name.contains('flight') ||
            c.icon == '✈️' ||
            c.icon == '🚗';
      })
      .map((c) => c.id)
      .toSet();

  for (final e in activeExpenses) {
    memberSpendMap[e.paidBy] = (memberSpendMap[e.paidBy] ?? 0.0) + e.amount;
    memberCountMap[e.paidBy] = (memberCountMap[e.paidBy] ?? 0) + 1;
    if (foodCatIds.contains(e.category)) {
      memberFoodSpendMap[e.paidBy] = (memberFoodSpendMap[e.paidBy] ?? 0.0) + e.amount;
    }
    if (travelCatIds.contains(e.category)) {
      memberTravelSpendMap[e.paidBy] = (memberTravelSpendMap[e.paidBy] ?? 0.0) + e.amount;
    }
  }

  final superlatives = <MemberSuperlative>[];
  final assignedMemberIds = <String>{};

  // 1. Chief Quartermaster (Most transactions logged)
  var maxCount = 0;
  String? topCountMemberId;
  for (final entry in memberCountMap.entries) {
    if (entry.value > maxCount) {
      maxCount = entry.value;
      topCountMemberId = entry.key;
    }
  }

  if (topCountMemberId != null && maxCount > 0) {
    final m = members.where((x) => x.id == topCountMemberId).firstOrNull;
    if (m != null) {
      superlatives.add(
        MemberSuperlative(
          memberName: m.name,
          title: 'Chief Quartermaster',
          icon: '👑',
          note: 'Coordinated crew logistics & kept the trip moving smoothly.',
        ),
      );
      assignedMemberIds.add(m.id);
    }
  }

  // 2. Executive Tasting Officer (Top food spend)
  var maxFood = 0.0;
  String? topFoodMemberId;
  for (final entry in memberFoodSpendMap.entries) {
    if (entry.value > maxFood && !assignedMemberIds.contains(entry.key)) {
      maxFood = entry.value;
      topFoodMemberId = entry.key;
    }
  }

  if (topFoodMemberId != null && maxFood > 0) {
    final m = members.where((x) => x.id == topFoodMemberId).firstOrNull;
    if (m != null) {
      superlatives.add(
        MemberSuperlative(
          memberName: m.name,
          title: 'Executive Tasting Officer',
          icon: '🍕',
          note: 'Discovered the best dining, cafes & group treats.',
        ),
      );
      assignedMemberIds.add(m.id);
    }
  }

  // 3. Transit Navigator (Top travel/ride coordinator)
  var maxTravel = 0.0;
  String? topTravelMemberId;
  for (final entry in memberTravelSpendMap.entries) {
    if (entry.value > maxTravel && !assignedMemberIds.contains(entry.key)) {
      maxTravel = entry.value;
      topTravelMemberId = entry.key;
    }
  }

  if (topTravelMemberId != null && maxTravel > 0) {
    final m = members.where((x) => x.id == topTravelMemberId).firstOrNull;
    if (m != null) {
      superlatives.add(
        MemberSuperlative(
          memberName: m.name,
          title: 'Transit Navigator',
          icon: '🚗',
          note: 'Kept the squad rolling across cabs, flights & roads.',
        ),
      );
      assignedMemberIds.add(m.id);
    }
  }

  // 4. Assign honorary badges to remaining members (up to 4 superlatives)
  const honoraryRoles = [
    (title: 'The Vibe Harmonizer', icon: '✨', note: 'Essential squad energy & seamless split participation.'),
    (title: 'Chief Morale Officer', icon: '🎉', note: 'Kept the energy electric from sunrise to sunset.'),
    (title: 'Spontaneous Trailblazer', icon: '🧭', note: 'Always ready for unplanned detours & hidden gems.'),
    (title: 'Master of Flow', icon: '⚡', note: 'Swift, dependable, and locked into every group plan.'),
  ];

  var roleIdx = 0;
  for (final m in members) {
    if (!assignedMemberIds.contains(m.id) && superlatives.length < 4) {
      final role = honoraryRoles[roleIdx % honoraryRoles.length];
      superlatives.add(MemberSuperlative(memberName: m.name, title: role.title, icon: role.icon, note: role.note));
      assignedMemberIds.add(m.id);
      roleIdx++;
    }
  }

  return superlatives;
}

/// Evaluates the weekly rhythm, peak adventure day, and pace of the expedition.
TripRhythm getTripRhythm(List<Expense> expenses, Trip trip) {
  final activeExpenses = expenses.where((e) => !e.isSettlement && e.deletedAt == null).toList();
  final dest = trip.destination?.trim();
  final destUpper = (dest != null && dest.isNotEmpty) ? dest.toUpperCase() : null;

  if (activeExpenses.isEmpty) {
    return TripRhythm(
      peakDay: 'Every Day',
      pace: 'Chill & Relaxed',
      vibeTag: destUpper != null ? '$destUpper ADVENTURE' : 'SUNSHINE EXPEDITION',
    );
  }

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  final dayCountMap = <int, int>{};

  for (final e in activeExpenses) {
    final d = DateTime.tryParse(e.date);
    if (d != null) {
      // Dart DateTime weekday: Monday is 1, Sunday is 7.
      // Map to 0-6 where Sunday is 0.
      final dayIdx = d.weekday % 7;
      dayCountMap[dayIdx] = (dayCountMap[dayIdx] ?? 0) + 1;
    }
  }

  var maxCount = 0;
  for (final count in dayCountMap.values) {
    if (count > maxCount) maxCount = count;
  }

  final topDayNames = <String>[];
  if (maxCount > 0) {
    for (var i = 0; i < 7; i++) {
      if (dayCountMap[i] == maxCount) {
        topDayNames.add(daysOfWeek[i]);
      }
    }
  }

  String peakDayLabel;
  if (topDayNames.isEmpty) {
    peakDayLabel = 'Saturday';
  } else if (topDayNames.length == 1) {
    peakDayLabel = topDayNames[0];
  } else if (topDayNames.length == 2) {
    peakDayLabel = '${topDayNames[0]} & ${topDayNames[1]}';
  } else if (topDayNames.length == 3) {
    peakDayLabel = '${topDayNames[0]}, ${topDayNames[1]} & ${topDayNames[2]}';
  } else {
    peakDayLabel = '${topDayNames[0]}, ${topDayNames[1]} & more';
  }

  final pace = activeExpenses.length >= 10 ? 'High-Octane & Action Packed' : 'Scenic, Unrushed & Relaxed';

  return TripRhythm(
    peakDay: peakDayLabel,
    pace: pace,
    vibeTag: destUpper != null ? '$destUpper ADVENTURE' : 'CERTIFIED SQUAD JOURNEY',
  );
}

/// Computes the top 5 squad spenders sorted by contribution descending.
List<MemberSpendEntry> getMemberSpendLeaderboard(List<Member> members, List<Expense> expenses) {
  final activeExpenses = expenses.where((e) => !e.isSettlement && e.deletedAt == null).toList();
  final spendMap = <String, double>{};
  for (final e in activeExpenses) {
    spendMap[e.paidBy] = (spendMap[e.paidBy] ?? 0.0) + e.amount;
  }

  final entries = <MemberSpendEntry>[];
  for (final m in members) {
    final amount = spendMap[m.id] ?? 0.0;
    if (amount > 0) {
      entries.add(MemberSpendEntry(memberName: m.name, amount: amount));
    }
  }

  entries.sort((a, b) => b.amount.compareTo(a.amount));
  return entries.take(5).toList();
}
