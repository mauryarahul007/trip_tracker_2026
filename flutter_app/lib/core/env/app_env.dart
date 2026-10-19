enum AppFlavor { dev, staging, prod }

class AppEnv {
  const AppEnv({
    required this.flavor,
    required this.appName,
    required this.supabaseUrl,
    required this.supabaseAnonKey,
    this.googleServerClientId = '',
    this.googleIosClientId = '',
  });

  final AppFlavor flavor;
  final String appName;
  final String supabaseUrl;
  final String supabaseAnonKey;

  /// OAuth client ids (public identifiers, passed via --dart-define-from-file).
  final String googleServerClientId;
  final String googleIosClientId;

  static const String _env = String.fromEnvironment('APP_ENV', defaultValue: 'dev');
  static const String _name = String.fromEnvironment('APP_NAME', defaultValue: 'Trip Tracker (Dev)');
  static const String _url = String.fromEnvironment('SUPABASE_URL', defaultValue: 'https://dev.triptracker.internal');
  static const String _anonKey = String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: 'dev-anon-key-placeholder');

  static const String _googleServer = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');
  static const String _googleIos = String.fromEnvironment('GOOGLE_IOS_CLIENT_ID');

  static AppFlavor _parseFlavor(String env) {
    switch (env.toLowerCase()) {
      case 'prod':
      case 'production':
        return AppFlavor.prod;
      case 'staging':
        return AppFlavor.staging;
      default:
        return AppFlavor.dev;
    }
  }

  static AppEnv? _current;

  static AppEnv get current {
    _current ??= load();
    return _current!;
  }

  static AppEnv load() {
    _current = AppEnv(
      flavor: _parseFlavor(_env),
      appName: _name,
      supabaseUrl: _url,
      supabaseAnonKey: _anonKey,
      googleServerClientId: _googleServer,
      googleIosClientId: _googleIos,
    );
    return _current!;
  }

  /// False for the built-in placeholder URL/key: the app then runs local-only
  /// (guest/demo + Drift) and never touches Supabase.
  bool get hasBackend =>
      supabaseUrl.isNotEmpty &&
      !supabaseUrl.contains('triptracker.internal') &&
      supabaseAnonKey != 'dev-anon-key-placeholder';

  bool get isDev => flavor == AppFlavor.dev;
  bool get isStaging => flavor == AppFlavor.staging;
  bool get isProd => flavor == AppFlavor.prod;
}
