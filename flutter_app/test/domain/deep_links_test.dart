import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/deep_links.dart';

void main() {
  String? loc(String url) => routeForDeepLink(Uri.parse(url))?.location;

  test('custom scheme and https links map to the same routes', () {
    expect(loc('com.triptracker.app://join/abc123'), '/join/ABC123'); // codes are case-insensitive
    expect(loc('https://trip-tracker.blackmaroon.in/join/abc123'), '/join/ABC123');
    expect(loc('com.triptracker.app://share/8f3a-uuid-1234'), '/share/8f3a-uuid-1234'); // tokens keep case
    expect(loc('https://trip-tracker.blackmaroon.in/live/TokEn_9'), '/live/TokEn_9');
    expect(loc('com.triptracker.app://reset-password'), '/reset-password');
    expect(loc('https://trip-tracker.blackmaroon.in/reset-password'), '/reset-password');
  });

  test('anything else is ignored (OAuth callback, unknown paths, junk ids)', () {
    expect(loc('com.triptracker.app://auth-callback?code=x'), isNull);
    expect(loc('https://trip-tracker.blackmaroon.in/'), isNull);
    expect(loc('https://trip-tracker.blackmaroon.in/admin'), isNull);
    expect(loc('com.triptracker.app://join'), isNull);
    expect(loc('com.triptracker.app://join/a'), isNull); // too short
    // Path tricks are normalised away by Uri; the result is always a clean /join/<token>.
    expect(loc('com.triptracker.app://join/../../etc'), matches(RegExp(r'^/join/[A-Za-z0-9._-]+$')));
    expect(loc('com.triptracker.app://join/%3Cscript%3E'), isNull);
  });

  test('attribution: utm_* or ref as source, trimmed to 80 chars, first match wins', () {
    final t = routeForDeepLink(
      Uri.parse('https://x/join/ABC123?utm_source=wa&utm_medium=chat&utm_campaign=${'c' * 100}&ref=ignored'),
    )!;
    expect(t.attribution['utm_source'], 'wa');
    expect(t.attribution['utm_medium'], 'chat');
    expect(t.attribution['utm_campaign'], 'c' * 80);
    expect(routeForDeepLink(Uri.parse('https://x/join/ABC123?ref=invite'))!.attribution, {'utm_source': 'invite'});
    expect(routeForDeepLink(Uri.parse('https://x/join/ABC123'))!.attribution, isEmpty);
    expect(parseSignupAttribution({'utm_source': '  '}), isEmpty);
  });
}
