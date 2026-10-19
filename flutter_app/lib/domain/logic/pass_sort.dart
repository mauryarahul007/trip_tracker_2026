import '../models/travel_pass.dart';

enum PassSort { time, leg, name }

/// Passenger for display/sort: `passengerName`, else the title text before ' · '.
String passPassenger(TravelPass p) {
  final n = p.passengerName?.trim();
  return n != null && n.isNotEmpty ? n : p.title.split(' · ').first.trim();
}

/// Leg key shared by every passenger on one flight/route ('' when unknown).
String passLeg(TravelPass p) {
  final id = p.legIdentifier?.trim();
  if (id != null && id.isNotEmpty) return id;
  final o = p.origin?.trim() ?? '', d = p.destination?.trim() ?? '';
  return o.isEmpty && d.isEmpty ? '' : '$o → $d';
}

int _time(TravelPass a, TravelPass b) {
  final x = a.startDateTime, y = b.startDateTime;
  if (x == null || x.isEmpty) return (y == null || y.isEmpty) ? 0 : 1; // undated last
  if (y == null || y.isEmpty) return -1;
  return x.compareTo(y); // ISO-8601 strings sort chronologically
}

int _last(String a, String b) => a.isEmpty ? (b.isEmpty ? 0 : 1) : (b.isEmpty ? -1 : 0); // blanks last

/// Returns a sorted copy; stored order is never changed. Ties keep original order (stable).
List<TravelPass> sortPasses(List<TravelPass> passes, PassSort mode) {
  int cmp(TravelPass a, TravelPass b) {
    switch (mode) {
      case PassSort.time:
        return _time(a, b);
      case PassSort.leg:
        final la = passLeg(a), lb = passLeg(b);
        final blank = _last(la, lb);
        if (blank != 0) return blank;
        final byTime = _time(a, b);
        if (byTime != 0) return byTime;
        final byLeg = la.compareTo(lb);
        return byLeg != 0 ? byLeg : passPassenger(a).toLowerCase().compareTo(passPassenger(b).toLowerCase());
      case PassSort.name:
        final na = passPassenger(a), nb = passPassenger(b);
        final blank = _last(na, nb);
        if (blank != 0) return blank;
        final byName = na.toLowerCase().compareTo(nb.toLowerCase());
        return byName != 0 ? byName : _time(a, b);
    }
  }

  final indexed = [for (var i = 0; i < passes.length; i++) (i, passes[i])];
  indexed.sort((a, b) {
    final c = cmp(a.$2, b.$2);
    return c != 0 ? c : a.$1.compareTo(b.$1);
  });
  return [for (final e in indexed) e.$2];
}
