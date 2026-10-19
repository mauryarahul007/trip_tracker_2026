import '../models/category.dart';
import '../models/expense.dart';
import '../models/member.dart';
import '../models/trip.dart';

enum BadgeRarity { common, rare, legendary }

class AchievementBadge {
  const AchievementBadge({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.unlocked,
    required this.progressText,
    required this.rarity,
  });

  final String id;
  final String title;
  final String subtitle;
  final String icon;
  final bool unlocked;
  final String progressText;
  final BadgeRarity rarity;
}

/// Evaluates the 7 enamel pin achievement badges for a trip matching web logic.
List<AchievementBadge> calculateTripAchievements(
  Trip trip,
  List<Expense> expenses,
  List<Member> members,
  List<Category> categories,
  bool isFullySettled,
) {
  final activeExpenses = expenses.where((e) => !e.isSettlement && e.deletedAt == null).toList();

  // 1. Caffeine Logistics (3+ Cafe/Coffee/Breakfast)
  final coffeeCount = activeExpenses.where((e) {
    final t = e.title.toLowerCase();
    final c = categories.where((cat) => cat.id == e.category).firstOrNull?.name.toLowerCase() ?? '';
    return t.contains('coffee') ||
        t.contains('cafe') ||
        t.contains('tea') ||
        t.contains('chai') ||
        t.contains('breakfast') ||
        c.contains('cafe');
  }).length;
  final coffeeUnlocked = coffeeCount >= 3;

  // 2. Midnight Odyssey (late night / evening outings)
  final nightCount = activeExpenses.where((e) {
    final t = e.title.toLowerCase();
    return t.contains('night') ||
        t.contains('midnight') ||
        t.contains('bar') ||
        t.contains('pub') ||
        t.contains('party') ||
        t.contains('dinner');
  }).length;
  final nightUnlocked = nightCount >= 2;

  // 3. Lightning Settlement (All debts cleared)
  final settlementUnlocked = isFullySettled && activeExpenses.isNotEmpty;

  // 4. Apex Roadrunner (Transit exploration)
  final transitCount = activeExpenses.where((e) {
    final c = categories.where((cat) => cat.id == e.category).firstOrNull;
    final catName = (c?.name ?? '').toLowerCase();
    return catName.contains('travel') ||
        catName.contains('transit') ||
        catName.contains('cab') ||
        catName.contains('flight') ||
        c?.icon == '✈️' ||
        c?.icon == '🚗';
  }).length;
  final transitUnlocked = transitCount >= 3 || trip.stops.length >= 3;

  // 5. Executive Gourmet (Food dominant >= 35% of total spend)
  final foodSpend = activeExpenses
      .where((e) {
        final c = categories.where((cat) => cat.id == e.category).firstOrNull;
        final catName = (c?.name ?? '').toLowerCase();
        return catName.contains('food') || catName.contains('dining') || c?.icon == '🍔' || c?.icon == '🍕';
      })
      .fold(0.0, (sum, e) => sum + e.amount);

  final totalSpend = activeExpenses.fold(0.0, (sum, e) => sum + e.amount);
  final foodDominant = totalSpend > 0 && (foodSpend / totalSpend) >= 0.35;

  // 6. Squad Harmony / Squad Power (3+ members participating)
  final squadUnlocked = members.length >= 3;

  // 7. Visual Chronicler (Receipts/photos attached)
  final photoCount = activeExpenses.where((e) {
    final hasImg = e.receiptImage != null && e.receiptImage!.trim().isNotEmpty;
    final hasPath = e.receiptPath != null && e.receiptPath!.trim().isNotEmpty;
    final hasPhotos = e.photoPaths != null && e.photoPaths!.isNotEmpty;
    return hasImg || hasPath || hasPhotos;
  }).length;
  final photoUnlocked = photoCount >= 1;

  return [
    AchievementBadge(
      id: 'caffeine',
      title: 'Caffeine Logistics',
      subtitle: 'Fueled the expedition with 3+ coffee, tea & breakfast stops.',
      icon: '☕',
      unlocked: coffeeUnlocked,
      progressText: '$coffeeCount/3 Stops',
      rarity: BadgeRarity.common,
    ),
    AchievementBadge(
      id: 'midnight',
      title: 'Midnight Odyssey',
      subtitle: 'Kept the squad vibes glowing into the late night hours.',
      icon: '🌙',
      unlocked: nightUnlocked,
      progressText: '$nightCount/2 Night Outings',
      rarity: BadgeRarity.rare,
    ),
    AchievementBadge(
      id: 'lightning_settle',
      title: 'Lightning Settlement',
      subtitle: 'Zero outstanding debts — 100% squared up and settled.',
      icon: '⚡',
      unlocked: settlementUnlocked,
      progressText: settlementUnlocked ? 'All Squared ✓' : 'Settlement Pending',
      rarity: BadgeRarity.legendary,
    ),
    AchievementBadge(
      id: 'apex_roadrunner',
      title: 'Apex Roadrunner',
      subtitle: 'Navigated 3+ major waypoints & transit legs across the route.',
      icon: '⛰️',
      unlocked: transitUnlocked,
      progressText: '$transitCount Transit Legs',
      rarity: BadgeRarity.rare,
    ),
    AchievementBadge(
      id: 'executive_gourmet',
      title: 'Executive Gourmet',
      subtitle: '35%+ of squad expedition spend invested in culinary tastings.',
      icon: '🍕',
      unlocked: foodDominant,
      progressText: totalSpend > 0 ? '${((foodSpend / totalSpend) * 100).round()}% Food Spend' : '0%',
      rarity: BadgeRarity.common,
    ),
    AchievementBadge(
      id: 'squad_harmony',
      title: 'Squad Power',
      subtitle: '3+ explorers united on a seamless group journey.',
      icon: '👑',
      unlocked: squadUnlocked,
      progressText: '${members.length} Squad Members',
      rarity: BadgeRarity.common,
    ),
    AchievementBadge(
      id: 'visual_chronicler',
      title: 'Visual Chronicler',
      subtitle: 'Saved official receipts & travel polaroids into the ledger.',
      icon: '📸',
      unlocked: photoUnlocked,
      progressText: '$photoCount Captured',
      rarity: BadgeRarity.rare,
    ),
  ];
}
