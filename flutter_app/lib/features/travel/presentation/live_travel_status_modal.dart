import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/external_launcher.dart';
import '../../../core/platform/haptics.dart';
import '../../../domain/logic/travel_status_service.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';

class LiveTravelStatusModal extends ConsumerStatefulWidget {
  const LiveTravelStatusModal({super.key, required this.statusInfo});

  final TravelStatusInfo statusInfo;

  static Future<void> show(BuildContext context, TravelStatusInfo statusInfo) {
    return AppSheet.show<void>(
      context: context,
      builder: (ctx) => LiveTravelStatusModal(statusInfo: statusInfo),
    );
  }

  @override
  ConsumerState<LiveTravelStatusModal> createState() => _LiveTravelStatusModalState();
}

class _LiveTravelStatusModalState extends ConsumerState<LiveTravelStatusModal> {
  String? _copiedLabel;
  late TravelStatusInfo _currentStatus;
  bool _isEditingFlight = false;
  late final TextEditingController _flightInputController;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.statusInfo;
    if (_currentStatus is FlightStatusInfo) {
      final flight = _currentStatus as FlightStatusInfo;
      _flightInputController = TextEditingController(text: '${flight.carrierCode}-${flight.flightNumber}');
    } else {
      _flightInputController = TextEditingController();
    }
  }

  @override
  void dispose() {
    _flightInputController.dispose();
    super.dispose();
  }

  void _recalculateFlight(String input) {
    if (_currentStatus is! FlightStatusInfo) return;
    final orig = _currentStatus as FlightStatusInfo;
    final parsed = parseFlightCode(input, orig.airlineName);
    if (parsed != null) {
      final urls = buildFlightUrls(parsed.carrierCode, parsed.flightNumber, orig.departureTime);
      setState(() {
        _currentStatus = FlightStatusInfo(
          carrierCode: parsed.carrierCode,
          flightNumber: parsed.flightNumber,
          airlineName: parsed.airlineName,
          fullFlightCode: urls.fullFlightCode,
          icaoCode: urls.icaoCode,
          googleStatusUrl: urls.googleStatusUrl,
          flightradar24Url: urls.flightradar24Url,
          flightAwareUrl: urls.flightAwareUrl,
          flightStatsUrl: urls.flightStatsUrl,
          formattedFlightDate: urls.formattedFlightDate,
          flightTime: urls.flightTime,
          origin: orig.origin,
          destination: orig.destination,
          departureTime: orig.departureTime,
        );
      });
    }
  }

  Future<void> _copy(String text, String label) async {
    await AppHaptics.selection();
    await Clipboard.setData(ClipboardData(text: text));
    if (mounted) {
      setState(() => _copiedLabel = label);
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          setState(() => _copiedLabel = null);
        }
      });
    }
  }

  Future<void> _launchUrl(String url) async {
    final launcher = ref.read(externalLauncherProvider);
    await AppHaptics.selection();
    final uri = Uri.tryParse(url);
    if (uri != null) {
      await launcher(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final status = _currentStatus;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text(status is FlightStatusInfo ? '✈️' : '🚆', style: const TextStyle(fontSize: 26)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      status is FlightStatusInfo ? 'Live Flight Status' : 'Live Train & PNR Tracker',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: tokens.textPrimary),
                    ),
                    Text(
                      status is FlightStatusInfo
                          ? 'Gate, terminal, radar & delay tracking'
                          : 'Real-time PNR confirmation & running status',
                      style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (status is FlightStatusInfo)
            _buildFlightContent(context, tokens, status)
          else if (status is TrainStatusInfo)
            _buildTrainContent(context, tokens, status),
        ],
      ),
    );
  }

  Widget _buildFlightContent(BuildContext context, AppTokens tokens, FlightStatusInfo flight) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: tokens.bgSurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: tokens.borderColor.withValues(alpha: 0.6)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        flight.airlineName,
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: tokens.textSecondary),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        flight.fullFlightCode,
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: tokens.textPrimary,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: Icon(
                          _copiedLabel == 'code' ? AppIcons.check : AppIcons.copy,
                          size: 18,
                          color: _copiedLabel == 'code' ? tokens.colorSuccess : tokens.textSecondary,
                        ),
                        tooltip: 'Copy flight code',
                        onPressed: () => _copy(flight.fullFlightCode, 'code'),
                      ),
                      IconButton(
                        icon: Icon(
                          _isEditingFlight ? AppIcons.check : AppIcons.edit,
                          size: 18,
                          color: tokens.primaryAccent,
                        ),
                        tooltip: 'Edit code',
                        onPressed: () {
                          setState(() => _isEditingFlight = !_isEditingFlight);
                        },
                      ),
                    ],
                  ),
                ],
              ),
              if (_isEditingFlight) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _flightInputController,
                        decoration: InputDecoration(
                          hintText: 'e.g. 6E-537 or AI-101',
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        style: const TextStyle(fontSize: 14),
                      ),
                    ),
                    const SizedBox(width: 8),
                    AppButton(
                      label: 'Update',
                      variant: AppButtonVariant.primary,
                      onPressed: () {
                        _recalculateFlight(_flightInputController.text);
                        setState(() => _isEditingFlight = false);
                      },
                    ),
                  ],
                ),
              ],
              if (flight.origin != null || flight.destination != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Text(
                      flight.origin ?? 'Origin',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: tokens.textPrimary),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 8),
                      child: Icon(Icons.arrow_forward_rounded, size: 14),
                    ),
                    Text(
                      flight.destination ?? 'Destination',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: tokens.textPrimary),
                    ),
                  ],
                ),
              ],
              if (flight.formattedFlightDate != null) ...[
                const SizedBox(height: 6),
                Text(
                  'Departure: ${flight.formattedFlightDate}${flight.flightTime != null ? " at ${flight.flightTime}" : ""}',
                  style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Live Tracking Portals',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: tokens.textPrimary),
        ),
        const SizedBox(height: 8),
        _buildActionTile(
          tokens,
          icon: '🔍',
          title: 'Google Flight Status',
          subtitle: 'Live terminal, gate, baggage carousel & delays',
          onTap: () => _launchUrl(flight.googleStatusUrl),
        ),
        const SizedBox(height: 8),
        _buildActionTile(
          tokens,
          icon: '📡',
          title: 'Flightradar24',
          subtitle: 'Live interactive aircraft radar tracking & altitude',
          onTap: () => _launchUrl(flight.flightradar24Url),
        ),
        const SizedBox(height: 8),
        _buildActionTile(
          tokens,
          icon: '🗺️',
          title: 'FlightAware',
          subtitle: 'Air traffic map, history & arrival forecast',
          onTap: () => _launchUrl(flight.flightAwareUrl),
        ),
      ],
    );
  }

  Widget _buildTrainContent(BuildContext context, AppTokens tokens, TrainStatusInfo train) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: tokens.bgSurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: tokens.borderColor.withValues(alpha: 0.6)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                train.trainName ?? 'Express Train',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: tokens.textPrimary),
              ),
              if (train.trainNumber != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      'Train #${train.trainNumber}',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: tokens.primaryAccent),
                    ),
                    IconButton(
                      icon: Icon(
                        _copiedLabel == 'train' ? AppIcons.check : AppIcons.copy,
                        size: 16,
                        color: _copiedLabel == 'train' ? tokens.colorSuccess : tokens.textSecondary,
                      ),
                      tooltip: 'Copy train number',
                      onPressed: () => _copy(train.trainNumber!, 'train'),
                    ),
                  ],
                ),
              ],
              if (train.pnr != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      'PNR: ${train.pnr}',
                      style: TextStyle(fontSize: 13, fontFamily: 'monospace', color: tokens.textSecondary),
                    ),
                    IconButton(
                      icon: Icon(
                        _copiedLabel == 'pnr' ? AppIcons.check : AppIcons.copy,
                        size: 16,
                        color: _copiedLabel == 'pnr' ? tokens.colorSuccess : tokens.textSecondary,
                      ),
                      tooltip: 'Copy PNR',
                      onPressed: () => _copy(train.pnr!, 'pnr'),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Live Train Tracking',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: tokens.textPrimary),
        ),
        const SizedBox(height: 8),
        if (train.confirmTktUrl != null) ...[
          _buildActionTile(
            tokens,
            icon: '🎫',
            title: 'ConfirmTkt PNR Status',
            subtitle: 'Live seat confirmation probability & chart status',
            onTap: () => _launchUrl(train.confirmTktUrl!),
          ),
          const SizedBox(height: 8),
        ],
        if (train.railYatriUrl != null) ...[
          _buildActionTile(
            tokens,
            icon: '📍',
            title: 'RailYatri Live Running Status',
            subtitle: 'Real-time GPS spot-your-train & platform numbers',
            onTap: () => _launchUrl(train.railYatriUrl!),
          ),
          const SizedBox(height: 8),
        ],
        if (train.googleLiveTrainUrl != null) ...[
          _buildActionTile(
            tokens,
            icon: '🔍',
            title: 'Google Live Train Tracker',
            subtitle: 'Search running status and current station',
            onTap: () => _launchUrl(train.googleLiveTrainUrl!),
          ),
        ],
      ],
    );
  }

  Widget _buildActionTile(
    AppTokens tokens, {
    required String icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: tokens.bgSurface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: tokens.borderColor.withValues(alpha: 0.5)),
        ),
        child: Row(
          children: [
            Text(icon, style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: tokens.textPrimary),
                  ),
                  Text(subtitle, style: TextStyle(fontSize: 11, color: tokens.textSecondary)),
                ],
              ),
            ),
            Icon(Icons.open_in_new_rounded, size: 16, color: tokens.textMuted),
          ],
        ),
      ),
    );
  }
}
