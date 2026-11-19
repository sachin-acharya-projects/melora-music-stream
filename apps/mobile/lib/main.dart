import 'package:audio_service/audio_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'app/app.dart';
import 'core/config/app_config.dart';
import 'core/auth/providers.dart';
import 'core/playback/audio_handler.dart';
import 'core/playback/providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const storage = FlutterSecureStorage();
  final dio = Dio(BaseOptions(
    baseUrl: AppConfig.apiBaseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 30),
    headers: const {'Accept': 'application/json'},
  ));
  dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) async {
    final token = await storage.read(key: 'melora_access_token');
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }));
  final handler = await AudioService.init(
    builder: () => MeloraAudioHandler(dio: dio),
    config: const AudioServiceConfig(
      androidNotificationChannelId: 'com.melora.mobile.playback',
      androidNotificationChannelName: 'Melora playback',
      androidNotificationOngoing: true,
      androidStopForegroundOnPause: false,
    ),
  ) as MeloraAudioHandler;
  runApp(ProviderScope(
    overrides: [
      dioProvider.overrideWithValue(dio),
      secureStorageProvider.overrideWithValue(storage),
      audioHandlerProvider.overrideWithValue(handler),
    ],
    child: const MeloraApp(),
  ));
}
