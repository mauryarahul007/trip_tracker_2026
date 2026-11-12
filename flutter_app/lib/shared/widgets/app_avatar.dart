import 'cached_photo.dart';

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

const List<Color> _avatarPalette = [
  AppColors.calmTeal, // skyline blue
  Color(0xFFB98A3E), // brass
  Color(0xFF5B7FBD), // slate blue
  Color(0xFF8B5FBF), // violet
  Color(0xFFC16E5C), // terracotta
  Color(0xFF4F9B6E), // sage green
  Color(0xFFB5548E), // rose
  Color(0xFF3D8FA6), // teal-blue
  Color(0xFFA6763D), // amber-brown
  Color(0xFF6B7FA0), // dusty blue
];

class AppAvatar extends StatelessWidget {
  final String name;
  final String? avatarUrl;
  final double size;

  const AppAvatar({super.key, required this.name, this.avatarUrl, this.size = 36.0});

  static Color colorForName(String name) {
    final normalized = name.trim().toLowerCase();
    int hash = 0;
    for (int i = 0; i < normalized.length; i++) {
      hash = (hash << 5) - hash + normalized.codeUnitAt(i);
      hash &= 0xFFFFFFFF; // 32-bit int
    }
    return _avatarPalette[hash.abs() % _avatarPalette.length];
  }

  static String initialsForName(String nameOrEmail) {
    final namePart = nameOrEmail.split('@')[0];
    final words = namePart.split(RegExp(r'[.\s_-]+')).where((w) => w.isNotEmpty).toList();
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    if (namePart.isNotEmpty) {
      return namePart.substring(0, namePart.length >= 2 ? 2 : 1).toUpperCase();
    }
    return '?';
  }

  @override
  Widget build(BuildContext context) {
    final Widget avatar;
    if (avatarUrl != null && avatarUrl!.isNotEmpty) {
      avatar = ClipOval(
        child: Image(
          image: cachedPhotoSized(context, avatarUrl!, logicalWidth: size),
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => _buildInitials(),
        ),
      );
    } else {
      avatar = _buildInitials();
    }
    // Screen readers say the person's name once, not the initials or the photo.
    return Semantics(label: name, image: true, excludeSemantics: true, child: avatar);
  }

  /// Initials colour with the better WCAG contrast on [bg]: white on the dark palette, near-black on light fills.
  static Color textColorFor(Color bg) {
    double ratio(Color a, Color b) {
      final l1 = a.computeLuminance(), l2 = b.computeLuminance();
      return (l1 > l2 ? l1 + 0.05 : l2 + 0.05) / (l1 > l2 ? l2 + 0.05 : l1 + 0.05);
    }

    const dark = Color(0xFF1A1A1A);
    return ratio(bg, Colors.white) >= ratio(bg, dark) ? Colors.white : dark;
  }

  Widget _buildInitials() {
    final bgColor = colorForName(name);
    final initials = initialsForName(name);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: bgColor, shape: BoxShape.circle),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: TextStyle(
          color: textColorFor(bgColor),
          fontSize: size * 0.4,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.5,
        ),
      ),
    );
  }
}
