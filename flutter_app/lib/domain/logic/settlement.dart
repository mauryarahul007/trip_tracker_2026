import '../models/expense.dart';
import '../models/group.dart';
import '../models/member.dart';
import '../models/trip.dart';

class Transfer {
  final String from;
  final String to;
  final String fromLabel;
  final String toLabel;
  final String fromMemberId;
  final String toMemberId;
  final double amount;

  const Transfer({
    required this.from,
    required this.to,
    required this.fromLabel,
    required this.toLabel,
    required this.fromMemberId,
    required this.toMemberId,
    required this.amount,
  });

  Map<String, dynamic> toJson() => {
    'from': from,
    'to': to,
    'fromLabel': fromLabel,
    'toLabel': toLabel,
    'fromMemberId': fromMemberId,
    'toMemberId': toMemberId,
    'amount': amount,
  };

  factory Transfer.fromJson(Map<String, dynamic> json) => Transfer(
    from: json['from'] as String,
    to: json['to'] as String,
    fromLabel: json['fromLabel'] as String,
    toLabel: json['toLabel'] as String,
    fromMemberId: json['fromMemberId'] as String,
    toMemberId: json['toMemberId'] as String,
    amount: (json['amount'] as num).toDouble(),
  );
}

class PairSettlementGroup {
  final String fromMemberId;
  final String toMemberId;
  double totalPaid;
  final List<Expense> payments;

  PairSettlementGroup({
    required this.fromMemberId,
    required this.toMemberId,
    required this.totalPaid,
    required this.payments,
  });

  Map<String, dynamic> toJson() => {
    'fromMemberId': fromMemberId,
    'toMemberId': toMemberId,
    'totalPaid': totalPaid,
    'payments': payments.map((e) => e.toJson()).toList(),
  };
}

class MemberBalance {
  final String memberId;
  final String name;
  final double balance;

  const MemberBalance({required this.memberId, required this.name, required this.balance});

  Map<String, dynamic> toJson() => {'memberId': memberId, 'name': name, 'balance': balance};

  factory MemberBalance.fromJson(Map<String, dynamic> json) => MemberBalance(
    memberId: json['memberId'] as String,
    name: json['name'] as String,
    balance: (json['balance'] as num).toDouble(),
  );
}

class SettlementNode {
  final String id;
  final String name;
  final List<String> memberIds;
  double balance;

  SettlementNode({required this.id, required this.name, required this.memberIds, required this.balance});
}

class SettlementCloseoutSummary {
  final bool isFullySettled;
  final double totalOutstanding;
  final int transferCount;
  final int unsettledMemberCount;

  const SettlementCloseoutSummary({
    required this.isFullySettled,
    required this.totalOutstanding,
    required this.transferCount,
    required this.unsettledMemberCount,
  });

  Map<String, dynamic> toJson() => {
    'isFullySettled': isFullySettled,
    'totalOutstanding': totalOutstanding,
    'transferCount': transferCount,
    'unsettledMemberCount': unsettledMemberCount,
  };
}

class SettlementResult {
  final List<MemberBalance> balances;
  final List<Transfer> transfers;
  final bool isSimplified;

  const SettlementResult({required this.balances, required this.transfers, required this.isSimplified});

  Map<String, dynamic> toJson() => {
    'balances': balances.map((b) => b.toJson()).toList(),
    'transfers': transfers.map((t) => t.toJson()).toList(),
    'isSimplified': isSimplified,
  };
}

double _roundToTwo(double val) {
  return double.parse(val.toStringAsFixed(2));
}

List<PairSettlementGroup> groupSettlementsByPair(List<Expense> settlementExpenses) {
  final groups = <String, PairSettlementGroup>{};

  for (final expense in settlementExpenses) {
    final fromMemberId = expense.paidBy;
    if (expense.splitMemberIds.isEmpty) continue;
    final toMemberId = expense.splitMemberIds[0];
    if (toMemberId.isEmpty) continue;

    final key = '$fromMemberId:$toMemberId';
    final existing = groups[key];
    if (existing != null) {
      existing.totalPaid += expense.amount;
      existing.payments.add(expense);
    } else {
      groups[key] = PairSettlementGroup(
        fromMemberId: fromMemberId,
        toMemberId: toMemberId,
        totalPaid: expense.amount,
        payments: [expense],
      );
    }
  }

  final result = groups.values.map((group) {
    final sortedPayments = List<Expense>.from(group.payments)..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return PairSettlementGroup(
      fromMemberId: group.fromMemberId,
      toMemberId: group.toMemberId,
      totalPaid: group.totalPaid,
      payments: sortedPayments,
    );
  }).toList();

  result.sort((a, b) => b.totalPaid.compareTo(a.totalPaid));
  return result;
}

List<SettlementNode> buildSettlementNodes(List<MemberBalance> balances, List<Group> groups) {
  final groupOfMember = <String, Group>{};
  for (final g in groups) {
    for (final mid in g.memberIds) {
      groupOfMember.putIfAbsent(mid, () => g);
    }
  }

  final nodeMap = <String, SettlementNode>{};
  for (final b in balances) {
    final grp = groupOfMember[b.memberId];
    final key = grp != null ? 'group:${grp.id}' : 'member:${b.memberId}';
    final existing = nodeMap[key];
    if (existing == null) {
      nodeMap[key] = SettlementNode(
        id: key,
        name: grp != null ? grp.name : b.name,
        memberIds: [b.memberId],
        balance: b.balance,
      );
    } else {
      existing.memberIds.add(b.memberId);
      existing.balance = _roundToTwo(existing.balance + b.balance);
    }
  }

  return nodeMap.values.toList();
}

String _pickRepresentative(List<String> memberIds, List<MemberBalance> balances, String direction) {
  if (memberIds.isEmpty) return '';
  var best = memberIds[0];
  var bestBal = balances
      .firstWhere(
        (b) => b.memberId == best,
        orElse: () => MemberBalance(memberId: best, name: '', balance: 0),
      )
      .balance;

  for (int i = 1; i < memberIds.length; i++) {
    final id = memberIds[i];
    final bal = balances
        .firstWhere(
          (b) => b.memberId == id,
          orElse: () => MemberBalance(memberId: id, name: '', balance: 0),
        )
        .balance;
    if (direction == 'debtor') {
      if (bal < bestBal) {
        best = id;
        bestBal = bal;
      }
    } else {
      if (bal > bestBal) {
        best = id;
        bestBal = bal;
      }
    }
  }
  return best;
}

List<Transfer> _matchDebtorsToCreditors(List<SettlementNode> nodes, List<MemberBalance> balances) {
  final debtors = nodes
      .where((n) => n.balance < -0.01)
      .map((n) => SettlementNode(id: n.id, name: n.name, memberIds: List.from(n.memberIds), balance: n.balance))
      .toList();

  final creditors = nodes
      .where((n) => n.balance > 0.01)
      .map((n) => SettlementNode(id: n.id, name: n.name, memberIds: List.from(n.memberIds), balance: n.balance))
      .toList();

  final transfers = <Transfer>[];

  while (debtors.isNotEmpty && creditors.isNotEmpty) {
    debtors.sort((a, b) => a.balance.compareTo(b.balance));
    creditors.sort((a, b) => b.balance.compareTo(a.balance));

    final debtor = debtors[0];
    final creditor = creditors[0];

    final amountToSettle = (-debtor.balance < creditor.balance) ? -debtor.balance : creditor.balance;

    if (amountToSettle > 0.005) {
      transfers.add(
        Transfer(
          from: debtor.id,
          to: creditor.id,
          fromLabel: debtor.name,
          toLabel: creditor.name,
          fromMemberId: _pickRepresentative(debtor.memberIds, balances, 'debtor'),
          toMemberId: _pickRepresentative(creditor.memberIds, balances, 'creditor'),
          amount: _roundToTwo(amountToSettle),
        ),
      );

      debtor.balance += amountToSettle;
      creditor.balance -= amountToSettle;
    }

    if (debtor.balance.abs() < 0.01) debtors.removeAt(0);
    if (creditor.balance.abs() < 0.01) creditors.removeAt(0);
  }

  return transfers;
}

List<Transfer> calculateGroupInternalTransfers(List<MemberBalance> balances, Group group) {
  final memberNodes = group.memberIds.map((mid) {
    final b = balances.firstWhere(
      (bal) => bal.memberId == mid,
      orElse: () => MemberBalance(memberId: mid, name: 'Deleted Member', balance: 0),
    );
    return SettlementNode(id: 'member:$mid', name: b.name, memberIds: [mid], balance: b.balance);
  }).toList();
  return _matchDebtorsToCreditors(memberNodes, balances);
}

List<Transfer> calculateDirectSettlements(
  Trip trip,
  Map<String, Member> members,
  List<Expense> expenses, [
  List<Group> groups = const [],
]) {
  final activeTripExpenses = expenses
      .where((e) => e.tripId == trip.id && e.deletedAt == null && e.approvalStatus != 'pending_approval')
      .toList();

  final groupOfMember = <String, String>{};
  for (final g in groups) {
    for (final mid in g.memberIds) {
      groupOfMember.putIfAbsent(mid, () => g.id);
    }
  }

  final pairwise = <String, Map<String, double>>{};

  void addDebt(String debtor, String creditor, double amount) {
    if (debtor.isEmpty || creditor.isEmpty || debtor == creditor || amount <= 0.005) return;
    if (groupOfMember[debtor] != null && groupOfMember[debtor] == groupOfMember[creditor]) {
      return;
    }
    final debtorMap = pairwise.putIfAbsent(debtor, () => <String, double>{});
    debtorMap[creditor] = (debtorMap[creditor] ?? 0.0) + amount;
  }

  for (final exp in activeTripExpenses) {
    if (exp.isSettlement) {
      final debtor = exp.paidBy;
      if (exp.splitMemberIds.isNotEmpty) {
        final creditor = exp.splitMemberIds[0];
        if (creditor.isNotEmpty) {
          addDebt(creditor, debtor, exp.amount);
        }
      }
    } else {
      final hasMultiPayers = exp.paidByShares != null && exp.paidByShares!.length > 1;
      if (hasMultiPayers && exp.amount > 0) {
        final payers = exp.paidByShares!.entries.toList();
        for (final borrowerEntry in exp.resolvedShares.entries) {
          final borrower = borrowerEntry.key;
          final share = borrowerEntry.value;
          if (share <= 0.005) continue;
          for (final payerEntry in payers) {
            final payer = payerEntry.key;
            final paidAmount = payerEntry.value;
            if (borrower != payer && paidAmount > 0.005) {
              final payerPortion = (paidAmount / exp.amount) * share;
              addDebt(borrower, payer, payerPortion);
            }
          }
        }
      } else {
        final payer = exp.paidBy;
        for (final borrowerEntry in exp.resolvedShares.entries) {
          final borrower = borrowerEntry.key;
          final share = borrowerEntry.value;
          if (borrower != payer && share > 0.005) {
            addDebt(borrower, payer, share);
          }
        }
      }
    }
  }

  final transfers = <Transfer>[];
  final processedPairs = <String>{};

  for (final idA in trip.memberIds) {
    for (final idB in trip.memberIds) {
      if (idA == idB) continue;
      final pairKey = idA.compareTo(idB) < 0 ? '$idA:$idB' : '$idB:$idA';
      if (processedPairs.contains(pairKey)) continue;
      processedPairs.add(pairKey);

      final debtAtoB = pairwise[idA]?[idB] ?? 0.0;
      final debtBtoA = pairwise[idB]?[idA] ?? 0.0;
      final net = _roundToTwo(debtAtoB - debtBtoA);

      if (net > 0.005) {
        final memA = members[idA];
        final memB = members[idB];
        transfers.add(
          Transfer(
            from: 'member:$idA',
            to: 'member:$idB',
            fromLabel: memA != null ? memA.name : 'Deleted Member',
            toLabel: memB != null ? memB.name : 'Deleted Member',
            fromMemberId: idA,
            toMemberId: idB,
            amount: net,
          ),
        );
      } else if (net < -0.005) {
        final memA = members[idA];
        final memB = members[idB];
        transfers.add(
          Transfer(
            from: 'member:$idB',
            to: 'member:$idA',
            fromLabel: memB != null ? memB.name : 'Deleted Member',
            toLabel: memA != null ? memA.name : 'Deleted Member',
            fromMemberId: idB,
            toMemberId: idA,
            amount: _roundToTwo(-net),
          ),
        );
      }
    }
  }

  transfers.sort((a, b) => b.amount.compareTo(a.amount));
  return transfers;
}

SettlementResult calculateSettlements(
  Trip trip,
  Map<String, Member> members,
  List<Expense> expenses, [
  List<Group> groups = const [],
  bool? simplifyDebts,
]) {
  final activeTripExpenses = expenses
      .where((e) => e.tripId == trip.id && e.deletedAt == null && e.approvalStatus != 'pending_approval')
      .toList();

  final netBalances = <String, double>{};
  for (final id in trip.memberIds) {
    netBalances[id] = 0.0;
  }

  for (final exp in activeTripExpenses) {
    if (exp.paidByShares != null && exp.paidByShares!.isNotEmpty) {
      for (final entry in exp.paidByShares!.entries) {
        if (netBalances.containsKey(entry.key)) {
          netBalances[entry.key] = netBalances[entry.key]! + entry.value;
        }
      }
    } else if (netBalances.containsKey(exp.paidBy)) {
      netBalances[exp.paidBy] = netBalances[exp.paidBy]! + exp.amount;
    }

    for (final entry in exp.resolvedShares.entries) {
      if (netBalances.containsKey(entry.key)) {
        netBalances[entry.key] = netBalances[entry.key]! - entry.value;
      }
    }
  }

  final balances = trip.memberIds.map((id) {
    final member = members[id];
    return MemberBalance(
      memberId: id,
      name: member != null ? member.name : 'Deleted Member',
      balance: _roundToTwo(netBalances[id] ?? 0.0),
    );
  }).toList();

  final shouldSimplify = simplifyDebts ?? trip.simplifyDebts;

  if (!shouldSimplify) {
    final directTransfers = calculateDirectSettlements(trip, members, expenses, groups);
    return SettlementResult(balances: balances, transfers: directTransfers, isSimplified: false);
  }

  final nodes = buildSettlementNodes(balances, groups);
  final transfers = _matchDebtorsToCreditors(nodes, balances);

  return SettlementResult(balances: balances, transfers: transfers, isSimplified: true);
}

SettlementCloseoutSummary summarizeSettlement(List<dynamic> balances, List<dynamic> transfers) {
  double totalOutstanding = 0.0;
  for (final t in transfers) {
    if (t is Transfer) {
      totalOutstanding += t.amount;
    } else if (t is Map<String, dynamic>) {
      totalOutstanding += (t['amount'] as num).toDouble();
    }
  }

  int unsettledCount = 0;
  for (final b in balances) {
    double bal = 0.0;
    if (b is MemberBalance) {
      bal = b.balance;
    } else if (b is Map<String, dynamic>) {
      bal = (b['balance'] as num).toDouble();
    }
    if (bal.abs() >= 0.01) {
      unsettledCount++;
    }
  }

  return SettlementCloseoutSummary(
    isFullySettled: transfers.isEmpty || totalOutstanding < 0.01,
    totalOutstanding: totalOutstanding,
    transferCount: transfers.length,
    unsettledMemberCount: unsettledCount,
  );
}
