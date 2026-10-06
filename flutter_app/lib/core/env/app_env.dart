enum AppFlavor { dev, staging, prod }

class AppEnv {
  const AppEnv({
    required this.flavor,
    required this.appName,
    required this.supabaseUrl,
    required this.supabaseAnonKey,
  });

  final AppFlavor flavor;
  final String appName;
  final String supabaseUrl;
  final String supabaseAnonKey;

  static const String _env = String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'dev',
  );
  static const String _name = String.fromEnvironment(
    'APP_NAME',
    defaultValue: 'Trip Tracker (Dev)',
  );
  static const String _url = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://dev.triptracker.internal',
  );
  static const String _anonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'dev-anon-key-placeholder',
  );

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
    );
    return _current!;
  }

  bool get isDev => flavor == AppFlavor.dev;
  bool get isStaging => flavor == AppFlavor.staging;
  bool get isProd => flavor == AppFlavor.prod;
}
