import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Domain layer must stay pure Dart: no Flutter, Drift or Supabase imports.
void main() {
  test('lib/domain has no package:flutter / drift / supabase imports', () {
    final bad = <String>[];
    for (final f in Directory('lib/domain').listSync(recursive: true).whereType<File>()) {
      if (!f.path.endsWith('.dart')) continue;
      for (final line in f.readAsLinesSync()) {
        if (RegExp(r'''import\s+['"]package:(flutter|drift|supabase_flutter|flutter_riverpod)''').hasMatch(line)) {
          bad.add('${f.path}: $line');
        }
      }
    }
    expect(bad, isEmpty);
  });
}
