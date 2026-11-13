import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/storage/prefs.dart';
import '../../../domain/models/itinerary_item.dart';

class TripItineraryNotifier extends Notifier<List<ItineraryItem>> {
  TripItineraryNotifier(this.tripId);
  final String tripId;

  String get _key => 'trip.itinerary.$tripId';

  @override
  List<ItineraryItem> build() {
    final p = ref.read(sharedPreferencesProvider);
    final raw = p.getString(_key);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded.map((e) => ItineraryItem.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<void> _persist(List<ItineraryItem> items) async {
    state = items;
    final p = ref.read(sharedPreferencesProvider);
    if (items.isEmpty) {
      await p.remove(_key);
    } else {
      final encoded = jsonEncode(items.map((e) => e.toJson()).toList());
      await p.setString(_key, encoded);
    }
  }

  Future<ItineraryItem> add({
    required String date,
    String? time,
    required String title,
    String category = 'activity',
    String? location,
    String? notes,
    double? costEstimate,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final item = ItineraryItem(
      id: const Uuid().v4(),
      tripId: tripId,
      date: date,
      time: time,
      title: title,
      category: category,
      location: location,
      notes: notes,
      costEstimate: costEstimate,
      createdAt: now,
      updatedAt: now,
    );
    await _persist([...state, item]);
    return item;
  }

  Future<void> update(String id, {
    String? title,
    String? date,
    String? time,
    String? category,
    String? location,
    String? notes,
    double? costEstimate,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final updated = state.map((i) {
      if (i.id != id) return i;
      return i.copyWith(
        title: title,
        date: date,
        time: time,
        category: category,
        location: location,
        notes: notes,
        costEstimate: costEstimate,
        updatedAt: now,
      );
    }).toList();
    await _persist(updated);
  }

  Future<void> toggle(String id) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final updated = state.map((i) {
      if (i.id != id) return i;
      return i.copyWith(completed: !i.completed, updatedAt: now);
    }).toList();
    await _persist(updated);
  }

  Future<void> delete(String id) async {
    final updated = state.where((i) => i.id != id).toList();
    await _persist(updated);
  }
}

final tripItineraryProvider = NotifierProvider.family<TripItineraryNotifier, List<ItineraryItem>, String>(
  TripItineraryNotifier.new,
);
