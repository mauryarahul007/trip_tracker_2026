import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/env/app_env.dart';

void main() {
  group('AppEnv', () {
    test('Default load provides dev flavor configuration', () {
      final env = AppEnv.load();
      expect(env.flavor, equals(AppFlavor.dev));
      expect(env.isDev, isTrue);
      expect(env.isStaging, isFalse);
      expect(env.isProd, isFalse);
      expect(env.appName, contains('Trip Tracker'));
      expect(env.supabaseUrl, isNotEmpty);
      expect(env.supabaseAnonKey, isNotEmpty);
    });
  });
}
