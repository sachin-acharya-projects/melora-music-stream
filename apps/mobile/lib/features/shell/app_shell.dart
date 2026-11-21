import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/playback/providers.dart';
import '../search/search_screen.dart';
import '../home/home_screen.dart';
import '../library/library_screen.dart';
import '../player/now_playing_screen.dart';

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
      HomeScreen(onSearch: () => setState(() => _index = 1), onLibrary: () => setState(() => _index = 2)),
      const SearchScreen(),
      const LibraryScreen(),
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
              child: InkWell(borderRadius: BorderRadius.circular(13), onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const NowPlayingScreen())), child: Padding(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7), child: Row(children: [
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
              ]))),
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
class _ProfileTab extends StatelessWidget {
  const _ProfileTab({required this.onSignOut});
  final VoidCallback onSignOut;
  @override
  Widget build(BuildContext context) => Center(child: FilledButton.tonalIcon(
    onPressed: onSignOut, icon: const Icon(Icons.logout_rounded), label: const Text('Sign out'),
  ));
}
