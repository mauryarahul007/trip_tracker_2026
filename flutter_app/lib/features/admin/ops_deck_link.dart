import '../../domain/repositories/repositories.dart';

/// Web Ops Deck URL carrying the Flutter session in the fragment, so a superadmin is signed in on arrival.
/// supabase-js (implicit flow, detectSessionInUrl) reads these, then clears the fragment. Fragments are never
/// sent to a server. `type=` is deliberately absent: `type=recovery` would open the reset-password screen.
Uri opsDeckUri(Uri base, AuthTokens? tokens) {
  if (tokens == null) return base;
  return base.replace(
    fragment:
        'access_token=${Uri.encodeQueryComponent(tokens.accessToken)}'
        '&refresh_token=${Uri.encodeQueryComponent(tokens.refreshToken)}'
        '&expires_in=${tokens.expiresIn}&token_type=bearer',
  );
}
