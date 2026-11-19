import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/playback/providers.dart';
import '../search/search_screen.dart';

class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key});
  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}
class _AppShellState extends ConsumerState<AppShell> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(ref.read(audioHandlerProvider).restoreQueue());
    });
  }
  static const _labels = ['Home', 'Search', 'Library', 'Profile'];
  static const _icons = [Icons.home_outlined, Icons.search_rounded, Icons.library_music_outlined, Icons.person_outline_rounded];

  @override
  Widget build(BuildContext context) {
    final handler = ref.watch(audioHandlerProvider);
    final pages = [
      const _HomeTab(),
      const SearchScreen(),
      const _TabMessage(title: 'Your library', detail: 'Playlists, artists and albums.'),
      _ProfileTab(onSignOut: () => ref.read(authControllerProvider.notifier).signOut()),
    ];
    return Scaffold(
      body: SafeArea(bottom: false, child: Stack(children: [
        Positioned.fill(child: IndexedStack(index: _index, children: pages)),
        StreamBuilder(
          stream: handler.mediaItem,
          builder: (context, snapshot) {
            final item = snapshot.data;
            if (item == null) return const SizedBox.shrink();
            return Positioned(left: 12, right: 12, bottom: 8, child: Material(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(13),
              child: Padding(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7), child: Row(children: [
                const Icon(Icons.music_note_rounded, color: Color(0xFFE5484D)),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  Text(item.artist ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodySmall),
                ])),
                StreamBuilder(stream: handler.playbackState, builder: (context, state) {
                  final playing = state.data?.playing ?? false;
                  return IconButton(visualDensity: VisualDensity.compact, onPressed: playing ? handler.pause : handler.play, icon: Icon(playing ? Icons.pause_rounded : Icons.play_arrow_rounded));
                }),
                IconButton(visualDensity: VisualDensity.compact, onPressed: handler.skipToNext, icon: const Icon(Icons.skip_next_rounded)),
              ])),
            ));
          },
        ),
      ])),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: [for (var i = 0; i < _labels.length; i++) NavigationDestination(icon: Icon(_icons[i]), selectedIcon: Icon(_icons[i]), label: _labels[i])],
      ),
    );
  }
}
class _HomeTab extends StatelessWidget {
  const _HomeTab();
  @override
  Widget build(BuildContext context) => CustomScrollView(slivers: [
    SliverPadding(padding: const EdgeInsets.fromLTRB(22, 24, 22, 100), sliver: SliverList.list(children: [
      Text('MELORA', style: Theme.of(context).textTheme.labelLarge?.copyWith(letterSpacing: 2.2, fontWeight: FontWeight.w800, color: const Color(0xFFE5484D))),
      const SizedBox(height: 16),
      Text('Good music.\nNo boundaries.', style: Theme.of(context).textTheme.headlineLarge?.copyWith(fontSize: 34, height: 1.08, fontWeight: FontWeight.w800, letterSpacing: -1.2)),
      const SizedBox(height: 12),
      Text('Your listening space, connected to your Melora server.', style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Theme.of(context).hintColor)),
      const SizedBox(height: 30),
      Text('Your music', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
      const SizedBox(height: 12),
      const _HomeAction(icon: Icons.search_rounded, title: 'Find something to play', subtitle: 'Search the Melora catalogue'),
      const SizedBox(height: 10),
      const _HomeAction(icon: Icons.library_music_outlined, title: 'Your collection', subtitle: 'Browse playlists, artists and albums'),
    ])),
  ]);
}
class _HomeAction extends StatelessWidget {
  const _HomeAction({required this.icon, required this.title, required this.subtitle});
  final IconData icon; final String title; final String subtitle;
  @override
  Widget build(BuildContext context) => Material(
    color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: .55),
    borderRadius: BorderRadius.circular(13),
    child: ListTile(contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      leading: Icon(icon, color: const Color(0xFFE5484D)), title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(subtitle), trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 15)),
  );
}
class _TabMessage extends StatelessWidget {
  const _TabMessage({required this.title, required this.detail});
  final String title; final String detail;
  @override
  Widget build(BuildContext context) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
    Text(title, style: Theme.of(context).textTheme.headlineMedium),
    const SizedBox(height: 8), Text(detail),
  ]));
}
class _ProfileTab extends StatelessWidget {
  const _ProfileTab({required this.onSignOut});
  final VoidCallback onSignOut;
  @override
  Widget build(BuildContext context) => Center(child: FilledButton.tonalIcon(
    onPressed: onSignOut, icon: const Icon(Icons.logout_rounded), label: const Text('Sign out'),
  ));
}
