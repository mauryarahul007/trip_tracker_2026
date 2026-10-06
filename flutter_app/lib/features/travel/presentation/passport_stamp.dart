import 'dart:math';

import 'package:flutter/material.dart';

const Map<String, String> _destCodeMap = {
  'goa': 'GOI',
  'mumbai': 'BOM',
  'delhi': 'DEL',
  'bangalore': 'BLR',
  'bengaluru': 'BLR',
  'hyderabad': 'HYD',
  'dubai': 'DXB',
  'singapore': 'SIN',
  'bali': 'DPS',
  'bangkok': 'BKK',
  'paris': 'CDG',
  'london': 'LHR',
  'tokyo': 'HND',
  'kyoto': 'KIX',
  'newyork': 'JFK',
  'manali': 'KUU',
  'leh': 'IXL',
  'ladakh': 'IXL',
  'jaipur': 'JAI',
  'udaipur': 'UDR',
  'kerala': 'COK',
  'kochi': 'COK',
  'thailand': 'BKK',
  'vietnam': 'HAN',
  'rome': 'FCO',
  'amsterdam': 'AMS',
  'switzerland': 'ZRH',
  'zurich': 'ZRH',
};

String deriveDestCode(String? dest, String? name) {
  final text = '${dest ?? ''} ${name ?? ''}'.toLowerCase();
  for (final entry in _destCodeMap.entries) {
    if (text.contains(entry.key)) return entry.value;
  }
  final clean = '${dest ?? ''}${name ?? 'TRP'}'.replaceAll(RegExp(r'[^a-zA-Z]'), '').toUpperCase();
  if (clean.length >= 3) return clean.substring(0, 3);
  return clean.isNotEmpty ? clean.padRight(3, 'X') : 'TRP';
}

class StampInkColor {
  const StampInkColor({
    required this.stroke,
    required this.fill,
    required this.text,
  });

  final Color stroke;
  final Color fill;
  final Color text;
}

final Map<String, StampInkColor> stampPalette = {
  'teal': const StampInkColor(
    stroke: Color(0xFF10B981),
    fill: Color(0x2610B981),
    text: Color(0xFF34D399),
  ),
  'amber': const StampInkColor(
    stroke: Color(0xFFF59E0B),
    fill: Color(0x26F59E0B),
    text: Color(0xFFFBBF24),
  ),
  'cyan': const StampInkColor(
    stroke: Color(0xFF06B6D4),
    fill: Color(0x2606B6D4),
    text: Color(0xFF38BDF8),
  ),
  'coral': const StampInkColor(
    stroke: Color(0xFFF43F5E),
    fill: Color(0x26F43F5E),
    text: Color(0xFFFB7185),
  ),
  'purple': const StampInkColor(
    stroke: Color(0xFFA855F7),
    fill: Color(0x26A855F7),
    text: Color(0xFFC084FC),
  ),
  'navy': const StampInkColor(
    stroke: Color(0xFF38BDF8),
    fill: Color(0x2638BDF8),
    text: Color(0xFF7DD3FC),
  ),
};

/// Dynamic vector customs passport stamp matching web PassportStamp.
class PassportStamp extends StatelessWidget {
  const PassportStamp({
    super.key,
    this.destination,
    this.tripName,
    this.date,
    this.isSettled = false,
    this.color = 'auto',
    this.size = 84,
    this.tiltDegrees,
  });

  final String? destination;
  final String? tripName;
  final String? date;
  final bool isSettled;
  final String color;
  final double size;
  final double? tiltDegrees;

  @override
  Widget build(BuildContext context) {
    final code = deriveDestCode(destination, tripName);
    final selectedColorKey = color != 'auto'
        ? color
        : (isSettled ? 'teal' : stampPalette.keys.elementAt((code.hashCode.abs()) % stampPalette.length));
    final ink = stampPalette[selectedColorKey] ?? stampPalette['teal']!;
    final angle = (tiltDegrees ?? ((code.hashCode % 16) - 8.0)) * (pi / 180.0);

    return Transform.rotate(
      angle: angle,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: ink.fill,
          border: Border.all(color: ink.stroke, width: 2.5),
          boxShadow: [
            BoxShadow(
              color: ink.stroke.withValues(alpha: 0.18),
              blurRadius: 8,
              spreadRadius: 1,
            ),
          ],
        ),
        padding: const EdgeInsets.all(4),
        child: Container(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: ink.stroke.withValues(alpha: 0.5), width: 1),
          ),
          child: Center(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      isSettled ? '★ SETTLED ★' : '★ PASSPORT ★',
                      style: TextStyle(
                        color: ink.text,
                        fontSize: size * 0.08,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.6,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      code,
                      style: TextStyle(
                        color: ink.text,
                        fontSize: size * 0.24,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'monospace',
                        letterSpacing: 1.2,
                      ),
                    ),
                    if (date != null && date!.isNotEmpty)
                      Text(
                        date!,
                        style: TextStyle(
                          color: ink.text.withValues(alpha: 0.9),
                          fontSize: size * 0.085,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    Text(
                      isSettled ? 'OFFICIALLY VERIFIED' : 'ENTRY PERMIT',
                      style: TextStyle(
                        color: ink.text.withValues(alpha: 0.75),
                        fontSize: size * 0.065,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
