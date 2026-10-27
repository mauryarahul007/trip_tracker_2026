import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show AuthException;
import 'package:trip_tracker/core/format/spoken_money.dart';
import 'package:trip_tracker/domain/logic/global_search.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/features/trips/application/sync_wording.dart';
import 'package:trip_tracker/features/trips/application/trips_providers.dart' show SyncStatus;
import 'package:trip_tracker/l10n/app_localizations_en.dart';
import 'package:trip_tracker/shared/widgets/friendly_error.dart';

import '../support/model_builders.dart';

void main() {
  final l10n = AppLocalizationsEn();

  test('sync wording: one vocabulary for every state', () {
    String w(bool online, int pending, int issues) => syncWording(
      l10n,
      online: online,
      status: SyncStatus(pending: pending, issues: issues),
    ).text;
    expect(w(true, 0, 0), 'All synced');
    expect(w(true, 3, 0), 'Syncing 3');
    expect(w(false, 0, 0), 'Offline · all saved');
    expect(w(false, 2, 0), 'Saved on this phone · 2 to sync');
    expect(w(true, 2, 1), '1 needs attention');
    expect(w(false, 0, 2), '2 need attention');
    expect(syncWording(l10n, online: true, status: const SyncStatus(issues: 1)).tone, SyncTone.problem);
  });

  test('friendly error picks the cause and never shows the raw text', () {
    expect(friendlyError(l10n, 'boom', online: false).title, "You're offline");
    expect(friendlyError(l10n, const AuthException('jwt expired'), online: true).title, "You've been signed out");
    final server = friendlyError(l10n, Exception('500 internal'), online: true);
    expect(server.title, "Couldn't load this");
    expect(server.message, isNot(contains('500')));
    expect(friendlyError(l10n, 'x', online: false, clear: false).title, 'Something went wrong');
  });

  test('spoken money drops the visual sign', () {
    expect(spokenMoney('− ₹1,200'), '₹1,200');
    expect(spokenMoney('+ ₹300'), '₹300');
    expect(spokenMoney('-\$5'), '\$5');
    expect(spokenMoney('₹0'), '₹0');
  });

  test('rich search matches place, payer and amount; plain search stays title-only', () {
    final trips = [tripOf('t1', 'Goa')];
    final e = expenseOf(
      'e1',
      't1',
      'Dinner',
    ).copyWith(amount: 1200.5, location: const ExpenseLocation(lat: 0, lng: 0, placeName: 'Baga Beach'));
    final names = {'m1': 'Asha'};
    expect(searchHits('baga', trips, [e], rich: true, memberNames: names).single.detail, contains('Baga Beach'));
    expect(searchHits('asha', trips, [e], rich: true, memberNames: names).single.detail, contains('Paid by Asha'));
    expect(searchHits('1,200', trips, [e], rich: true, memberNames: names), hasLength(1));
    expect(searchHits('1201', trips, [e], rich: true, memberNames: names), isEmpty);
    expect(searchHits('baga', trips, [e], memberNames: names), isEmpty);
    expect(searchHits('dinner', trips, [e], rich: true).single.detail, '2026-10-02');
  });
}
