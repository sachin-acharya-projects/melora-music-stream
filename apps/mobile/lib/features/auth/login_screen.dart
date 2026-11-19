import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/auth_controller.dart';

class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(body: SafeArea(child: Center(child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 420),
      child: Padding(padding: const EdgeInsets.symmetric(horizontal: 28),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(width: 52, height: 52, decoration: BoxDecoration(color: const Color(0xFFE5484D), borderRadius: BorderRadius.circular(15)), child: const Icon(Icons.graphic_eq_rounded, color: Colors.white, size: 29)),
          const SizedBox(height: 36),
          Text('Your music,\nyour way.', style: Theme.of(context).textTheme.headlineLarge?.copyWith(fontSize: 38, height: 1.08, fontWeight: FontWeight.w800, letterSpacing: -1.4)),
          const SizedBox(height: 14),
          Text('Sign in to continue to your Melora library.', style: TextStyle(color: dark ? Colors.white60 : Colors.black54, height: 1.5)),
          const SizedBox(height: 36),
          SizedBox(width: double.infinity, height: 54, child: FilledButton.icon(
            onPressed: auth.isLoading ? null : () async {
              try { await ref.read(authControllerProvider.notifier).signIn(); }
              catch (error) { if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString()))); }
            },
            icon: const Icon(Icons.login_rounded), label: const Text('Continue with Google'),
          )),
          const SizedBox(height: 14),
          Text('Authentication opens in your system browser.', style: TextStyle(fontSize: 12, color: dark ? Colors.white38 : Colors.black45)),
        ]),
      ),
    ))));
  }
}
