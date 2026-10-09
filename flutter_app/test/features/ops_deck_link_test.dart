import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/repositories/repositories.dart';
import 'package:trip_tracker/features/admin/ops_deck_link.dart';

void main() {
  final base = Uri.parse('https://example.github.io/trip_tracker_2026/');

  test('carries the session in the fragment, without type= (recovery would open reset-password)', () {
    final u = opsDeckUri(base, const AuthTokens(accessToken: 'a.b+c', refreshToken: 'r-1', expiresIn: 3600));
    expect(u.origin + u.path, 'https://example.github.io/trip_tracker_2026/');
    expect(u.query, isEmpty); // tokens never go in the query string (servers and logs see queries)
    final f = Uri.splitQueryString(u.fragment);
    expect(f, {'access_token': 'a.b+c', 'refresh_token': 'r-1', 'expires_in': '3600', 'token_type': 'bearer'});
    expect(f.containsKey('type'), isFalse);
  });

  test('no session -> the plain web URL (the portal then asks for a sign-in)', () {
    expect(opsDeckUri(base, null), base);
  });
}
