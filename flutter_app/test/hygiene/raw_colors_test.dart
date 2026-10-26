import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Ratchet for A12/B14: new screens use theme tokens or `AppColors`, not fresh `Color(0x…)` literals.
/// The number may only go down. Lower [allowed] when you remove some; never raise it, add a token instead.
const allowed = 155;

void main() {
  test('raw Color(0x…) literals outside the theme only go down', () {
    final hits = <String>[];
    for (final f in Directory('lib').listSync(recursive: true).whereType<File>()) {
      final p = f.path.replaceAll('\\', '/');
      if (!p.endsWith('.dart') || p.endsWith('.g.dart') || p.contains('/theme/') || p.contains('/admin/')) continue;
      final lines = f.readAsLinesSync();
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].contains('Color(0x')) hits.add('$p:${i + 1}');
      }
    }
    expect(
      hits.length,
      lessThanOrEqualTo(allowed),
      reason:
          'Found ${hits.length} raw colours (allowed $allowed). Use context.tokens or AppColors. Newest:\n${hits.reversed.take(8).join('\n')}',
    );
  });
}
