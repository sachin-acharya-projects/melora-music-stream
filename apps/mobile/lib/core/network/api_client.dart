import 'package:dio/dio.dart';
import '../config/app_config.dart';

Dio createApiClient() => Dio(BaseOptions(
  baseUrl: AppConfig.apiBaseUrl,
  connectTimeout: const Duration(seconds: 15),
  receiveTimeout: const Duration(seconds: 30),
  headers: const {'Accept': 'application/json'},
));
