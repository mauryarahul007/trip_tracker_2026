import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/platform/feedback.dart';
import 'package:trip_tracker/core/platform/haptics.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final calls = <String>[];

  setUp(() {
    calls.clear();
    AppHaptics.enabled = true;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'SystemSound.play') calls.add('sound:${call.arguments}');
        if (call.method == 'HapticFeedback.vibrate') calls.add('haptic:${call.arguments}');
        return null;
      },
    );
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      null,
    );
    AppFeedback.packOn = true;
    AppFeedback.sound = false;
  });

  test('sound is off until switched on: success gives a haptic only', () async {
    AppFeedback.success();
    await Future<void>.delayed(Duration.zero);
    expect(calls.where((c) => c.startsWith('sound')), isEmpty);
    expect(calls.where((c) => c.startsWith('haptic')), isNotEmpty);
  });

  test('with sound on, success and tap add a soft click', () async {
    AppFeedback.sound = true;
    AppFeedback.success();
    AppFeedback.tap();
    await Future<void>.delayed(Duration.zero);
    expect(calls.where((c) => c.startsWith('sound')).length, 2);
  });

  test('with the pack off, saved and tap do nothing and success keeps only its old haptic', () async {
    AppFeedback.packOn = false;
    AppFeedback.sound = true;
    AppFeedback.saved();
    AppFeedback.tap();
    await Future<void>.delayed(Duration.zero);
    expect(calls, isEmpty);
    AppFeedback.success();
    await Future<void>.delayed(Duration.zero);
    expect(calls.where((c) => c.startsWith('sound')), isEmpty);
    expect(calls.where((c) => c.startsWith('haptic')), isNotEmpty);
  });
}
