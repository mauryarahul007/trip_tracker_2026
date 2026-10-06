import '../models/expense.dart';
import '../models/trip.dart';

String getMemberRole(Trip? trip, String? memberId) {
  if (trip == null || memberId == null) return 'contributor';

  if (trip.memberRoles.containsKey(memberId)) {
    return trip.memberRoles[memberId]!;
  }

  if (trip.adminMemberIds.contains(memberId)) {
    return 'organizer';
  }

  if (trip.memberIds.isNotEmpty && trip.memberIds.first == memberId) {
    return 'organizer';
  }

  return 'contributor';
}

bool isViewerRole(Trip? trip, String? memberId, [bool isTripAdmin = false]) {
  if (isTripAdmin) return false;
  if (trip == null || memberId == null) return false;
  return getMemberRole(trip, memberId) == 'viewer';
}

bool canAddExpense(Trip? trip, String? memberId, [bool isTripAdmin = false]) {
  if (isTripAdmin) return true;
  if (trip == null) return false;
  if (trip.closed || trip.frozen || trip.archived) return false;
  if (memberId == null) return true;
  final role = getMemberRole(trip, memberId);
  return role == 'organizer' || role == 'contributor';
}

bool canEditExpense(
  Expense? expense,
  Trip? trip,
  String? memberId,
  String? userId, [
  bool isTripAdmin = false,
]) {
  if (isTripAdmin) return true;
  if (trip == null || expense == null) return false;
  if (trip.closed || trip.frozen || trip.archived) return false;
  if (memberId == null) return true;

  final role = getMemberRole(trip, memberId);
  if (role == 'organizer') return true;
  if (role == 'viewer') return false;

  final isPayer = expense.paidBy == memberId;
  final isCreator = userId != null && expense.createdByUserId == userId;
  return isPayer || isCreator;
}

bool canManageTrip(Trip? trip, String? memberId, [bool isTripAdmin = false]) {
  if (isTripAdmin) return true;
  if (trip == null) return false;
  if (memberId == null) return isTripAdmin;
  return getMemberRole(trip, memberId) == 'organizer';
}
