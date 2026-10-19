import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/expense_quick_parser.dart';

void main() {
  test('spoken amounts become digits; small words stay words', () {
    expect(normalizeSpokenNumbers('five hundred rupees lunch'), '500 rupees lunch');
    expect(normalizeSpokenNumbers('two thousand five hundred taxi'), '2500 taxi');
    expect(normalizeSpokenNumbers('paanch sau chai'), '500 chai');
    expect(normalizeSpokenNumbers('dedh hazaar hotel'), '1500 hotel');
    expect(normalizeSpokenNumbers('dhai sau auto'), '250 auto');
    expect(normalizeSpokenNumbers('two hundred and fifty dinner'), '250 dinner');
    expect(normalizeSpokenNumbers('a hundred snacks'), '100 snacks');
    expect(normalizeSpokenNumbers('twenty rupees tea'), '20 rupees tea');
    expect(normalizeSpokenNumbers('one coffee'), 'one coffee');
    expect(normalizeSpokenNumbers('lunch 500'), 'lunch 500');
    expect(normalizeSpokenNumbers('so far so good'), 'so far so good');
  });
}
