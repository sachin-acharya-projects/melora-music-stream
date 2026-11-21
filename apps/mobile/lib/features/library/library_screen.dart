import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/providers.dart';
import '../../core/playback/providers.dart';
import 'library_repository.dart';
import 'playlist_detail_screen.dart';

final libraryRepositoryProvider = Provider<LibraryRepository>((ref) => LibraryRepository(ref.watch(dioProvider)));
final playlistsProvider = FutureProvider<List<MeloraPlaylist>>((ref) => ref.watch(libraryRepositoryProvider).getPlaylists());

class LibraryScreen extends ConsumerWidget {
  const LibraryScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final playlists = ref.watch(playlistsProvider);
    return Scaffold(
      body: SafeArea(child: CustomScrollView(slivers: [
        SliverPadding(padding: const EdgeInsets.fromLTRB(20, 22, 20, 28), sliver: SliverList.list(children: [
          Row(children: [
            Expanded(child: Text('Your library', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -.7))),
            IconButton(onPressed: () => _createPlaylist(context, ref), icon: const Icon(Icons.add_rounded), tooltip: 'Create playlist'),
          ]),
          const SizedBox(height: 6),
          Text('Your playlists and saved music', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Theme.of(context).hintColor)),
          const SizedBox(height: 20),
          playlists.when(
            loading: () => const Center(child: Padding(padding: EdgeInsets.all(30), child: CircularProgressIndicator())),
            error: (error, _) => _ErrorState(message: error.toString(), onRetry: () => ref.invalidate(playlistsProvider)),
            data: (items) => items.isEmpty
              ? const _EmptyLibrary()
              : Column(children: [for (final playlist in items) _PlaylistTile(playlist: playlist)]),
          ),
        ])),
      ])),
    );
  }
  Future<void> _createPlaylist(BuildContext context, WidgetRef ref) async {
    final controller = TextEditingController();
    final name = await showDialog<String>(context: context, builder: (context) => AlertDialog(
      title: const Text('Create playlist'),
      content: TextField(controller: controller, autofocus: true, textCapitalization: TextCapitalization.sentences, decoration: const InputDecoration(hintText: 'Playlist name')),
      actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Create'))],
    ));
    controller.dispose();
    if (name == null || name.isEmpty) return;
    try {
      await ref.read(libraryRepositoryProvider).createPlaylist(name);
      ref.invalidate(playlistsProvider);
    } catch (error) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not create playlist: $error')));
    }
  }
}
class _PlaylistTile extends ConsumerWidget {
  const _PlaylistTile({required this.playlist}); final MeloraPlaylist playlist;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final image = playlist.thumbnails.isNotEmpty ? playlist.thumbnails.first : '';
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(vertical: 4),
      leading: ClipRRect(borderRadius: BorderRadius.circular(8), child: image.isEmpty
        ? Container(width: 54, height: 54, color: Theme.of(context).colorScheme.surfaceContainerHighest, child: const Icon(Icons.queue_music_rounded))
        : CachedNetworkImage(imageUrl: image, width: 54, height: 54, fit: BoxFit.cover, errorWidget: (_, __, ___) => const Icon(Icons.queue_music_rounded))),
      title: Text(playlist.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text('${playlist.songCount} songs · ${playlist.visibility ?? 'private'}'),
      trailing: IconButton(onPressed: playlist.songs.isEmpty ? null : () => ref.read(audioHandlerProvider).playSongs(playlist.songs), icon: const Icon(Icons.play_circle_outline_rounded)),
      onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => PlaylistDetailScreen(playlistId: playlist.id, name: playlist.name))),
    );
  }
}
class _EmptyLibrary extends StatelessWidget {
  const _EmptyLibrary();
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 48), child: Column(children: [
    Icon(Icons.library_music_outlined, size: 42, color: Theme.of(context).hintColor),
    const SizedBox(height: 12), const Text('Your library is waiting'),
    const SizedBox(height: 5), Text('Create a playlist to get started.', style: TextStyle(color: Colors.grey)),
  ]));
}
class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry}); final String message; final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Column(children: [Text(message), TextButton(onPressed: onRetry, child: const Text('Try again'))]);
}
