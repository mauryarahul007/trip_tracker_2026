import '../models/category.dart';
import '../models/expense.dart';
import '../models/member.dart';

class DuplicateMatchResult {
  final bool isDuplicate;
  final String confidence;
  final String reason;
  final Expense matchedExpense;
  final String matchedPayerName;

  const DuplicateMatchResult({
    required this.isDuplicate,
    required this.confidence,
    required this.reason,
    required this.matchedExpense,
    required this.matchedPayerName,
  });

  Map<String, dynamic> toJson() => {
    'isDuplicate': isDuplicate,
    'confidence': confidence,
    'reason': reason,
    'matchedExpense': matchedExpense.toJson(),
    'matchedPayerName': matchedPayerName,
  };
}

class CandidateExpense {
  final double amount;
  final String? currency;
  final String title;
  final String date;
  final String? categoryId;
  final String? paidById;
  final String? id;

  const CandidateExpense({
    required this.amount,
    this.currency,
    required this.title,
    required this.date,
    this.categoryId,
    this.paidById,
    this.id,
  });
}

Set<String> _tokenizeTitle(String text) {
  final normalized = text.toLowerCase().replaceAll(RegExp(r'[^\w\s]'), ' ').trim();
  final tokens = normalized.split(RegExp(r'\s+')).where((word) => word.length > 2);
  const stopWords = {'the', 'and', 'for', 'with', 'from', 'paid'};
  return tokens.where((t) => !stopWords.contains(t)).toSet();
}

double _titleSimilarity(String titleA, String titleB) {
  final normA = titleA.trim().toLowerCase();
  final normB = titleB.trim().toLowerCase();
  if (normA == normB && normA.isNotEmpty) return 1.0;

  final tokensA = _tokenizeTitle(normA);
  final tokensB = _tokenizeTitle(normB);
  if (tokensA.isEmpty || tokensB.isEmpty) {
    return normA == normB ? 1.0 : 0.0;
  }

  int intersection = 0;
  for (final t in tokensA) {
    if (tokensB.contains(t)) intersection++;
  }

  final union = {...tokensA, ...tokensB}.length;
  return union > 0 ? intersection / union : 0.0;
}

DuplicateMatchResult? detectDuplicateExpense(
  dynamic candidateData,
  List<Expense> existingExpenses, [
  List<Category> categories = const [],
  List<Member> members = const [],
]) {
  late CandidateExpense candidate;
  if (candidateData is CandidateExpense) {
    candidate = candidateData;
  } else if (candidateData is Map<String, dynamic>) {
    candidate = CandidateExpense(
      amount: (candidateData['amount'] as num).toDouble(),
      currency: candidateData['currency'] as String?,
      title: candidateData['title'] as String,
      date: candidateData['date'] as String,
      categoryId: candidateData['categoryId'] as String?,
      paidById: candidateData['paidById'] as String?,
      id: candidateData['id'] as String?,
    );
  } else {
    return null;
  }

  if (candidate.amount <= 0 || candidate.date.isEmpty) return null;
  final candidateDate = DateTime.tryParse(candidate.date);
  if (candidateDate == null) return null;

  final memberMap = <String, String>{};
  for (final m in members) {
    memberMap[m.id] = m.name;
  }

  final categoryMap = <String, String>{};
  for (final c in categories) {
    categoryMap[c.id] = c.name;
  }

  final eligibleExpenses = existingExpenses.where((e) {
    if (e.deletedAt != null) return false;
    if (e.isSettlement) return false;
    if (candidate.id != null && e.id == candidate.id) return false;
    return true;
  }).toList();

  DuplicateMatchResult? bestMatch;

  for (final existing in eligibleExpenses) {
    final amountDiff = (existing.amount - candidate.amount).abs();
    final amountTolerance = (candidate.amount * 0.02 > 1.0) ? candidate.amount * 0.02 : 1.0;
    if (amountDiff > amountTolerance) continue;

    final existingDate = DateTime.tryParse(existing.date);
    if (existingDate == null) continue;

    final isSameDay = existing.date == candidate.date;
    final diffHours = (candidateDate.difference(existingDate).inMilliseconds.abs()) / (1000 * 60 * 60);
    final isAdjacentDay = diffHours <= 28;

    if (!isSameDay && !isAdjacentDay) continue;

    final sim = _titleSimilarity(candidate.title, existing.title);
    final isCategoryMatch =
        candidate.categoryId != null && existing.category.isNotEmpty && candidate.categoryId == existing.category;
    final isSamePayer =
        candidate.paidById != null && existing.paidBy.isNotEmpty && candidate.paidById == existing.paidBy;

    final matchedPayerName = memberMap[existing.paidBy] ?? 'Someone';
    final catName = categoryMap[existing.category] ?? 'expense';

    if (isSameDay && sim >= 0.5) {
      final amtStr = existing.amount % 1 == 0 ? existing.amount.toInt().toString() : existing.amount.toString();
      return DuplicateMatchResult(
        isDuplicate: true,
        confidence: 'high',
        reason: 'A matching "${existing.title}" ($amtStr) was already logged today by $matchedPayerName.',
        matchedExpense: existing,
        matchedPayerName: matchedPayerName,
      );
    }

    if (isSameDay && isSamePayer && (sim > 0 || isCategoryMatch)) {
      final amtStr = existing.amount % 1 == 0 ? existing.amount.toInt().toString() : existing.amount.toString();
      return DuplicateMatchResult(
        isDuplicate: true,
        confidence: 'high',
        reason: '$matchedPayerName already logged an identical $amtStr $catName today ("${existing.title}").',
        matchedExpense: existing,
        matchedPayerName: matchedPayerName,
      );
    }

    if (isSameDay && isCategoryMatch && !isSamePayer) {
      final amtStr = existing.amount % 1 == 0 ? existing.amount.toInt().toString() : existing.amount.toString();
      bestMatch = DuplicateMatchResult(
        isDuplicate: true,
        confidence: 'medium',
        reason:
            '$matchedPayerName already logged a $catName expense for $amtStr today ("${existing.title}"). Did you both pay, or is this a duplicate?',
        matchedExpense: existing,
        matchedPayerName: matchedPayerName,
      );
      continue;
    }

    if (isAdjacentDay && sim >= 0.5 && bestMatch == null) {
      final amtStr = existing.amount % 1 == 0 ? existing.amount.toInt().toString() : existing.amount.toString();
      bestMatch = DuplicateMatchResult(
        isDuplicate: true,
        confidence: 'medium',
        reason: 'A similar "${existing.title}" ($amtStr) was logged on ${existing.date} by $matchedPayerName.',
        matchedExpense: existing,
        matchedPayerName: matchedPayerName,
      );
    }
  }

  return bestMatch;
}
