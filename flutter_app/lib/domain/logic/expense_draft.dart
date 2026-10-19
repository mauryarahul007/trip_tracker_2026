import 'dart:convert';

/// Port of src/utils/expenseDraft.ts: unsent form state survives for 24 h.
const draftTtl = Duration(hours: 24);

abstract class KeyValueStore {
  String? getString(String key);
  Future<void> setString(String key, String value);
  Future<void> remove(String key);
}

Future<void> saveDraft(KeyValueStore store, String key, Map<String, dynamic> data, DateTime now) =>
    store.setString(key, jsonEncode({'savedAt': now.millisecondsSinceEpoch, 'data': data}));

/// The stored draft, or null if missing, malformed or older than the TTL
/// (unusable drafts are removed).
Future<Map<String, dynamic>?> loadDraft(KeyValueStore store, String key, DateTime now) async {
  final raw = store.getString(key);
  if (raw == null || raw.isEmpty) return null;
  try {
    final parsed = jsonDecode(raw);
    if (parsed is Map) {
      final savedAt = parsed['savedAt'];
      final data = parsed['data'];
      if (savedAt is num && data is Map && now.millisecondsSinceEpoch - savedAt <= draftTtl.inMilliseconds) {
        return Map<String, dynamic>.from(data);
      }
    }
  } catch (_) {
    // fall through to removal
  }
  await store.remove(key);
  return null;
}
