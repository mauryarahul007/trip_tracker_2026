import 'expense.dart';
import 'member.dart';
import 'trip.dart';

/// A trip plus the growth counters the app's own [Trip] does not carry.
class FleetTrip {
  const FleetTrip({
    required this.trip,
    this.joinPreviewCount = 0,
    this.closeoutPulse,
    this.splitwiseImportCount = 0,
    this.splitwiseImportedAt,
  });

  final Trip trip;
  final int joinPreviewCount;

  /// 'yes' | 'no' | 'skip' | null: the closeout "would you use it again?" answer.
  final String? closeoutPulse;
  final int splitwiseImportCount;
  final int? splitwiseImportedAt;

  String get id => trip.id;
}

/// Everything the analytics tabs compute from: every trip, member and (non-deleted) expense on the platform.
class FleetData {
  const FleetData({this.trips = const [], this.members = const {}, this.expenses = const []});

  final List<FleetTrip> trips;
  final Map<String, Member> members;
  final List<Expense> expenses;
}
