import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/format/money.dart';
import '../../../core/platform/haptics.dart';
import '../../../core/platform/share_service.dart';
import '../../../domain/logic/trip_wrapped_service.dart';
import '../../../domain/models/expense.dart';
import '../../../domain/models/member.dart';
import '../../../domain/models/trip.dart';
import '../../../shared/widgets/app_button.dart';
import '../../expenses/application/expenses_providers.dart';
import '../../trip_details/application/trip_nav.dart';
import 'passport_stamp.dart';

class TripWrappedModal extends ConsumerStatefulWidget {
  const TripWrappedModal({required this.tripId, super.key});
  final String tripId;

  static Future<void> show(BuildContext context, {required String tripId}) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => TripWrappedModal(tripId: tripId),
    );
  }

  @override
  ConsumerState<TripWrappedModal> createState() => _TripWrappedModalState();
}

class _TripWrappedModalState extends ConsumerState<TripWrappedModal> {
  final PageController _pageController = PageController();
  final GlobalKey _shareCardKey = GlobalKey();
  int _currentSlide = 0;
  bool _isDark = true;
  bool _isSharing = false;

  static const int _totalSlides = 5;

  Future<void> _shareStory(Trip trip) async {
    try {
      setState(() => _isSharing = true);
      unawaited(AppHaptics.light());

      final cleanName = trip.name.replaceAll(RegExp(r'[^a-zA-Z0-9]+'), '-').replaceAll(RegExp(r'^-|-$'), '');
      final fileName = '${cleanName.isNotEmpty ? cleanName : 'trip'}-wrapped.png';

      List<int>? pngBytes;
      try {
        final boundary = _shareCardKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
        if (boundary != null && !boundary.debugNeedsPaint) {
          final image = await boundary.toImage(pixelRatio: 2.0).timeout(const Duration(milliseconds: 50));
          final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
          if (byteData != null) {
            pngBytes = byteData.buffer.asUint8List();
          }
        }
      } catch (_) {
        // Fall back in headless / testing environments
      }

      await ref
          .read(shareServiceProvider)
          .sharePng(pngBytes ?? const [], fileName: fileName, text: 'Here is our ${trip.name} Trip Wrapped story! ✨');
    } catch (_) {
      // Ignore or fall back gracefully
    } finally {
      if (mounted) setState(() => _isSharing = false);
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Trip? trip = ref.watch(tripProvider(widget.tripId)).value;
    final expenses = ref.watch(tripExpensesProvider(widget.tripId)).value ?? const <Expense>[];
    final members = ref.watch(tripMembersProvider(widget.tripId)).value ?? const <Member>[];
    final categories = ref.watch(tripCategoriesProvider(widget.tripId));

    if (trip == null) {
      return const SizedBox.shrink();
    }

    final archetype = getTripArchetype(categories, expenses);
    final superlatives = getMemberSuperlatives(members, expenses, categories);
    final rhythm = getTripRhythm(expenses, trip);
    final leaderboard = getMemberSpendLeaderboard(members, expenses);

    final bgCardColor = _isDark ? const Color(0xFF0F1E24) : Colors.white;
    final textPrimary = _isDark ? Colors.white : const Color(0xFF0F172A);
    final textSecondary = _isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
    final accentColor = _isDark ? const Color(0xFF3FCBBD) : const Color(0xFF0F6F63);

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.92),
      decoration: BoxDecoration(
        color: _isDark ? const Color(0xFF071115) : const Color(0xFFF8FAFC),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Drag handle
          const SizedBox(height: 12),
          Container(
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: textSecondary.withValues(alpha: 0.35),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 12),

          // Header with Story Progress Bars & Theme Switcher
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                // Segmented Progress Bar
                Row(
                  children: List.generate(_totalSlides, (index) {
                    final isActive = index <= _currentSlide;
                    return Expanded(
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        height: 3.5,
                        decoration: BoxDecoration(
                          color: isActive ? accentColor : textSecondary.withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 12),

                // Controls row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Text(
                          'TRIP WRAPPED',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.0,
                            color: accentColor,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: accentColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '${_currentSlide + 1} / $_totalSlides',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: accentColor),
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        // Theme Mode Switcher
                        Container(
                          decoration: BoxDecoration(
                            color: bgCardColor,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: textSecondary.withValues(alpha: 0.2)),
                          ),
                          padding: const EdgeInsets.all(2),
                          child: Row(
                            children: [
                              _ThemeTab(
                                label: 'Night',
                                icon: Icons.nightlight_round,
                                selected: _isDark,
                                onSelect: () => setState(() => _isDark = true),
                              ),
                              _ThemeTab(
                                label: 'Day',
                                icon: Icons.wb_sunny_rounded,
                                selected: !_isDark,
                                onSelect: () => setState(() => _isDark = false),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
                          key: const Key('wrapped-close'),
                          icon: Icon(Icons.close, color: textPrimary, size: 20),
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Story Slide PageView
          Expanded(
            child: PageView(
              controller: _pageController,
              onPageChanged: (page) => setState(() => _currentSlide = page),
              children: [
                _buildSlideWelcome(trip, members, archetype, bgCardColor, textPrimary, textSecondary, accentColor),
                _buildSlideVibe(archetype, bgCardColor, textPrimary, textSecondary, accentColor),
                _buildSlideSuperlatives(superlatives, bgCardColor, textPrimary, textSecondary, accentColor),
                _buildSlideRhythmAndLeaderboard(
                  rhythm,
                  leaderboard,
                  trip,
                  bgCardColor,
                  textPrimary,
                  textSecondary,
                  accentColor,
                ),
                _buildSlideFullCard(
                  trip,
                  members,
                  expenses,
                  archetype,
                  superlatives,
                  rhythm,
                  leaderboard,
                  bgCardColor,
                  textPrimary,
                  textSecondary,
                  accentColor,
                ),
              ],
            ),
          ),

          // Bottom Action Bar
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            child: Row(
              children: [
                if (_currentSlide > 0)
                  Expanded(
                    flex: 1,
                    child: OutlinedButton(
                      key: const Key('wrapped-prev'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: textPrimary,
                        side: BorderSide(color: textSecondary.withValues(alpha: 0.3)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: () {
                        unawaited(AppHaptics.light());
                        _pageController.previousPage(
                          duration: const Duration(milliseconds: 240),
                          curve: Curves.easeInOut,
                        );
                      },
                      child: const Text('Back'),
                    ),
                  ),
                if (_currentSlide > 0) const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: AppButton(
                    key: const Key('wrapped-next-action'),
                    label: _currentSlide < _totalSlides - 1
                        ? 'Next Chapter ➔'
                        : (_isSharing ? 'Sharing...' : 'Share Wrapped 📤'),
                    onPressed: () {
                      unawaited(AppHaptics.light());
                      if (_currentSlide < _totalSlides - 1) {
                        _pageController.nextPage(duration: const Duration(milliseconds: 240), curve: Curves.easeInOut);
                      } else {
                        _shareStory(trip);
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Slide 1: Welcome & Mission Complete Stamp
  Widget _buildSlideWelcome(
    Trip trip,
    List<Member> members,
    TripArchetype archetype,
    Color bgCardColor,
    Color textPrimary,
    Color textSecondary,
    Color accentColor,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: bgCardColor,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: accentColor.withValues(alpha: 0.3)),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 20, spreadRadius: 2)],
        ),
        child: Column(
          children: [
            Center(
              child: PassportStamp(
                destination: trip.destination,
                tripName: trip.name,
                isSettled: trip.closed,
                size: 110,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              trip.name,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: textPrimary),
            ),
            const SizedBox(height: 6),
            Text(
              trip.destination?.isNotEmpty == true ? trip.destination! : 'Squad Expedition',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: accentColor),
            ),
            const SizedBox(height: 4),
            Text(
              '${trip.startDate} — ${trip.endDate} · ${members.length} Explorers',
              style: TextStyle(fontSize: 12, color: textSecondary),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: accentColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Text(archetype.icon, style: const TextStyle(fontSize: 28)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          archetype.tag,
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: accentColor),
                        ),
                        Text(
                          archetype.title,
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: textPrimary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Slide 2: Trip Vibe Identity
  Widget _buildSlideVibe(
    TripArchetype archetype,
    Color bgCardColor,
    Color textPrimary,
    Color textSecondary,
    Color accentColor,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: bgCardColor,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: accentColor.withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(color: accentColor, borderRadius: BorderRadius.circular(12)),
              child: Text(
                archetype.tag,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white),
              ),
            ),
            const SizedBox(height: 16),
            Text(archetype.icon, style: const TextStyle(fontSize: 64)),
            const SizedBox(height: 16),
            Text(
              archetype.title,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: textPrimary),
            ),
            const SizedBox(height: 12),
            Text(
              archetype.subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: textSecondary, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }

  // Slide 3: Squad Superlatives
  Widget _buildSlideSuperlatives(
    List<MemberSuperlative> superlatives,
    Color bgCardColor,
    Color textPrimary,
    Color textSecondary,
    Color accentColor,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: bgCardColor,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: accentColor.withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'SQUAD SUPERLATIVES',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: accentColor, letterSpacing: 0.8),
            ),
            const SizedBox(height: 4),
            Text(
              'Who Did What on Tour',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: textPrimary),
            ),
            const SizedBox(height: 16),
            if (superlatives.isEmpty)
              Text('No crew superlatives assigned.', style: TextStyle(color: textSecondary))
            else
              for (final s in superlatives)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: accentColor.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(s.icon, style: const TextStyle(fontSize: 24)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    s.memberName,
                                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: textPrimary),
                                  ),
                                  Text(
                                    s.title,
                                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: accentColor),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(s.note, style: TextStyle(fontSize: 11.5, color: textSecondary)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
          ],
        ),
      ),
    );
  }

  // Slide 4: Rhythm & Leaderboard
  Widget _buildSlideRhythmAndLeaderboard(
    TripRhythm rhythm,
    List<MemberSpendEntry> leaderboard,
    Trip trip,
    Color bgCardColor,
    Color textPrimary,
    Color textSecondary,
    Color accentColor,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: bgCardColor,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: accentColor.withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'EXPEDITION RHYTHM',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: accentColor, letterSpacing: 0.8),
            ),
            const SizedBox(height: 4),
            Text(
              'Peak Days & Group Pace',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: textPrimary),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: accentColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'PEAK ADVENTURE DAY',
                        style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: textSecondary),
                      ),
                      Text(
                        rhythm.peakDay,
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: textPrimary),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'EXPEDITION PACE',
                        style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: textSecondary),
                      ),
                      Text(
                        rhythm.pace,
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: accentColor),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'SPENDING LEADERBOARD',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: accentColor, letterSpacing: 0.8),
            ),
            const SizedBox(height: 8),
            if (leaderboard.isEmpty)
              Text('No expenses logged.', style: TextStyle(color: textSecondary))
            else
              for (var i = 0; i < leaderboard.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Text(
                            '#${i + 1}',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              color: accentColor,
                              fontFamily: 'monospace',
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            leaderboard[i].memberName,
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: textPrimary),
                          ),
                        ],
                      ),
                      Text(
                        formatMoney(context, leaderboard[i].amount, trip.baseCurrency),
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: textPrimary),
                      ),
                    ],
                  ),
                ),
          ],
        ),
      ),
    );
  }

  // Slide 5: Full Wrapped Card for Sharing
  Widget _buildSlideFullCard(
    Trip trip,
    List<Member> members,
    List<Expense> expenses,
    TripArchetype archetype,
    List<MemberSuperlative> superlatives,
    TripRhythm rhythm,
    List<MemberSpendEntry> leaderboard,
    Color bgCardColor,
    Color textPrimary,
    Color textSecondary,
    Color accentColor,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: RepaintBoundary(
        key: _shareCardKey,
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: bgCardColor,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: accentColor.withValues(alpha: 0.4), width: 1.5),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 20, spreadRadius: 2)],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Visa Stamp & Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'TRIP TRACKER WRAPPED',
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w900,
                            color: accentColor,
                            letterSpacing: 0.8,
                          ),
                        ),
                        Text(
                          trip.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: textPrimary),
                        ),
                        Text(
                          '${trip.startDate} — ${trip.endDate} · ${members.length} Squad',
                          style: TextStyle(fontSize: 11, color: textSecondary),
                        ),
                      ],
                    ),
                  ),
                  PassportStamp(destination: trip.destination, tripName: trip.name, isSettled: trip.closed, size: 68),
                ],
              ),
              const Divider(height: 24),

              // Archetype Pill
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    Text(archetype.icon, style: const TextStyle(fontSize: 26)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            archetype.tag,
                            style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900, color: accentColor),
                          ),
                          Text(
                            archetype.title,
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: textPrimary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Superlatives snippet
              if (superlatives.isNotEmpty) ...[
                Text(
                  'SQUAD HIGHLIGHTS',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: textSecondary, letterSpacing: 0.6),
                ),
                const SizedBox(height: 6),
                for (final s in superlatives.take(3))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      children: [
                        Text(s.icon, style: const TextStyle(fontSize: 14)),
                        const SizedBox(width: 6),
                        Text(
                          s.memberName,
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: textPrimary),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '· ${s.title}',
                          style: TextStyle(fontSize: 11.5, color: accentColor, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 8),
              ],

              // Rhythm badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: textSecondary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Peak Activity: ${rhythm.peakDay}',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: textPrimary),
                    ),
                    Text(
                      rhythm.pace,
                      style: TextStyle(fontSize: 10.5, color: accentColor, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ThemeTab extends StatelessWidget {
  const _ThemeTab({required this.label, required this.icon, required this.selected, required this.onSelect});

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onSelect,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF0F6F63) : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Icon(icon, size: 12, color: selected ? Colors.white : const Color(0xFF94A3B8)),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: selected ? Colors.white : const Color(0xFF94A3B8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
