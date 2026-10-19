import 'dart:convert';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

class StorageUsage {
  const StorageUsage({required this.dataBytes, required this.cacheBytes});
  final int dataBytes;
  final int cacheBytes;
  int get totalBytes => dataBytes + cacheBytes;
}

/// Disk usage of the app on this phone. Behind an interface so widget tests need no real filesystem.
abstract class StorageGateway {
  Future<StorageUsage> usage();

  /// Deletes only re-downloadable cache; trips, expenses and receipts waiting to upload are never touched.
  Future<void> clearCache();
}

class DeviceStorageGateway implements StorageGateway {
  const DeviceStorageGateway();

  @override
  Future<StorageUsage> usage() async => StorageUsage(
    dataBytes: await _size(await getApplicationDocumentsDirectory()),
    cacheBytes: await _size(await getTemporaryDirectory()),
  );

  @override
  Future<void> clearCache() async {
    final dir = await getTemporaryDirectory();
    if (!dir.existsSync()) return;
    for (final e in dir.listSync()) {
      try {
        e.deleteSync(recursive: true);
      } catch (_) {
        // A file in use stays; the next clear gets it.
      }
    }
  }

  Future<int> _size(Directory d) async {
    if (!d.existsSync()) return 0;
    var total = 0;
    await for (final e in d.list(recursive: true, followLinks: false)) {
      if (e is File) total += await e.length();
    }
    return total;
  }
}

final storageGatewayProvider = Provider<StorageGateway>((ref) => const DeviceStorageGateway());

final storageUsageProvider = FutureProvider.autoDispose<StorageUsage>(
  (ref) => ref.watch(storageGatewayProvider).usage(),
);

String formatBytes(int bytes) {
  if (bytes < 1024) return '$bytes B';
  if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
  if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
}

/// A small sample trip in the backup format, so [BackupService.restore] creates it like any imported trip.
/// Dates are relative to [now] so it always looks current.
String buildDemoBackupJson(DateTime now) {
  String day(int offset) => now.add(Duration(days: offset)).toIso8601String().substring(0, 10);
  const members = ['demo-m1', 'demo-m2', 'demo-m3'];
  Map<String, dynamic> expense(String id, String title, double amount, String category, String paidBy, int dayOffset) =>
      {
        'id': id,
        'tripId': 'demo-trip',
        'title': title,
        'amount': amount,
        'currency': 'INR',
        'category': category,
        'date': day(dayOffset),
        'paidBy': paidBy,
        'splitMode': 'equal',
        'splitMemberIds': members,
        'resolvedShares': {for (final m in members) m: amount / members.length},
      };
  return jsonEncode({
    'trips': [
      {
        'id': 'demo-trip',
        'name': 'Goa Weekend (Demo)',
        'destination': 'Goa',
        'startDate': day(0),
        'endDate': day(3),
        'baseCurrency': 'INR',
        'ownerId': 'demo-owner',
        'memberIds': members,
      },
    ],
    'members': [
      {'id': 'demo-m1', 'name': 'You', 'tripId': 'demo-trip'},
      {'id': 'demo-m2', 'name': 'Asha', 'tripId': 'demo-trip'},
      {'id': 'demo-m3', 'name': 'Rohan', 'tripId': 'demo-trip'},
    ],
    'expenses': [
      expense('demo-e1', 'Beach shack lunch', 2400, 'Food', 'demo-m1', 0),
      expense('demo-e2', 'Scooter rental', 1800, 'Transport', 'demo-m2', 1),
      expense('demo-e3', 'Homestay', 9000, 'Stay', 'demo-m3', 1),
      expense('demo-e4', 'Sunset cruise', 3600, 'Activities', 'demo-m2', 2),
    ],
  });
}
