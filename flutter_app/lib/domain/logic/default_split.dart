class RememberedDefaultSplit {
  final String splitMode;
  final List<String> splitMemberIds;
  final Map<String, double>? splitConfig;

  const RememberedDefaultSplit({
    required this.splitMode,
    required this.splitMemberIds,
    this.splitConfig,
  });

  Map<String, dynamic> toJson() => {
        'splitMode': splitMode,
        'splitMemberIds': splitMemberIds,
        if (splitConfig != null) 'splitConfig': splitConfig,
      };

  factory RememberedDefaultSplit.fromJson(Map<String, dynamic> json) =>
      RememberedDefaultSplit(
        splitMode: json['splitMode'] as String,
        splitMemberIds: (json['splitMemberIds'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            const [],
        splitConfig: (json['splitConfig'] as Map<String, dynamic>?)?.map(
          (k, v) => MapEntry(k, (v as num).toDouble()),
        ),
      );
}

RememberedDefaultSplit? remapDefaultSplit(
  RememberedDefaultSplit? stored,
  Map<String, String> memberIdMap,
) {
  if (stored == null) return null;
  final splitMemberIds = stored.splitMemberIds
      .map((id) => memberIdMap[id])
      .where((id) => id != null && id.isNotEmpty)
      .cast<String>()
      .toList();
  if (splitMemberIds.isEmpty) return null;

  Map<String, double>? splitConfig;
  if (stored.splitConfig != null) {
    final next = <String, double>{};
    for (final entry in stored.splitConfig!.entries) {
      final mapped = memberIdMap[entry.key];
      if (mapped != null && mapped.isNotEmpty) {
        next[mapped] = entry.value;
      }
    }
    if (next.isNotEmpty) splitConfig = next;
  }

  return RememberedDefaultSplit(
    splitMode: stored.splitMode,
    splitMemberIds: splitMemberIds,
    splitConfig: splitConfig,
  );
}
