import '../models/admin.dart';
import '../models/admin_fleet.dart';

/// Thrown when the signed-in account may not use the portal (RLS or no backend).
class AdminUnavailable implements Exception {
  const AdminUnavailable([this.message = 'The Superadmin portal needs a signed-in superadmin and a connection.']);
  final String message;
  @override
  String toString() => message;
}

/// Superadmin portal data: the native counterpart of the web Ops Deck (bugs, users, trips, flags).
abstract class AdminRepository {
  Future<List<AdminBug>> bugs();
  Future<AdminBug?> bug(String id);
  Future<AdminBug?> updateBug(
    String id, {
    String? status,
    String? severity,
    String? assignee,
    String? resolutionNote,
    required String resolvedBy,
  });

  /// Files a bug as the superadmin; returns its case id (e.g. BUG-282).
  Future<String> createBug({
    required String title,
    required String description,
    required String severity,
    required String category,
    required Map<String, Object?> environment,
  });

  Future<List<AdminUser>> users();
  Future<void> setUserBanned(String userId, bool banned);
  Future<void> deleteUser(String userId);
  Future<int> broadcast(String title, String body);

  Future<List<AdminTrip>> trips();
  Future<void> setTripFrozen(AdminTrip trip, bool frozen);
  Future<void> setTripArchived(AdminTrip trip, bool archived);
  Future<void> deleteTrip(AdminTrip trip);

  Future<List<FlagOverride>> flagOverrides();

  /// [value] null clears the override at that scope.
  Future<void> setFlagOverride(String scope, String scopeId, String flagKey, bool? value);

  // --- Controls (app_config) --------------------------------------------------------------------------------
  Future<AdminConfig> appConfig();

  /// [value] null clears the key (a cleared maintenance window, an empty landing line).
  Future<void> setAppConfig(String key, Object? value);

  // --- Audit ------------------------------------------------------------------------------------------------
  Future<List<AuditEntry>> auditLogs({int limit = 200});
  Future<int> purgeAuditLogs(int olderThanDays);

  // --- Feature roadmap --------------------------------------------------------------------------------------
  Future<List<AdminFeature>> features();
  Future<String> createFeature({required String title, required String description, required String category});
  Future<AdminFeature?> updateFeature(
    String id, {
    String? status,
    String? category,
    String? shippedNote,
    String? shippedBy,
    String? linkedFlagKey,
  });
  Future<void> deleteFeature(String id);

  // --- Analytics --------------------------------------------------------------------------------------------
  Future<NotificationStats> notificationStats();
  Future<Map<String, int>> devicePlatformCounts();
  Future<List<RetentionCohort>> retentionCohorts({int weeks = 8});
  Future<({int eligible, int repeat})> repeatCreatorRate();
  Future<List<ReliabilityGroup>> reliability({int days = 14});

  /// Every trip, member and non-deleted expense on the platform (for the growth and spend analytics).
  Future<FleetData> fleet();

  // --- Tools ------------------------------------------------------------------------------------------------
  Future<int> recycledExpenseCount();
  Future<int> purgeRecycleBin(int olderThanDays);
  Future<void> changePassword(String newPassword);
  Future<List<ServiceCheck>> pingServices();
}
