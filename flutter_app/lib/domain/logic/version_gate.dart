/// Native version gate (`get_app_version_gate`, migration 0112). Fail-open by design:
/// anything unreadable means "ok", so a broken config call never locks users out.
enum GateStatus { ok, soft, hard, maintenance }

class VersionGateDecision {
  const VersionGateDecision(this.status, {this.storeUrl = '', this.message = '', this.recommended = ''});

  final GateStatus status;
  final String storeUrl;
  final String message;
  final String recommended;

  static const ok = VersionGateDecision(GateStatus.ok);
}

VersionGateDecision decideVersionGate(Object? json) {
  if (json is! Map) return VersionGateDecision.ok;
  final storeUrl = json['store_url'] is String ? json['store_url'] as String : '';
  final message = json['maintenance_message'] is String ? json['maintenance_message'] as String : '';
  final recommended = json['recommended_version'] is String ? json['recommended_version'] as String : '';
  if (json['maintenance_mode'] == true) {
    return VersionGateDecision(GateStatus.maintenance, storeUrl: storeUrl, message: message);
  }
  if (json['upgrade_required'] == true || json['is_supported'] == false) {
    return VersionGateDecision(GateStatus.hard, storeUrl: storeUrl, recommended: recommended);
  }
  if (json['is_recommended'] == false) {
    return VersionGateDecision(GateStatus.soft, storeUrl: storeUrl, recommended: recommended);
  }
  return VersionGateDecision.ok;
}
