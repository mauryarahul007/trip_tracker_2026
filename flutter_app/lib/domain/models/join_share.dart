/// Public invite preview (no auth): what a stranger may see before signing in.
class JoinPreview {
  const JoinPreview({required this.tripName, required this.startDate, required this.endDate, this.memberFirstNames = const []});
  final String tripName;
  final String startDate;
  final String endDate;
  final List<String> memberFirstNames;
}

class UnclaimedMember {
  const UnclaimedMember({required this.id, required this.name});
  final String id;
  final String name;
}

/// Authenticated invite lookup. `myMemberId != null` means already on the trip.
class JoinLookup {
  const JoinLookup({
    required this.tripId,
    required this.tripName,
    required this.isAdmin,
    this.myMemberId,
    this.unclaimedMembers = const [],
  });
  final String tripId;
  final String tripName;
  final bool isAdmin;
  final String? myMemberId;
  final List<UnclaimedMember> unclaimedMembers;

  bool get alreadyIn => myMemberId != null;
}

/// Read-only public trip summary behind a share link (`get_trip_share`).
class TripShareSummary {
  const TripShareSummary({
    required this.tripName,
    required this.startDate,
    required this.endDate,
    this.destination,
    this.memberCount = 0,
    this.expenseCount = 0,
    this.spendByCurrency = const {},
  });
  final String tripName;
  final String startDate;
  final String endDate;
  final String? destination;
  final int memberCount;
  final int expenseCount;
  final Map<String, double> spendByCurrency;
}

class ShareLinkState {
  const ShareLinkState({required this.token, required this.enabled, required this.expiresAt});
  final String token;
  final bool enabled;
  final DateTime? expiresAt;

  bool isActive(DateTime now) => enabled && token.isNotEmpty && (expiresAt == null || expiresAt!.isAfter(now));
}

/// Raised for backend rejections the UI should explain (e.g. rate limit).
class InviteException implements Exception {
  const InviteException(this.message, {this.lockoutSeconds});
  final String message;
  final int? lockoutSeconds;
  @override
  String toString() => 'InviteException($message)';
}
