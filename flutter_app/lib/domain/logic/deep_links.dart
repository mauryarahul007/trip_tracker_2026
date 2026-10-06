/// Where an incoming link (custom scheme or https) should land, plus any
/// marketing attribution it carried. Mirrors the web router + signupAttribution.ts.
class DeepLinkTarget {
  const DeepLinkTarget(this.location, {this.attribution = const {}});
  final String location;
  final Map<String, String> attribution;
}

const _scheme = 'com.triptracker.app';
final _token = RegExp(r'^[A-Za-z0-9._-]{3,64}$');

String? _clean(String? v) {
  final t = v?.trim();
  return (t == null || t.isEmpty) ? null : (t.length > 80 ? t.substring(0, 80) : t);
}

/// Port of `parseSignupAttribution`: utm_* (or `ref` as source), first 80 chars.
Map<String, String> parseSignupAttribution(Map<String, String> query) {
  final out = <String, String>{};
  final source = _clean(query['utm_source']) ?? _clean(query['ref']);
  final medium = _clean(query['utm_medium']);
  final campaign = _clean(query['utm_campaign']);
  if (source != null) out['utm_source'] = source;
  if (medium != null) out['utm_medium'] = medium;
  if (campaign != null) out['utm_campaign'] = campaign;
  return out;
}

/// `com.triptracker.app://join/ABC123`, `https://host/join/ABC123`, etc.
/// Returns null for anything we don't handle (including the OAuth callback,
/// which the Supabase client consumes itself). Unknown hosts are accepted for
/// https because Android/iOS only deliver verified app-link hosts.
DeepLinkTarget? routeForDeepLink(Uri uri) {
  final segments = <String>[
    if (uri.scheme == _scheme && uri.host.isNotEmpty) uri.host,
    ...uri.pathSegments.where((s) => s.isNotEmpty),
  ];
  if (segments.isEmpty) return null;
  final attribution = parseSignupAttribution(uri.queryParameters);

  switch (segments.first) {
    case 'join':
    case 'share':
    case 'live':
      if (segments.length < 2 || !_token.hasMatch(segments[1])) return null;
      final id = segments.first == 'join' ? segments[1].toUpperCase() : segments[1];
      return DeepLinkTarget('/${segments.first}/$id', attribution: attribution);
    case 'reset-password':
      return DeepLinkTarget('/reset-password', attribution: attribution);
    default:
      return null;
  }
}
