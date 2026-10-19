import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/back_exit.dart';
import 'package:trip_tracker/domain/logic/tab_trail.dart';

void main() {
  group('tab trail (parity with tabTrail.ts)', () {
    test('records the tab you left, ignores no-op switches', () {
      expect(pushTab(<String>[], 'a', 'b'), ['a']);
      expect(pushTab(['a'], 'b', 'b'), ['a']);
    });

    test('stops recording once the cap is reached (keeps the oldest steps)', () {
      var t = <int>[];
      for (var i = 0; i < 9; i++) {
        t = pushTab(t, i, i + 1);
      }
      expect(t, [0, 1, 2, 3, 4]);
      expect(t.length, maxTabTrail);
    });

    test('pop returns the last step, or nothing when empty', () {
      final r = popTab(['a', 'b']);
      expect(r.tab, 'b');
      expect(r.trail, ['a']);
      final e = popTab(<String>[]);
      expect(e.tab, isNull);
      expect(e.trail, isEmpty);
    });

    test('does not mutate its input', () {
      final t = ['a'];
      pushTab(t, 'b', 'c');
      popTab(t);
      expect(t, ['a']);
    });
  });

  group('double back exit (parity with doubleBackExit.ts)', () {
    final t0 = DateTime(2026, 1, 1, 12);
    test('second press inside the window exits', () {
      expect(isSecondBackPress(t0, t0.add(const Duration(milliseconds: 1500))), isTrue);
      expect(isSecondBackPress(t0, t0.add(exitWindow)), isTrue);
    });
    test('first press, or one after the window, only shows the hint', () {
      expect(isSecondBackPress(null, t0), isFalse);
      expect(isSecondBackPress(t0, t0.add(const Duration(milliseconds: 2001))), isFalse);
    });
  });
}
