import 'package:flutter/material.dart';
abstract final class MeloraColors {
  static const ink = Color(0xFF101014);
  static const surface = Color(0xFF19191F);
  static const accent = Color(0xFFE5484D);
  static const canvas = Color(0xFFF7F7F8);
}
abstract final class MeloraTheme {
  static ThemeData get dark => _build(Brightness.dark);
  static ThemeData get light => _build(Brightness.light);
  static ThemeData _build(Brightness brightness) {
    final dark = brightness == Brightness.dark;
    final scheme = ColorScheme.fromSeed(seedColor: MeloraColors.accent, brightness: brightness, primary: MeloraColors.accent, surface: dark ? MeloraColors.ink : Colors.white);
    return ThemeData(
      useMaterial3: true, brightness: brightness, colorScheme: scheme,
      scaffoldBackgroundColor: dark ? MeloraColors.ink : MeloraColors.canvas,
      appBarTheme: AppBarTheme(backgroundColor: dark ? MeloraColors.ink : MeloraColors.canvas, foregroundColor: dark ? Colors.white : MeloraColors.ink, elevation: 0, centerTitle: false),
      navigationBarTheme: NavigationBarThemeData(backgroundColor: dark ? MeloraColors.surface : Colors.white, indicatorColor: MeloraColors.accent.withValues(alpha: .14)),
      cardTheme: CardThemeData(color: dark ? MeloraColors.surface : Colors.white, elevation: 0, margin: EdgeInsets.zero, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
    );
  }
}
