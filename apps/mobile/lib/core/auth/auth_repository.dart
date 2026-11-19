import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config/app_config.dart';

class MeloraUser {
  const MeloraUser({required this.id, required this.email, required this.username, this.displayName, this.avatarUrl, this.role = 'user'});
  final String id, email, username, role;
  final String? displayName, avatarUrl;
  factory MeloraUser.fromJson(Map<String, dynamic> json) => MeloraUser(
    id: json['id'] as String, email: json['email'] as String,
    username: json['username'] as String,
    displayName: json['display_name'] as String?,
    avatarUrl: json['avatar_url'] as String?,
    role: json['role'] as String? ?? 'user',
  );
}

class AuthRepository {
  AuthRepository({required Dio dio, required FlutterSecureStorage storage, AppLinks? links})
      : _dio = dio, _storage = storage, _links = links ?? AppLinks();
  static const _accessKey = 'melora_access_token', _refreshKey = 'melora_refresh_token';
  final Dio _dio;
  final FlutterSecureStorage _storage;
  final AppLinks _links;
  StreamSubscription<Uri>? _subscription;
  bool _isCallback(Uri uri) => uri.scheme == 'com.melora.app' && uri.host == 'auth' && uri.path == '/callback';

  Future<void> listenForCallbacks(Future<void> Function(Uri) onCallback) async {
    _subscription ??= _links.uriLinkStream.listen((uri) {
      if (_isCallback(uri)) unawaited(onCallback(uri));
    });
    final initial = await _links.getInitialLink();
    if (initial != null && _isCallback(initial)) await onCallback(initial);
  }
  Future<void> startGoogleSignIn() async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}/auth/login').replace(
      queryParameters: {'redirect': AppConfig.oauthRedirectUri},
    );
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      throw StateError('Could not open the system browser.');
    }
  }
  Future<void> _storeTokens(String access, String refresh) async {
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
  }
  Future<void> clearTokens() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
  Future<MeloraUser?> restoreSession() async {
    final token = await _storage.read(key: _accessKey);
    if (token == null) return null;
    try { return await _currentUser(token); }
    on DioException catch (error) {
      if (error.response?.statusCode != 401) rethrow;
      final refreshed = await _refresh();
      return refreshed == null ? null : _currentUser(refreshed);
    }
  }
  Future<MeloraUser> acceptCallback(Uri uri) async {
    final error = uri.queryParameters['error'];
    if (error != null) throw StateError(error);
    final access = uri.queryParameters['access_token'];
    final refresh = uri.queryParameters['refresh_token'];
    if (access == null || refresh == null) throw const FormatException('OAuth callback is missing tokens.');
    await _storeTokens(access, refresh);
    return _currentUser(access);
  }
  Future<MeloraUser> _currentUser(String token) async {
    final response = await _dio.get<Map<String, dynamic>>('/auth/me',
      options: Options(headers: {'Authorization': 'Bearer $token'}));
    return MeloraUser.fromJson(response.data!);
  }
  Future<String?> _refresh() async {
    final refresh = await _storage.read(key: _refreshKey);
    if (refresh == null) { await clearTokens(); return null; }
    try {
      final response = await _dio.post<Map<String, dynamic>>('/auth/refresh', data: {'refresh_token': refresh});
      final access = response.data!['access_token'] as String;
      final nextRefresh = response.data!['refresh_token'] as String;
      await _storeTokens(access, nextRefresh);
      return access;
    } on DioException { await clearTokens(); return null; }
  }
  Future<void> signOut() async {
    final token = await _storage.read(key: _accessKey);
    try {
      if (token != null) await _dio.post<void>('/auth/logout',
        options: Options(headers: {'Authorization': 'Bearer $token'}));
    } finally { await clearTokens(); }
  }
  Future<void> dispose() async => _subscription?.cancel();
}
