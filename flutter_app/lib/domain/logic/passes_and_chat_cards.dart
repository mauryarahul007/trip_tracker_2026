const Map<String, String> cityToIata = {
  'bangalore': 'BLR',
  'bengaluru': 'BLR',
  'hyderabad': 'HYD',
  'bagdogra': 'IXB',
  'delhi': 'DEL',
  'new delhi': 'DEL',
  'mumbai': 'BOM',
  'bombay': 'BOM',
  'kolkata': 'CCU',
  'calcutta': 'CCU',
  'chennai': 'MAA',
  'madras': 'MAA',
  'goa': 'GOI',
  'dabolim': 'GOI',
  'mopa': 'GOX',
  'pune': 'PNQ',
  'jaipur': 'JAI',
  'ahmedabad': 'AMD',
  'kochi': 'COK',
  'cochin': 'COK',
  'srinagar': 'SXR',
  'chandigarh': 'IXC',
  'tokyo': 'HND',
  'new_york': 'JFK',
  'new york': 'JFK',
  'san_francisco': 'SFO',
  'san francisco': 'SFO',
};

String resolveAirportCode(String input) {
  if (input.isEmpty) return '';
  final trimmed = input.trim();
  if (RegExp(r'^[A-Z]{3}$').hasMatch(trimmed)) {
    return trimmed;
  }
  final clean = trimmed.toLowerCase().replaceAll(RegExp(r'[^a-z\s]'), '').trim();
  if (cityToIata.containsKey(clean)) {
    return cityToIata[clean]!;
  }
  for (final entry in cityToIata.entries) {
    if (clean.contains(entry.key) || entry.key.contains(clean)) {
      return entry.value;
    }
  }
  return trimmed;
}

String cleanPassengerName(String raw) {
  final stripped = raw
      .replaceAll(RegExp(r'\s*\([A-Za-z\s]+\)'), '')
      .replaceFirst(RegExp(r'^(?:Mr|Ms|Mrs|Dr|Master)\.?\s+', caseSensitive: false), '')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();

  if (stripped.isNotEmpty &&
      stripped == stripped.toUpperCase() &&
      RegExp(r'[A-Z]').hasMatch(stripped)) {
    return stripped
        .toLowerCase()
        .split(' ')
        .map((part) => part.isNotEmpty ? part[0].toUpperCase() + part.substring(1) : '')
        .join(' ');
  }
  return stripped;
}

class PassStubCell {
  final String label;
  final double amount;
  final bool signed;
  final String tone; // 'receive' | 'pay' | 'even' | 'ink'
  final String caption;

  const PassStubCell({
    required this.label,
    required this.amount,
    required this.signed,
    required this.tone,
    required this.caption,
  });

  Map<String, dynamic> toJson() => {
        'label': label,
        'amount': amount % 1 == 0 ? amount.toInt() : amount,
        'signed': signed,
        'tone': tone,
        'caption': caption,
      };
}

class PassStub {
  final PassStubCell left;
  final PassStubCell right;
  final String? summary;

  const PassStub({
    required this.left,
    required this.right,
    this.summary,
  });

  Map<String, dynamic> toJson() => {
        'left': left.toJson(),
        'right': right.toJson(),
        'summary': summary,
      };
}

class PassStubGroup {
  final String name;
  final double balance;
  final List<String> otherMemberNames;

  const PassStubGroup({
    required this.name,
    required this.balance,
    this.otherMemberNames = const [],
  });
}

String toneFor(double amount) {
  if (amount.abs() < 0.01) return 'even';
  return amount > 0 ? 'receive' : 'pay';
}

PassStub buildPassStub(
  Map<String, dynamic> input,
  String Function(double amount) format,
) {
  final myNet = (input['myNet'] as num).toDouble();
  final paid = (input['paid'] as num).toDouble();
  final share = (input['share'] as num).toDouble();
  final group = input['group'];

  if (group != null && group is PassStubGroup) {
    final outside = double.parse(group.balance.toStringAsFixed(2));
    final inside = double.parse((myNet - outside).toStringAsFixed(2));
    return PassStub(
      left: PassStubCell(
        label: 'Inside ${group.name}',
        amount: inside,
        signed: true,
        tone: toneFor(inside),
        caption: inside > 0 ? 'Your group owes you' : 'You owe your group',
      ),
      right: PassStubCell(
        label: 'Outside ${group.name}',
        amount: outside,
        signed: true,
        tone: toneFor(outside),
        caption: outside > 0 ? '${group.name} receives' : '${group.name} pays',
      ),
      summary: myNet > 0 ? 'You are ahead ${format(myNet.abs())}' : 'You are short ${format(myNet.abs())}',
    );
  }

  final net = double.parse(myNet.toStringAsFixed(2));
  final netTone = toneFor(net);

  return PassStub(
    left: PassStubCell(
      label: netTone == 'pay' ? 'You owe' : (netTone == 'receive' ? 'You get' : 'You'),
      amount: net,
      signed: true,
      tone: netTone,
      caption: netTone == 'pay' ? 'To pay' : (netTone == 'receive' ? 'To receive' : 'Square'),
    ),
    right: PassStubCell(
      label: 'You paid',
      amount: double.parse(paid.abs().toStringAsFixed(2)),
      signed: false,
      tone: 'ink',
      caption: 'Your share ${format(share.abs())}',
    ),
    summary: null,
  );
}

class ChatExpenseCardPresentation {
  final String variant;
  final String icon;
  final String whoLabel;

  const ChatExpenseCardPresentation({
    required this.variant,
    required this.icon,
    required this.whoLabel,
  });

  Map<String, dynamic> toJson() => {
        'variant': variant,
        'icon': icon,
        'whoLabel': whoLabel,
      };
}

ChatExpenseCardPresentation getChatExpenseCardPresentation(
  String kind,
  bool isMine,
  String senderName,
) {
  final who = isMine ? 'You' : senderName;
  if (kind == 'settlement_recorded') {
    return ChatExpenseCardPresentation(variant: 'settlement', icon: '🤝', whoLabel: '$who recorded settlement');
  }
  if (kind == 'expense_disputed') {
    return ChatExpenseCardPresentation(variant: 'dispute', icon: '⚠️', whoLabel: '$who disputed');
  }
  if (kind == 'expense_dispute_resolved') {
    return const ChatExpenseCardPresentation(variant: 'resolved', icon: '✅', whoLabel: 'Dispute resolved');
  }
  if (kind == 'expense_link') {
    return ChatExpenseCardPresentation(variant: 'link', icon: '🔗', whoLabel: '$who linked');
  }
  if (kind == 'expense_deleted') {
    return ChatExpenseCardPresentation(variant: 'deleted', icon: '🗑️', whoLabel: '$who deleted');
  }
  if (kind == 'expense_restored') {
    return ChatExpenseCardPresentation(variant: 'restored', icon: '♻️', whoLabel: '$who restored');
  }
  if (kind == 'settlement_confirmed') {
    return ChatExpenseCardPresentation(variant: 'confirmed', icon: '✅', whoLabel: '$who confirmed settlement');
  }
  return ChatExpenseCardPresentation(variant: 'expense', icon: '💳', whoLabel: '$who added');
}

String expenseEventBody(String kind, Map<String, dynamic> expense) {
  final title = expense['title'] as String;
  final currency = expense['currency'] as String;
  final amount = (expense['amount'] as num).toDouble();
  final money = '$currency ${amount.toStringAsFixed(2)}';

  switch (kind) {
    case 'expense_added':
      return 'Added $title · $money';
    case 'settlement_recorded':
      return 'Settlement $title · $money';
    case 'expense_disputed':
      final note = expense['note'] as String?;
      return note != null && note.isNotEmpty ? 'Disputed $title — $note' : 'Disputed $title';
    case 'expense_dispute_resolved':
      return 'Dispute resolved: $title';
    case 'expense_deleted':
      return 'Deleted $title · $money';
    case 'expense_restored':
      return 'Restored $title · $money';
    case 'settlement_confirmed':
      return 'Confirmed settlement $title · $money';
    default:
      return '$title · $money';
  }
}
