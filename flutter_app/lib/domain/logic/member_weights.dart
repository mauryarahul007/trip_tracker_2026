/// Couples count as 2 (flag `enableMemberWeights`): the default split for a new expense.
///
/// [weights]: memberId -> how many people that member counts as on their own (1 = just them; extra people who
/// are not trip members). [covers]: coveredMemberId -> payerMemberId. A covered member who is in the split along
/// with their payer is taken out, and the payer's weight goes up by one for each of them.
///
/// Returns null when nothing changes (everyone weighs 1, nobody covered), so the split stays a plain equal one.
({Set<String> selected, Map<String, double> weights})? weightedDefaultSplit({
  required Set<String> selected,
  required Map<String, double> weights,
  required Map<String, String> covers,
}) {
  final covered = <String>{
    for (final e in covers.entries)
      if (selected.contains(e.key) && selected.contains(e.value) && e.key != e.value && !covers.containsKey(e.value))
        e.key,
  };
  final inSplit = selected.difference(covered);
  final out = <String, double>{};
  for (final id in inSplit) {
    final own = weights[id] ?? 1;
    final carried = covered.where((c) => covers[c] == id).length;
    out[id] = (own < 1 ? 1.0 : own) + carried;
  }
  if (covered.isEmpty && out.values.every((w) => w == 1)) return null;
  return (selected: inSplit, weights: out);
}

/// What a member's row says: "Counts as 2" for a payer, "Paid for by Rahul" for someone covered.
String? memberWeightNote({
  required String memberId,
  required Map<String, double> weights,
  required Map<String, String> covers,
  required String Function(String id) nameOf,
}) {
  final payer = covers[memberId];
  if (payer != null) return 'Paid for by ${nameOf(payer)}';
  final total = (weights[memberId] ?? 1) + covers.values.where((p) => p == memberId).length;
  return total > 1 ? 'Counts as ${total.round()}' : null;
}
