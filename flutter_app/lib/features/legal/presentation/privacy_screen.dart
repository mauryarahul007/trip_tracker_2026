import 'package:flutter/material.dart';

import 'legal_doc_screen.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const LegalDocScreen(
      title: 'Privacy Policy',
      fullUrl: 'https://trip-tracker.blackmaroon.in/privacy',
      fullKey: Key('legal-full-privacy'),
      sections: [
        LegalSection(
          body:
              'Trip Tracker respects your personal privacy. We only collect the minimal information necessary to sync your trip expenses, itineraries, and receipts across your devices and with your designated travel companions.',
        ),
        LegalSection(
          heading: 'Data We Store',
          bodyHeight: 1.6,
          body:
              '• Account email and name\n• Trip details, categories, currencies, and timestamps\n• Expenses, splits, and settlement transaction logs\n• Uploaded receipt images and notes',
        ),
        LegalSection(
          heading: 'Your Rights',
          body:
              'You can request complete deletion of your account and all associated personal data at any time from Settings or via the Delete Account option.',
        ),
      ],
    );
  }
}
