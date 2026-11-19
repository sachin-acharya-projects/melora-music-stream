abstract final class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'MELORA_API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000/api/v1',
  );
  static const oauthRedirectUri = 'com.melora.app://auth/callback';
}
