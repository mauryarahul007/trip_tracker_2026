import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Wall clock seam so time-dependent UI (back-exit window, trip status) is testable.
final nowProvider = Provider<DateTime Function()>((ref) => DateTime.now);
