/// Port of src/utils/tabTrail.ts: back-steps between tabs inside a trip.
const maxTabTrail = 5;

/// Records [from] as a back-step when the tab changes. Past [max], further
/// switches are not recorded (the oldest steps are kept, like the web).
List<T> pushTab<T>(List<T> trail, T from, T to, {int max = maxTabTrail}) {
  if (from == to || trail.length >= max) return List<T>.of(trail);
  return [...trail, from];
}

({T? tab, List<T> trail}) popTab<T>(List<T> trail) =>
    trail.isEmpty ? (tab: null, trail: <T>[]) : (tab: trail.last, trail: trail.sublist(0, trail.length - 1));
