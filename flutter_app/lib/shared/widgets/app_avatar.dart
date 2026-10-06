import 'package:flutter/material.dart';

const List<Color> _avatarPalette = [
  Color(0xFF2F6FED), // skyline blue
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
    if (avatarUrl != null && avatarUrl!.isNotEmpty) {
      return ClipOval(
        child: Image.network(
          avatarUrl!,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => _buildInitials(),
        ),
      );
    }

    return _buildInitials();
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
        style: TextStyle(color: Colors.white, fontSize: size * 0.4, fontWeight: FontWeight.w700, letterSpacing: -0.5),
      ),
    );
  }
}
