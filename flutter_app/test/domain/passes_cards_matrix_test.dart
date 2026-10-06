import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/passes_and_chat_cards.dart';

void main() {
  final m = (jsonDecode(File('../docs/flutter-migration/fixtures/passes_chat_cards.json').readAsStringSync())
      as Map<String, dynamic>)['matrices'] as Map<String, dynamic>;
  List<Map<String, dynamic>> cases(String k) => [for (final c in m[k] as List) c as Map<String, dynamic>];

  test('resolveAirportCode matrix', () {
    for (final c in cases('airports')) {
      expect(resolveAirportCode(c['input'] as String), c['result'], reason: '${c['input']}');
    }
  });

  test('cleanPassengerName matrix', () {
    for (final c in cases('passengers')) {
      expect(cleanPassengerName(c['input'] as String), c['result'], reason: '${c['input']}');
    }
  });

  test('buildPassStub matrix (solo and group)', () {
    for (final c in cases('stubs')) {
      final input = Map<String, dynamic>.from(c['input'] as Map<String, dynamic>);
      final g = input['group'] as Map<String, dynamic>?;
      if (g != null) {
        input['group'] = PassStubGroup(
          name: g['name'] as String,
          balance: (g['balance'] as num).toDouble(),
          otherMemberNames: List<String>.from(g['otherMemberNames'] as List),
        );
      }
      final got = buildPassStub(input, (a) => '\$${a.toStringAsFixed(2)}').toJson();
      expect(got, c['result'], reason: jsonEncode(c['input']));
    }
  });

  test('chat card presentation for every kind', () {
    for (final c in cases('cards')) {
      final got = getChatExpenseCardPresentation(c['kind'] as String, c['isMine'] as bool, 'Alice').toJson();
      expect(got, c['result'], reason: '${c['kind']} ${c['isMine']}');
    }
  });

  test('expense event bodies for every kind', () {
    for (final c in cases('bodies')) {
      expect(expenseEventBody(c['kind'] as String, Map<String, dynamic>.from(c['expense'] as Map<String, dynamic>)), c['result'],
          reason: '${c['kind']}');
    }
  });
}
