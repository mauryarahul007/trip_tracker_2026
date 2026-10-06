import 'package:flutter/material.dart';

import '../places/place_image_service.dart';

class TripPhotoHero extends StatefulWidget {
  final String? destination;
  final String? coverImageUrl;
  final double height;
  final bool isHidden;

  const TripPhotoHero({
    super.key,
    this.destination,
    this.coverImageUrl,
    this.height = 220,
    this.isHidden = false,
  });

  @override
  State<TripPhotoHero> createState() => _TripPhotoHeroState();
}

class _TripPhotoHeroState extends State<TripPhotoHero> {
  String? _resolvedUrl;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadPhoto();
  }

  @override
  void didUpdateWidget(covariant TripPhotoHero oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.destination != widget.destination ||
        oldWidget.coverImageUrl != widget.coverImageUrl) {
      _loadPhoto();
    }
  }

  Future<void> _loadPhoto() async {
    if (widget.coverImageUrl != null && widget.coverImageUrl!.isNotEmpty) {
      setState(() {
        _resolvedUrl = widget.coverImageUrl;
      });
      return;
    }

    if (widget.destination != null && widget.destination!.isNotEmpty) {
      setState(() => _isLoading = true);
      final url = await resolveDestinationImage(widget.destination!);
      if (mounted) {
        setState(() {
          _resolvedUrl = url;
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      duration: const Duration(milliseconds: 350),
      opacity: widget.isHidden ? 0.0 : 1.0,
      child: Container(
        height: widget.height,
        width: double.infinity,
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          image: _resolvedUrl != null
              ? DecorationImage(
                  image: NetworkImage(_resolvedUrl!),
                  fit: BoxFit.cover,
                  colorFilter: ColorFilter.mode(
                    Colors.black.withValues(alpha: 0.35),
                    BlendMode.darken,
                  ),
                )
              : null,
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (_isLoading)
              const Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white70,
                  ),
                ),
              ),
            // Bottom gradient overlay for legible typography
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              height: 100,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.7),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
