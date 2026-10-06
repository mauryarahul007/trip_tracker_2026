const String canonicalAppOrigin = 'https://trip-tracker.blackmaroon.in';

// Approximates JS `localeCompare(b, undefined, {sensitivity: 'base', numeric: true})`:
// case- and accent-insensitive, digit runs compared as numbers.
// ponytail: folds Latin letters only; non-Latin scripts compare by code unit
// (ICU collation differs). Add a collation package if such trip names matter.
const _accentFrom = 'àáâãäåāçćčďèéêëēěìíîïīñňòóôõöøōřšśťùúûüūůýÿžźż';
const _accentTo = 'aaaaaaa' 'ccc' 'd' 'eeeeee' 'iiiii' 'nn' 'ooooooo' 'rss' 't' 'uuuuuu' 'yy' 'zzz';

String _fold(String s) {
  final b = StringBuffer();
  for (final r in s.toLowerCase().runes) {
    final c = String.fromCharCode(r);
    final i = _accentFrom.indexOf(c);
    b.write(i >= 0 ? _accentTo[i] : c);
  }
  return b.toString();
}

int _localeCompareBase(String a, String b) {
  final ra = RegExp(r'\d+|\D+').allMatches(_fold(a)).map((m) => m.group(0)!).toList();
  final rb = RegExp(r'\d+|\D+').allMatches(_fold(b)).map((m) => m.group(0)!).toList();
  for (var i = 0; i < ra.length && i < rb.length; i++) {
    final x = ra[i], y = rb[i];
    final nx = int.tryParse(x), ny = int.tryParse(y);
    final c = (nx != null && ny != null) ? nx.compareTo(ny) : x.compareTo(y);
    if (c != 0) return c;
  }
  return ra.length.compareTo(rb.length);
}

List<Map<String, dynamic>> sortTrips(List<Map<String, dynamic>> trips, String mode) {
  final list = List<Map<String, dynamic>>.from(trips);
  if (mode == 'name') {
    list.sort((a, b) => _localeCompareBase((a['name'] as String?) ?? '', (b['name'] as String?) ?? ''));
  } else {
    list.sort((a, b) {
      final dateA = (a['startDate'] as String?) ?? '';
      final dateB = (b['startDate'] as String?) ?? '';
      if (dateA.isNotEmpty && dateB.isNotEmpty && dateA != dateB) {
        return dateB.compareTo(dateA);
      }
      final upA = (a['updatedAt'] ?? a['createdAt'] ?? 0) as int;
      final upB = (b['updatedAt'] ?? b['createdAt'] ?? 0) as int;
      return upB.compareTo(upA);
    });
  }
  return list;
}

const List<MapEntry<List<String>, String>> placeCurrencies = [
  MapEntry(['thailand', 'bangkok', 'phuket', 'krabi', 'chiang mai', 'pattaya', 'koh samui'], 'THB'),
  MapEntry(['indonesia', 'bali', 'jakarta', 'lombok', 'ubud', 'gili'], 'IDR'),
  MapEntry(['vietnam', 'hanoi', 'ho chi minh', 'saigon', 'da nang', 'hoi an', 'ha long'], 'VND'),
  MapEntry(['malaysia', 'kuala lumpur', 'langkawi', 'penang'], 'MYR'),
  MapEntry(['singapore'], 'SGD'),
  MapEntry(['japan', 'tokyo', 'kyoto', 'osaka', 'hokkaido', 'nara', 'okinawa'], 'JPY'),
  MapEntry(['korea', 'seoul', 'busan', 'jeju'], 'KRW'),
  MapEntry(['sri lanka', 'colombo', 'kandy', 'galle', 'ella'], 'LKR'),
  MapEntry(['nepal', 'kathmandu', 'pokhara'], 'NPR'),
  MapEntry(['bhutan', 'thimphu', 'paro'], 'BTN'),
  MapEntry(['maldives', 'male'], 'MVR'),
  MapEntry(['dubai', 'abu dhabi', 'uae', 'emirates', 'sharjah'], 'AED'),
  MapEntry(['qatar', 'doha'], 'QAR'),
  MapEntry(['oman', 'muscat'], 'OMR'),
  MapEntry(['saudi', 'riyadh', 'jeddah'], 'SAR'),
  MapEntry(['turkey', 'turkiye', 'istanbul', 'cappadocia', 'antalya'], 'TRY'),
  MapEntry(['egypt', 'cairo', 'luxor'], 'EGP'),
  MapEntry(['kenya', 'nairobi', 'masai mara'], 'KES'),
  MapEntry(['south africa', 'cape town', 'johannesburg'], 'ZAR'),
  MapEntry(['united kingdom', 'uk', 'england', 'london', 'scotland', 'edinburgh', 'manchester'], 'GBP'),
  MapEntry(['switzerland', 'zurich', 'geneva', 'interlaken', 'lucerne', 'zermatt'], 'CHF'),
  MapEntry([
    'france', 'paris', 'nice', 'germany', 'berlin', 'munich', 'italy', 'rome', 'venice', 'florence', 'milan',
    'spain', 'barcelona', 'madrid', 'portugal', 'lisbon', 'porto', 'netherlands', 'amsterdam', 'greece',
    'athens', 'santorini', 'mykonos', 'austria', 'vienna', 'belgium', 'brussels', 'ireland', 'dublin',
    'finland', 'helsinki', 'croatia', 'dubrovnik', 'europe'
  ], 'EUR'),
  MapEntry(['czech', 'prague'], 'CZK'),
  MapEntry(['hungary', 'budapest'], 'HUF'),
  MapEntry(['iceland', 'reykjavik'], 'ISK'),
  MapEntry(['norway', 'oslo'], 'NOK'),
  MapEntry(['sweden', 'stockholm'], 'SEK'),
  MapEntry(['denmark', 'copenhagen'], 'DKK'),
  MapEntry(['usa', 'united states', 'america', 'new york', 'las vegas', 'san francisco', 'los angeles', 'miami', 'hawaii', 'chicago'], 'USD'),
  MapEntry(['canada', 'toronto', 'vancouver', 'banff', 'montreal'], 'CAD'),
  MapEntry(['mexico', 'cancun', 'tulum'], 'MXN'),
  MapEntry(['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'gold coast'], 'AUD'),
  MapEntry(['new zealand', 'auckland', 'queenstown'], 'NZD'),
  MapEntry(['hong kong'], 'HKD'),
  MapEntry(['china', 'beijing', 'shanghai'], 'CNY'),
  MapEntry(['philippines', 'manila', 'boracay', 'palawan', 'cebu'], 'PHP'),
  MapEntry(['cambodia', 'siem reap', 'phnom penh'], 'USD'),
  MapEntry(['mauritius'], 'MUR'),
];

String? guessTripCurrency(String destination) {
  final clean = ' ${destination.toLowerCase().replaceAll(RegExp(r'[^a-z\s]'), ' ').replaceAll(RegExp(r'\s+'), ' ')} ';
  for (final entry in placeCurrencies) {
    if (entry.key.any((k) => clean.contains(' $k '))) return entry.value;
  }
  return null;
}

String suggestTripName(String destination, [String? startDate, String? endDate]) {
  final first = destination.split(RegExp(r',|&|/|\band\b|→|->', caseSensitive: false))[0].trim();
  if (first.isEmpty) return '';
  final titled = first.replaceAll(RegExp(r'\s+'), ' ').split(' ').map((p) => p.isNotEmpty ? p[0].toUpperCase() + p.substring(1) : '').join(' ');
  return '$titled trip';
}

Map<String, String> extractPrimaryCity(String destination, [List<dynamic>? stops]) {
  String full = destination.trim();
  if (full.isEmpty && stops != null && stops.isNotEmpty) {
    full = stops.map((s) => s is Map ? s['name'] : s.name).join(' → ').trim();
  }
  if (full.isEmpty) return {'primary': '', 'full': ''};

  final segments = full.split(RegExp(r'\s*(?:→|->|=>|—|–|\||\/|,|;)\s*')).where((s) => s.isNotEmpty).toList();
  final primary = segments.isNotEmpty ? segments[0] : full;
  return {'primary': primary, 'full': full};
}

const List<String> monthNamesShort = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

String formatDateRange(String start, String end) {
  if (start.isEmpty || end.isEmpty) return '';
  final s = DateTime.tryParse('${start}T00:00:00Z');
  final e = DateTime.tryParse('${end}T00:00:00Z');
  if (s == null || e == null) return '';

  final sDay = s.day;
  final eDay = e.day;
  final sMonth = monthNamesShort[s.month - 1];
  final eMonth = monthNamesShort[e.month - 1];
  final sYear = s.year;
  final eYear = e.year;

  if (sYear != eYear) {
    return '$sDay $sMonth $sYear – $eDay $eMonth $eYear';
  }
  if (sMonth == eMonth) {
    return '$sDay–$eDay $sMonth';
  }
  return '$sDay $sMonth – $eDay $eMonth';
}

int? tripDayNumber(String tripStartDate, String date) {
  final s = DateTime.tryParse('${tripStartDate}T00:00:00Z');
  final d = DateTime.tryParse('${date}T00:00:00Z');
  if (s == null || d == null) return null;
  final dayNum = ((d.difference(s).inMilliseconds) / 86400000.0).round() + 1;
  return dayNum >= 1 ? dayNum : null;
}

String formatRelativeTime(dynamic timestamp, [int? nowMs]) {
  int then;
  if (timestamp is num) {
    then = timestamp.toInt();
  } else {
    final parsed = DateTime.tryParse(timestamp.toString())?.millisecondsSinceEpoch;
    if (parsed == null) return timestamp.toString(); // TS echoes unparseable input
    then = parsed;
  }
  final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
  final diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'just now';
  if (diffMs < hour) return '${diffMs ~/ minute}m ago';
  if (diffMs < day) return '${diffMs ~/ hour}h ago';
  if (diffMs < 30 * day) return '${diffMs ~/ day}d ago';

  final months = diffMs ~/ (30 * day);
  if (months < 12) return '${months}mo ago';
  return '${months ~/ 12}y ago';
}

String buildCanonicalJoinLink(String joinCode) {
  final code = Uri.encodeComponent(joinCode.trim());
  return '$canonicalAppOrigin/join/$code';
}

String? parseJoinDeepLink(String url) {
  if (url.isEmpty) return null;
  final trimmed = url.trim();

  final customMatch = RegExp(r'^com\.triptracker\.app:\/\/join\/([^/?#]+)', caseSensitive: false).firstMatch(trimmed);
  if (customMatch != null) {
    try {
      return Uri.decodeComponent(customMatch.group(1)!);
    } catch (_) {
      return customMatch.group(1);
    }
  }

  final uri = Uri.tryParse(trimmed);
  if (uri != null && (uri.scheme == 'http' || uri.scheme == 'https')) {
    final segments = uri.pathSegments;
    final joinIdx = segments.indexOf('join');
    if (joinIdx != -1 && joinIdx + 1 < segments.length) {
      return Uri.decodeComponent(segments[joinIdx + 1]);
    }
  }
  return null;
}

bool isValidUpiId(String upiId) {
  if (upiId.isEmpty) return false;
  return RegExp(r'^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$').hasMatch(upiId.trim());
}

String generateUpiUri(Map<String, dynamic> details, [String? appScheme]) {
  final payeeUpiId = (details['payeeUpiId'] as String).trim();
  final payeeName = ((details['payeeName'] as String?)?.trim().isNotEmpty == true)
      ? details['payeeName'] as String
      : 'Payee';
  final amount = (details['amount'] as num).toDouble();
  final note = ((details['note'] as String?)?.trim().isNotEmpty == true)
      ? details['note'] as String
      : 'Trip Settlement';

  final encodedPa = Uri.encodeComponent(payeeUpiId);
  final encodedPn = Uri.encodeComponent(payeeName.trim());
  final encodedNote = Uri.encodeComponent(note.trim());
  final formattedAmount = amount.toStringAsFixed(2);

  final baseParams = 'pa=$encodedPa&pn=$encodedPn&am=$formattedAmount&cu=INR&tn=$encodedNote';

  switch (appScheme) {
    case 'gpay':
      return 'tez://upi/pay?$baseParams';
    case 'phonepe':
      return 'phonepe://pay?$baseParams';
    case 'paytm':
      return 'paytmmp://pay?$baseParams';
    case 'cred':
      return 'cred://pay?$baseParams';
    case 'bhim':
      return 'bhim://pay?$baseParams';
    default:
      return 'upi://pay?$baseParams';
  }
}

String buildAutoGroupName(List<String> names) {
  final firstNames = names.map((n) => n.trim().split(RegExp(r'\s+'))[0]).where((n) => n.isNotEmpty).toList();
  if (firstNames.isEmpty) return '';
  if (firstNames.length == 1) return firstNames[0];
  if (firstNames.length == 2) return '${firstNames[0]} & ${firstNames[1]}';
  return '${firstNames.sublist(0, firstNames.length - 1).join(', ')} & ${firstNames.last}';
}

class TravelerPassport {
  final int trips;
  final int destinations;
  final int tripsSettled;
  final int daysOnTheRoad;

  const TravelerPassport({
    required this.trips,
    required this.destinations,
    required this.tripsSettled,
    required this.daysOnTheRoad,
  });

  Map<String, dynamic> toJson() => {
        'trips': trips,
        'destinations': destinations,
        'tripsSettled': tripsSettled,
        'daysOnTheRoad': daysOnTheRoad,
      };
}

TravelerPassport computeTravelerPassport(List<dynamic> trips, [int? nowMs]) {
  final destinations = <String>{};
  int tripsSettled = 0;
  int daysOnTheRoad = 0;
  final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
  const dayMs = 24 * 60 * 60 * 1000;
  const maxDaysPerTrip = 366;

  for (final t in trips) {
    final dest = (t is Map ? t['destination'] : t.destination) as String?;
    if (dest != null && dest.trim().isNotEmpty) {
      destinations.add(dest.trim().toLowerCase());
    }
    final closed = (t is Map ? t['closed'] : t.closed) as bool? ?? false;
    if (closed) tripsSettled++;

    final startStr = (t is Map ? t['startDate'] : t.startDate) as String?;
    final endStr = (t is Map ? t['endDate'] : t.endDate) as String?;
    if (startStr == null || endStr == null) continue;

    final start = DateTime.tryParse(startStr)?.millisecondsSinceEpoch;
    final end = DateTime.tryParse(endStr)?.millisecondsSinceEpoch;
    if (start == null || end == null || end < start || start > now) continue;

    final lastDay = end < now ? end : now;
    final days = ((lastDay - start) ~/ dayMs) + 1;
    daysOnTheRoad += days > maxDaysPerTrip ? maxDaysPerTrip : days;
  }

  return TravelerPassport(
    trips: trips.length,
    destinations: destinations.length,
    tripsSettled: tripsSettled,
    daysOnTheRoad: daysOnTheRoad,
  );
}

class AchievementBadge {
  final String id;
  final String title;
  final String subtitle;
  final String icon;
  final bool unlocked;
  final String progressText;
  final String rarity;

  const AchievementBadge({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.unlocked,
    required this.progressText,
    required this.rarity,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'subtitle': subtitle,
        'icon': icon,
        'unlocked': unlocked,
        'progressText': progressText,
        'rarity': rarity,
      };
}

List<AchievementBadge> calculateTripAchievements(
  dynamic trip,
  List<dynamic> expenses,
  List<dynamic> members,
  List<dynamic> categories,
  bool isFullySettled,
) {
  final activeExpenses = expenses.where((e) {
    final isSet = (e is Map ? e['isSettlement'] : e.isSettlement) as bool? ?? false;
    final del = (e is Map ? e['deletedAt'] : e.deletedAt);
    return !isSet && del == null;
  }).toList();

  final coffeeCount = activeExpenses.where((e) {
    final t = ((e is Map ? e['title'] : e.title) as String? ?? '').toLowerCase();
    final catId = (e is Map ? e['category'] : e.category) as String? ?? '';
    final cat = categories.where((c) => (c is Map ? c['id'] : c.id) == catId).firstOrNull;
    final c = ((cat is Map ? cat['name'] : cat?.name) as String? ?? '').toLowerCase();
    return t.contains('coffee') || t.contains('cafe') || t.contains('tea') || t.contains('chai') || t.contains('breakfast') || c.contains('cafe');
  }).length;

  final nightCount = activeExpenses.where((e) {
    final t = ((e is Map ? e['title'] : e.title) as String? ?? '').toLowerCase();
    return t.contains('night') || t.contains('midnight') || t.contains('bar') || t.contains('pub') || t.contains('party') || t.contains('dinner');
  }).length;

  final settlementUnlocked = isFullySettled && activeExpenses.isNotEmpty;

  final transitCount = activeExpenses.where((e) {
    final catId = (e is Map ? e['category'] : e.category) as String? ?? '';
    final cat = categories.where((c) => (c is Map ? c['id'] : c.id) == catId).firstOrNull;
    final catName = ((cat is Map ? cat['name'] : cat?.name) as String? ?? '').toLowerCase();
    final catIcon = (cat is Map ? cat['icon'] : cat?.icon) as String? ?? '';
    return catName.contains('travel') || catName.contains('transit') || catName.contains('cab') || catName.contains('flight') || catIcon == '✈️' || catIcon == '🚗';
  }).length;
  final stops = (trip is Map ? trip['stops'] : trip.stops) as List<dynamic>?;
  final transitUnlocked = transitCount >= 3 || (stops != null && stops.length >= 3);

  double foodSpend = 0.0;
  double totalSpend = 0.0;
  for (final e in activeExpenses) {
    final amt = ((e is Map ? e['amount'] : e.amount) as num).toDouble();
    totalSpend += amt;
    final catId = (e is Map ? e['category'] : e.category) as String? ?? '';
    final cat = categories.where((c) => (c is Map ? c['id'] : c.id) == catId).firstOrNull;
    final catName = ((cat is Map ? cat['name'] : cat?.name) as String? ?? '').toLowerCase();
    final catIcon = (cat is Map ? cat['icon'] : cat?.icon) as String? ?? '';
    if (catName.contains('food') || catName.contains('dining') || catIcon == '🍔' || catIcon == '🍕') {
      foodSpend += amt;
    }
  }
  final foodDominant = totalSpend > 0 && (foodSpend / totalSpend) >= 0.35;
  final squadUnlocked = members.length >= 3;

  final photoCount = activeExpenses.where((e) {
    final img = (e is Map ? e['receiptImage'] : e.receiptImage) as String?;
    final path = (e is Map ? e['receiptPath'] : e.receiptPath) as String?;
    return (img != null && img.isNotEmpty) || (path != null && path.isNotEmpty);
  }).length;

  return [
    AchievementBadge(
      id: 'caffeine',
      title: 'Caffeine Logistics',
      subtitle: 'Fueled the expedition with 3+ coffee, tea & breakfast stops.',
      icon: '☕',
      unlocked: coffeeCount >= 3,
      progressText: '$coffeeCount/3 Stops',
      rarity: 'common',
    ),
    AchievementBadge(
      id: 'midnight',
      title: 'Midnight Odyssey',
      subtitle: 'Kept the squad vibes glowing into the late night hours.',
      icon: '🌙',
      unlocked: nightCount >= 2,
      progressText: '$nightCount/2 Night Outings',
      rarity: 'rare',
    ),
    AchievementBadge(
      id: 'lightning_settle',
      title: 'Lightning Settlement',
      subtitle: 'Zero outstanding debts — 100% squared up and settled.',
      icon: '⚡',
      unlocked: settlementUnlocked,
      progressText: settlementUnlocked ? 'All Squared ✓' : 'Settlement Pending',
      rarity: 'legendary',
    ),
    AchievementBadge(
      id: 'apex_roadrunner',
      title: 'Apex Roadrunner',
      subtitle: 'Navigated 3+ major waypoints & transit legs across the route.',
      icon: '⛰️',
      unlocked: transitUnlocked,
      progressText: '$transitCount Transit Legs',
      rarity: 'rare',
    ),
    AchievementBadge(
      id: 'executive_gourmet',
      title: 'Executive Gourmet',
      subtitle: '35%+ of squad expedition spend invested in culinary tastings.',
      icon: '🍕',
      unlocked: foodDominant,
      progressText: totalSpend > 0 ? '${((foodSpend / totalSpend) * 100).round()}% Food Spend' : '0%',
      rarity: 'common',
    ),
    AchievementBadge(
      id: 'squad_harmony',
      title: 'Squad Power',
      subtitle: '3+ explorers united on a seamless group journey.',
      icon: '👑',
      unlocked: squadUnlocked,
      progressText: '${members.length} Squad Members',
      rarity: 'common',
    ),
    AchievementBadge(
      id: 'visual_chronicler',
      title: 'Visual Chronicler',
      subtitle: 'Saved official receipts & travel polaroids into the ledger.',
      icon: '📸',
      unlocked: photoCount >= 1,
      progressText: '$photoCount Captured',
      rarity: 'rare',
    ),
  ];
}

Map<String, dynamic> inferSeasonalClimate(String destination, [String? startDateStr]) {
  final destLower = destination.toLowerCase();
  int month = DateTime.now().month - 1;
  if (startDateStr != null) {
    final parsed = DateTime.tryParse(startDateStr);
    if (parsed != null) {
      month = parsed.month - 1;
    }
  }

  final isHighAltitudeOrAlpine = destLower.contains('mountain') ||
      destLower.contains('trek') ||
      destLower.contains('manali') ||
      destLower.contains('ladakh') ||
      destLower.contains('leh') ||
      destLower.contains('shimla') ||
      destLower.contains('alps') ||
      destLower.contains('himalaya') ||
      destLower.contains('kashmir') ||
      destLower.contains('gulmarg') ||
      destLower.contains('switzerland') ||
      destLower.contains('iceland') ||
      destLower.contains('norway');

  final isSouthernHemisphere = destLower.contains('australia') ||
      destLower.contains('sydney') ||
      destLower.contains('melbourne') ||
      destLower.contains('new zealand') ||
      destLower.contains('south africa') ||
      destLower.contains('argentina') ||
      destLower.contains('chile');

  final effectiveMonth = isSouthernHemisphere ? (month + 6) % 12 : month;
  final isWinterMonths = effectiveMonth == 11 || effectiveMonth == 0 || effectiveMonth == 1;
  final isSummerMonths = effectiveMonth == 4 || effectiveMonth == 5 || effectiveMonth == 6;
  final isMonsoonMonths = (effectiveMonth >= 5 && effectiveMonth <= 8) &&
      (destLower.contains('india') ||
          destLower.contains('goa') ||
          destLower.contains('mumbai') ||
          destLower.contains('kerala') ||
          destLower.contains('thailand') ||
          destLower.contains('vietnam') ||
          destLower.contains('bali'));

  final isCold = isHighAltitudeOrAlpine || (isWinterMonths && !destLower.contains('beach') && !destLower.contains('dubai'));
  final isRainy = isMonsoonMonths;
  final isHot = isSummerMonths || destLower.contains('dubai') || destLower.contains('cairo') || destLower.contains('rajasthan');

  int estimatedTempC = 24;
  String seasonName = 'Mild / Moderate';

  if (isCold) {
    estimatedTempC = isHighAltitudeOrAlpine ? (isWinterMonths ? -2 : 8) : 9;
    seasonName = isWinterMonths ? 'Winter / Cold Season' : 'Cool Alpine';
  } else if (isRainy) {
    estimatedTempC = 26;
    seasonName = 'Monsoon / Wet Season';
  } else if (isHot) {
    estimatedTempC = 34;
    seasonName = 'Summer / High Heat';
  } else if (isWinterMonths) {
    estimatedTempC = 20;
    seasonName = 'Mild Winter';
  }

  return {
    'seasonName': seasonName,
    'isCold': isCold,
    'isRainy': isRainy,
    'isHot': isHot,
    'estimatedTempC': estimatedTempC,
  };
}

List<Map<String, dynamic>> generateSmartPackingSuggestions(Map<String, dynamic> context) {
  final suggestions = <Map<String, dynamic>>[
    {
      'id': 'doc-id',
      'text': 'Government Photo ID / Physical Passport',
      'category': 'documents',
      'airplaneEligibility': 'cabin-only',
      'isFlightEssential': true,
      'scope': 'personal',
      'cabinNote': 'Must be in cabin / accessible for airport check-in and security checkpoints',
      'defaultChecked': true,
      'icon': '🪪',
    },
    {
      'id': 'doc-tickets',
      'text': 'Flight / Train Boarding Passes & Itinerary',
      'category': 'documents',
      'airplaneEligibility': 'cabin-only',
      'isFlightEssential': true,
      'scope': 'personal',
      'cabinNote': 'Carry in cabin or store in digital passes wallet',
      'defaultChecked': true,
      'icon': '🎫',
    },
    {
      'id': 'doc-hotel',
      'text': 'Hotel / Stay Confirmation Vouchers',
      'category': 'documents',
      'airplaneEligibility': 'cabin-only',
      'scope': 'shared',
      'cabinNote': 'Keep booking reference handy for immigration / customs',
      'defaultChecked': true,
      'icon': '🏨',
    },
    {
      'id': 'doc-cash',
      'text': 'Cash & Forex / Debit Cards',
      'category': 'documents',
      'airplaneEligibility': 'cabin-only',
      'isFlightEssential': true,
      'scope': 'personal',
      'cabinNote': 'Aviation security: never pack money or credit cards in check-in hold',
      'defaultChecked': true,
      'icon': '💵',
    },
    {
      'id': 'elec-powerbank',
      'text': 'Power Bank (10,000 - 20,000 mAh)',
      'category': 'packing',
      'airplaneEligibility': 'cabin-only',
      'isFlightEssential': true,
      'scope': 'personal',
      'reason': 'ICAO Aviation Safety: loose lithium batteries strictly prohibited in hold',
      'cabinNote': 'Must be carried in cabin only. Prohibited in check-in baggage!',
      'defaultChecked': true,
      'icon': '🔋',
    }
  ];
  return suggestions;
}

String describeSyncItem(Map<String, dynamic> item) {
  final type = item['type'] as String? ?? '';
  final p = item['payload'] as Map<String, dynamic>? ?? {};

  String named(String prefix, dynamic name) {
    if (name is String && name.trim().isNotEmpty) {
      return '$prefix: ${name.trim()}';
    }
    return prefix;
  }

  switch (type) {
    case 'addExpense':
      final expenseData = p['expenseData'] as Map<String, dynamic>?;
      return named('Add expense', expenseData?['title']);
    case 'updateExpense':
      final expenseData = p['expenseData'] as Map<String, dynamic>?;
      return named('Edit expense', expenseData?['title']);
    case 'deleteExpense':
      return 'Delete expense';
    case 'restoreExpense':
      return 'Restore expense';
    case 'permanentlyDeleteExpense':
      return 'Permanently delete expense';
    case 'emptyRecycleBin':
      return 'Empty recycle bin';
    case 'createTrip':
      return named('Create trip', p['name']);
    case 'addMember':
      return named('Add member', p['name']);
    case 'updateMember':
      return named('Update member', p['name']);
    case 'toggleArchiveMember':
      return named(p['archived'] == true ? 'Archive member' : 'Unarchive member', p['name']);
    case 'deleteMember':
      return named('Delete member', p['name']);
    case 'createGroup':
      return named('Create group', p['name']);
    case 'updateGroup':
      return named('Update group', p['name']);
    case 'deleteGroup':
      return 'Delete group';
    case 'addCategory':
      return named('Add category', p['name']);
    case 'deleteCategory':
      return 'Delete category';
    default:
      return type.replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m[1]}').toLowerCase();
  }
}
