import 'dart:convert';

import '../models/expense.dart';

/// Minimal view of a queued mutation (decoupled from Drift/outbox storage).
class QueuedOp {
  final String type;
  final Map<String, dynamic> payload;
  const QueuedOp(this.type, this.payload);
}

/// Every entity id a queued payload touches. Covers the web shapes
/// (`id`, `tempId`) and the Flutter outbox shapes (`row`, `trip`, `member`,
/// `args.p_id`, `groupsToDissolve`).
Set<String> payloadEntityIds(String type, Map<String, dynamic> p) {
  final ids = <String>{};
  void add(Object? v) {
    if (v is String) ids.add(v);
  }

  Object? idOf(Object? m) => m is Map ? m['id'] : null;
  if (type == 'addExpense') add(p['tempId']);
  add(p['id']);
  add(idOf(p['row']));
  add(idOf(p['trip']));
  add(idOf(p['member']));
  final args = p['args'];
  if (args is Map) add(args['p_id']);
  final dissolve = p['groupsToDissolve'];
  if (dissolve is List) dissolve.forEach(add);
  return ids;
}

/// Entity ids with an unsynced mutation. Port of `collectDirtyExpenseIds`.
Set<String> collectDirtyIds(Iterable<QueuedOp> queue) => {
  for (final op in queue) ...payloadEntityIds(op.type, op.payload),
};

/// Server overwrites clean rows, local keeps dirty rows verbatim, and
/// optimistic local-only rows survive (SYNC.md §3.2).
List<Expense> mergeExpenses(List<Expense> local, List<Expense> server, Set<String> dirtyIds) {
  final localById = {for (final e in local) e.id: e};
  final merged = <Expense>[];
  final seen = <String>{};
  for (final s in server) {
    seen.add(s.id);
    merged.add(dirtyIds.contains(s.id) ? (localById[s.id] ?? s) : s);
  }
  for (final l in local) {
    if (!seen.contains(l.id) && dirtyIds.contains(l.id)) merged.add(l);
  }
  return merged;
}

class ExpenseConflict {
  final String expenseId;
  final Expense local;
  final Expense server;
  final String queuedOp;
  const ExpenseConflict(this.expenseId, this.local, this.server, this.queuedOp);
}

/// Port of `expensesDifferMeaningfully`.
bool expensesDifferMeaningfully(Expense a, Expense b) {
  String sortedKeys(Map<String, double> m) =>
      jsonEncode(Map.fromEntries(m.entries.toList()..sort((x, y) => x.key.compareTo(y.key))));
  List<String> sortedIds(List<String> l) => [...l]..sort();
  return a.title != b.title ||
      a.amount != b.amount ||
      a.date != b.date ||
      a.paidBy != b.paidBy ||
      a.category != b.category ||
      a.splitMode != b.splitMode ||
      a.currency != b.currency ||
      jsonEncode(sortedIds(a.splitMemberIds)) != jsonEncode(sortedIds(b.splitMemberIds)) ||
      sortedKeys(a.resolvedShares) != sortedKeys(b.resolvedShares);
}

/// Port of `detectExpenseConflicts`.
List<ExpenseConflict> detectExpenseConflicts(
  List<Expense> local,
  List<Expense> server,
  Set<String> dirtyIds,
  List<QueuedOp> queue,
) {
  final serverById = {for (final e in server) e.id: e};
  final out = <ExpenseConflict>[];
  for (final l in local) {
    if (!dirtyIds.contains(l.id)) continue;
    final s = serverById[l.id];
    if (s == null || !expensesDifferMeaningfully(l, s)) continue;
    String op = 'updateExpense';
    for (final q in queue) {
      if (payloadEntityIds(q.type, q.payload).contains(l.id)) {
        op = q.type;
        break;
      }
    }
    out.add(ExpenseConflict(l.id, l, s, op));
  }
  return out;
}
