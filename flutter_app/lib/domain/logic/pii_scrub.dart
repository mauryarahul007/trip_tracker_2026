/// Removes personal data from text that leaves the device (logs, bug reports).
/// Deliberately aggressive: a redacted log is annoying, a leaked token is not.
final _email = RegExp(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}');
final _jwt = RegExp(r'eyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]*');
final _bearer = RegExp(
  r'(bearer|apikey|api_key|authorization)(["\x27:=\s]+)[A-Za-z0-9._\-]{12,}',
  caseSensitive: false,
);
final _phone = RegExp(r'(?<![\w.])\+?\d[\d\s().\-]{8,}\d(?![\w.])');
final _longToken = RegExp(r'\b[A-Za-z0-9_\-]{40,}\b');

String scrubPii(String text) => text
    .replaceAll(_jwt, '[token]')
    .replaceAllMapped(_bearer, (m) => '${m[1]}${m[2]}[token]')
    .replaceAll(_email, '[email]')
    .replaceAll(_phone, '[phone]')
    .replaceAll(_longToken, '[token]');
