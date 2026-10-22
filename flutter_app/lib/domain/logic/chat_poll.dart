/// A trip poll lives in a chat message (kind `poll`); its state is the message payload:
/// `{question, options: [{id, text}], votes: {optionId: [memberId]}, closed}`.
class PollOption {
  const PollOption(this.id, this.text, this.voters);
  final String id;
  final String text;
  final List<String> voters;
  int get count => voters.length;
}

class PollView {
  const PollView({required this.question, required this.options, required this.closed});

  final String question;
  final List<PollOption> options;
  final bool closed;

  int get totalVotes => options.fold(0, (a, o) => a + o.count);

  /// Option ids with the most votes (several on a tie), none while nobody has voted.
  Set<String> get leaders {
    final top = options.fold(0, (a, o) => o.count > a ? o.count : a);
    return top == 0
        ? const {}
        : {
            for (final o in options)
              if (o.count == top) o.id,
          };
  }

  String? votedBy(String memberId) {
    for (final o in options) {
      if (o.voters.contains(memberId)) return o.id;
    }
    return null;
  }
}

PollView? pollFromPayload(Map<String, dynamic>? p) {
  if (p == null) return null;
  final q = p['question'];
  final opts = p['options'];
  if (q is! String || opts is! List) return null;
  final votes = p['votes'] is Map ? (p['votes'] as Map) : const <dynamic, dynamic>{};
  return PollView(
    question: q,
    closed: p['closed'] == true,
    options: [
      for (final o in opts)
        if (o is Map && o['id'] is String && o['text'] is String)
          PollOption(o['id'] as String, o['text'] as String, [
            for (final v in (votes[o['id']] as List? ?? const [])) v.toString(),
          ]),
    ],
  );
}

/// Payload for a new poll. Blank options are dropped; ids are `o1`, `o2` ...
Map<String, dynamic> newPollPayload(String question, List<String> options) {
  final clean = [
    for (final o in options)
      if (o.trim().isNotEmpty) o.trim(),
  ];
  return {
    'question': question.trim(),
    'options': [
      for (var i = 0; i < clean.length; i++) {'id': 'o${i + 1}', 'text': clean[i]},
    ],
    'votes': <String, List<String>>{},
    'closed': false,
  };
}

/// One vote per person: voting for an option moves your vote there; voting again for it takes it back.
/// A closed poll is returned unchanged.
Map<String, dynamic> pollWithVote(Map<String, dynamic> payload, String optionId, String memberId) {
  if (payload['closed'] == true) return payload;
  final votes = <String, List<String>>{
    for (final e in (payload['votes'] as Map? ?? const {}).entries)
      e.key.toString(): [for (final v in e.value as List) v.toString()],
  };
  final had = votes[optionId]?.contains(memberId) ?? false;
  for (final list in votes.values) {
    list.remove(memberId);
  }
  if (!had) votes.putIfAbsent(optionId, () => []).add(memberId);
  votes.removeWhere((_, v) => v.isEmpty);
  return {...payload, 'votes': votes};
}

Map<String, dynamic> pollClosed(Map<String, dynamic> payload) => {...payload, 'closed': true};
