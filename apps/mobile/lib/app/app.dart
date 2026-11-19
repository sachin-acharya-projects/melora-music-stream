import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/auth/auth_controller.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';

class MeloraApp extends ConsumerWidget {
  const MeloraApp({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(authControllerProvider);
    return MaterialApp.router(
      title: 'Melora', debugShowCheckedModeBanner: false,
      theme: MeloraTheme.light, darkTheme: MeloraTheme.dark, themeMode: ThemeMode.system,
      routerConfig: ref.watch(appRouterProvider),
    );
  }
}
