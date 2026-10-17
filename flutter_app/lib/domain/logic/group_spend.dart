import '../models/expense.dart';
import '../models/group.dart';

/// One row of the "Who paid" card: a group, or a member who is in no group.
class SpendRow {
  const SpendRow({required this.id, required this.name, required this.paid, required this.share, this.memberCount = 1});
  final String id;
  final String name;

  /// Money its members put up.
  final double paid;

  /// What its members' split shares of the costs add up to.
  final double share;
  final int memberCount;
}

/// Paid and share per member (settlement transfers and pending approvals excluded), keyed by member id.
({Map<String, double> paid, Map<String, double> share}) memberSpend(Iterable<Expense> all) {
  final paid = <String, double>{};
  final share = <String, double>{};
  for (final e in all) {
    if (e.isSettlement || e.deletedAt != null || e.approvalStatus == 'pending_approval') continue;
    if (e.title.startsWith('Settlement:')) continue;
    final shares = e.paidByShares;
    if (shares != null && shares.isNotEmpty) {
      shares.forEach((k, v) => paid[k] = (paid[k] ?? 0) + v);
    } else {
      paid[e.paidBy] = (paid[e.paidBy] ?? 0) + e.amount;
    }
    e.resolvedShares.forEach((k, v) => share[k] = (share[k] ?? 0) + v);
  }
  return (paid: paid, share: share);
}

/// Rolls member spend up to groups. A member in no group keeps their own row, so the rows always cover
/// everyone (same rule as the settlement nodes). Biggest payer first; rows with nothing on either side are dropped.
List<SpendRow> spendByGroup(
  Map<String, double> paid,
  Map<String, double> share,
  List<Group> groups,
  Map<String, String> names,
) {
  final groupOf = <String, Group>{};
  for (final g in groups) {
    for (final m in g.memberIds) {
      groupOf.putIfAbsent(m, () => g);
    }
  }
  final rows = <String, SpendRow>{};
  for (final m in {...paid.keys, ...share.keys}) {
    final g = groupOf[m];
    final key = g != null ? 'group:${g.id}' : 'member:$m';
    final old = rows[key];
    rows[key] = SpendRow(
      id: key,
      name: g?.name ?? names[m] ?? '?',
      paid: (old?.paid ?? 0) + (paid[m] ?? 0),
      share: (old?.share ?? 0) + (share[m] ?? 0),
      memberCount: (old?.memberCount ?? 0) + 1,
    );
  }
  return rows.values.where((r) => r.paid > 0.005 || r.share > 0.005).toList()..sort((a, b) => b.paid.compareTo(a.paid));
}
