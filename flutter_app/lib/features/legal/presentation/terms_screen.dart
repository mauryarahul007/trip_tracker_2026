import 'package:flutter/material.dart';

import 'legal_doc_screen.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const LegalDocScreen(
      title: 'Terms of Service',
      fullUrl: 'https://trip-tracker.blackmaroon.in/terms',
      fullKey: Key('legal-full-terms'),
      sections: [
        LegalSection(body: 'By using Trip Tracker, you agree to these Terms. Please read them carefully.'),
        LegalSection(
          heading: 'Acceptable Use',
          body:
              'You agree to use Trip Tracker only for lawful group budgeting, travel expense coordination, and communication. You are solely responsible for all content uploaded to your trips.',
        ),
        LegalSection(
          heading: 'Disclaimers',
          body:
              'Trip Tracker is provided "as is". Currency conversion rates are provided for estimation purposes and should not be relied upon for formal financial transactions.',
        ),
      ],
    );
  }
}
