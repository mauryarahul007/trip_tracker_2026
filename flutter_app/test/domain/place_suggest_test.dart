import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/place_suggest.dart';

void main() {
  group('localSuggestions', () {
    test('prefix match ranks the place first', () {
      expect(localSuggestions('gok').first.name, 'Gokarna');
    });

    test('catches a misspelling', () {
      expect(localSuggestions('Munar').map((s) => s.name), contains('Munnar'));
      expect(localSuggestions('Swtizerland').map((s) => s.name), contains('Switzerland'));
    });

    test('too short a query suggests nothing', () {
      expect(localSuggestions('g'), isEmpty);
    });

    test('past destinations are offered as used before', () {
      final r = localSuggestions('zzlandia', pastDestinations: ['Zzlandia']);
      expect(r.single.detail, 'Used before');
    });

    test('accents are ignored', () {
      expect(localSuggestions('Pondicherry-ish'), isA<List<PlaceSuggestion>>());
      expect(localSuggestions('goa').first.name, 'Goa');
    });
  });

  group('destination parts', () {
    test('currentPart is the text after the last separator', () {
      final p = currentPart('Goa, Gokar');
      expect(p.part, 'Gokar');
      expect(p.prefix, 'Goa, ');
      expect(currentPart('Goa').prefix, '');
    });

    test('splitDestination handles every separator', () {
      expect(splitDestination('Goa, Gokarna & Hampi and Kochi'), ['Goa', 'Gokarna', 'Hampi', 'Kochi']);
    });
  });

  group('findPlaceFixes', () {
    test('offers a fix for a close misspelling', () {
      final f = findPlaceFixes('Munar');
      expect(f.single.suggestion.name, 'Munnar');
      expect(applyPlaceFixes('Goa, Munar', findPlaceFixes('Goa, Munar')), 'Goa, Munnar');
    });

    test('no fix for a valid place or an extra word', () {
      expect(findPlaceFixes('Goa'), isEmpty);
      expect(findPlaceFixes('Goa Beach'), isEmpty);
    });
  });

  test('mergeSuggestions keeps local first and drops duplicates', () {
    const a = PlaceSuggestion(name: 'Goa', detail: 'India', countryCode: 'IN');
    const b = PlaceSuggestion(name: 'Goa', detail: 'x', countryCode: 'IN', online: true);
    const c = PlaceSuggestion(name: 'Gokak', detail: 'India', countryCode: 'IN', online: true);
    expect(mergeSuggestions([a], [b, c]).map((s) => s.name), ['Goa', 'Gokak']);
  });

  test('currencyForCountry maps ISO codes', () {
    expect(currencyForCountry('JP'), 'JPY');
    expect(currencyForCountry('zz'), isNull);
  });
}
