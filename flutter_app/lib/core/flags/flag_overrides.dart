import 'dart:async';
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../domain/repositories/repositories.dart';

const _key = 'debug.flag_overrides';

/// Local QA toggles (dev and staging builds only; the provider never wraps in prod).
class FlagOverrideStore {
  FlagOverrideStore(this._prefs) {
    final raw = _prefs.getString(_key);
    if (raw != null) {
      try {
        _map.addAll((jsonDecode(raw) as Map).cast<String, bool>());
      } catch (_) {
        // Corrupt value: start clean.
      }
    }
  }

  final SharedPreferences _prefs;
  final _map = <String, bool>{};
  final _changes = StreamController<void>.broadcast();

  Map<String, bool> get all => Map.unmodifiable(_map);
  Stream<void> get changes => _changes.stream;

  /// null clears the override (back to the server value).
  Future<void> set(String flag, bool? value) async {
    if (value == null) {
      _map.remove(flag);
    } else {
      _map[flag] = value;
    }
    await _prefs.setString(_key, jsonEncode(_map));
    _changes.add(null);
  }

  Future<void> clear() async {
    _map.clear();
    await _prefs.remove(_key);
    _changes.add(null);
  }
}

class OverridableFlagsRepository implements FlagsRepository {
  OverridableFlagsRepository(this._inner, this._store);

  final FlagsRepository _inner;
  final FlagOverrideStore _store;

  @override
  Future<void> refresh({String? tripId}) => _inner.refresh(tripId: tripId);

  @override
  Stream<bool> watch(String key, {String? tripId}) {
    // ignore: close_sinks
    late StreamController<bool> c;
    StreamSubscription<bool>? a;
    StreamSubscription<void>? b;
    bool? server;
    void emit() {
      final o = _store.all[key];
      final v = o ?? server;
      if (v != null) c.add(v);
    }

    c = StreamController<bool>(
      onListen: () {
        a = _inner.watch(key, tripId: tripId).listen((v) {
          server = v;
          emit();
        });
        b = _store.changes.listen((_) => emit());
      },
      onCancel: () async {
        await a?.cancel();
        await b?.cancel();
      },
    );
    return c.stream.distinct();
  }
}
