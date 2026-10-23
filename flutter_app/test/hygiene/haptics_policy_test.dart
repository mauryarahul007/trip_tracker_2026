import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/core/platform/haptics.dart';
import 'package:trip_tracker/features/expenses/presentation/widgets/amount_keypad.dart';
import 'package:trip_tracker/l10n/app_localizations.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';

void main() {
  tearDown(() => AppHaptics.level = HapticsLevel.all);

  test('nothing outside core/platform calls HapticFeedback directly (it would ignore the Haptics setting)', () {
    final hits = [
      for (final f in Directory('lib').listSync(recursive: true).whereType<File>())
        if (f.path.endsWith('.dart') && !f.path.replaceAll('\\', '/').contains('lib/core/platform/'))
          if (f.readAsStringSync().contains('HapticFeedback.')) f.path,
    ];
    expect(hits, isEmpty, reason: 'Use AppHaptics.selection/light/medium/... instead: $hits');
  });

  testWidgets('a keypad key vibrates at the All level and stays silent when haptics are off', (tester) async {
    var buzzes = 0;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'HapticFeedback.vibrate') buzzes++;
      return null;
    });
    addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: AmountKeypad(initial: '', onChanged: (_) {}),
        ),
      ),
    );
    await tester.tap(find.text('7'));
    await tester.pump();
    expect(buzzes, 1);

    AppHaptics.level = HapticsLevel.off;
    await tester.tap(find.text('8'));
    await tester.pump();
    expect(buzzes, 1);
  });
}
