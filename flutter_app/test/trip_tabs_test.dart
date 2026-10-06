import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/features/trip_details/domain/trip_tabs.dart';

void main() {
  group('Trip Tabs Domain Logic (Parity with web tripTabs.test.ts)', () {
    test('visibleTripTabs: default when chat-first nav is false and notes tab is true', () {
      final tabs = visibleTripTabs(isChatFirstNav: false, showNotesTab: true);
      expect(
        tabs,
        equals([
          TripNavTab.expenses,
          TripNavTab.ledger,
          TripNavTab.members,
          TripNavTab.notes,
        ]),
      );
    });

    test('visibleTripTabs: chat-first nav enabled and notes tab false', () {
      final tabs = visibleTripTabs(isChatFirstNav: true, showNotesTab: false);
      expect(
        tabs,
        equals([
          TripNavTab.chat,
          TripNavTab.expenses,
          TripNavTab.ledger,
          TripNavTab.members,
        ]),
      );
    });

    test('visibleTripTabs: chat-first nav enabled and notes tab true', () {
      final tabs = visibleTripTabs(isChatFirstNav: true, showNotesTab: true);
      expect(
        tabs,
        equals([
          TripNavTab.chat,
          TripNavTab.expenses,
          TripNavTab.ledger,
          TripNavTab.members,
          TripNavTab.notes,
        ]),
      );
    });

    test('showNotesNavTab logic rules', () {
      // Notes is on if isNotesEnabled is true
      expect(
        showNotesNavTab(
          isNotesEnabled: true,
          isPassesEnabled: false,
          isTripChatEnabled: false,
          isChatFirstNav: false,
        ),
        isTrue,
      );

      // Notes is on if isPassesEnabled is true
      expect(
        showNotesNavTab(
          isNotesEnabled: false,
          isPassesEnabled: true,
          isTripChatEnabled: false,
          isChatFirstNav: false,
        ),
        isTrue,
      );

      // Notes is on if trip chat is enabled and not chat-first nav (chat needs a home)
      expect(
        showNotesNavTab(
          isNotesEnabled: false,
          isPassesEnabled: false,
          isTripChatEnabled: true,
          isChatFirstNav: false,
        ),
        isTrue,
      );

      // Notes is off if only chat is enabled but chat-first nav is true
      expect(
        showNotesNavTab(
          isNotesEnabled: false,
          isPassesEnabled: false,
          isTripChatEnabled: true,
          isChatFirstNav: true,
        ),
        isFalse,
      );
    });
  });
}
