import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../network/api_client.dart';
import 'auth_repository.dart';

final dioProvider = Provider<Dio>((ref) => createApiClient());
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) => const FlutterSecureStorage());
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final repository = AuthRepository(dio: ref.watch(dioProvider), storage: ref.watch(secureStorageProvider));
  ref.onDispose(repository.dispose);
  return repository;
});
