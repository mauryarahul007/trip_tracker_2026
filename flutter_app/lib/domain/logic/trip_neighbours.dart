/// The trip before and after [id] in [orderedIds] (the order the Trips list shows), or null at either end.
({String? previous, String? next}) tripNeighbours(List<String> orderedIds, String id) {
  final i = orderedIds.indexOf(id);
  if (i < 0) return (previous: null, next: null);
  return (previous: i > 0 ? orderedIds[i - 1] : null, next: i < orderedIds.length - 1 ? orderedIds[i + 1] : null);
}
