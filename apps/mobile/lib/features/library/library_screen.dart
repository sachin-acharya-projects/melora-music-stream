import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/providers.dart';
import '../../core/playback/providers.dart';
import 'album_detail_screen.dart';
import 'artist_detail_screen.dart';
import 'library_repository.dart';
import 'playlist_detail_screen.dart';

final libraryRepositoryProvider = Provider<LibraryRepository>((ref) => LibraryRepository(ref.watch(dioProvider)));
final playlistsProvider = FutureProvider<List<MeloraPlaylist>>((ref) => ref.watch(libraryRepositoryProvider).getPlaylists());
final followedArtistsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final response = await ref.watch(dioProvider).get<List<dynamic>>('/artists/following');
  return (response.data ?? const []).whereType<Map<String, dynamic>>().toList();
});
final favoriteAlbumsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final response = await ref.watch(dioProvider).get<List<dynamic>>('/albums/favorites');
  return (response.data ?? const []).whereType<Map<String, dynamic>>().toList();
});

class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});
  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}
class _LibraryScreenState extends ConsumerState<LibraryScreen> {
  String _tab = 'playlists';
  @override
  Widget build(BuildContext context) {
    final playlists = ref.watch(playlistsProvider);
    return Scaffold(
      body: SafeArea(child: CustomScrollView(slivers: [
        SliverPadding(padding: const EdgeInsets.fromLTRB(20, 22, 20, 32), sliver: SliverList.list(children: [
          Row(children: [
            Expanded(child: Text('Your library', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -.7))),
            if (_tab == 'playlists') IconButton(onPressed: () => _createPlaylist(context), icon: const Icon(Icons.add_rounded), tooltip: 'Create playlist'),
          ]),
          const SizedBox(height: 6),
          Text('Your playlists and saved music', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Theme.of(context).hintColor)),
          const SizedBox(height: 18),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'playlists', label: Text('Playlists'), icon: Icon(Icons.queue_music_rounded)),
              ButtonSegment(value: 'artists', label: Text('Artists'), icon: Icon(Icons.person_outline_rounded)),
              ButtonSegment(value: 'albums', label: Text('Albums'), icon: Icon(Icons.album_outlined)),
            ],
            selected: {_tab},
            showSelectedIcon: false,
            onSelectionChanged: (value) => setState(() => _tab = value.first),
          ),
          const SizedBox(height: 18),
          if (_tab == 'playlists') playlists.when(
            loading: () => const _LoadingState(),
            error: (error, _) => _ErrorState(message: error.toString(), onRetry: () => ref.invalidate(playlistsProvider)),
            data: (items) => items.isEmpty ? const _EmptyState(message: 'Your library is waiting', detail: 'Create a playlist to get started.') : Column(children: [for (final playlist in items) _PlaylistTile(playlist: playlist)]),
          ),
          if (_tab == 'artists') ref.watch(followedArtistsProvider).when(
            loading: () => const _LoadingState(),
            error: (error, _) => _ErrorState(message: error.toString(), onRetry: () => ref.invalidate(followedArtistsProvider)),
            data: (items) => items.isEmpty ? const _EmptyState(message: 'No followed artists yet', detail: 'Artists you follow will appear here.') : Column(children: [for (final artist in items) _ArtistTile(artist: artist)]),
          ),
          if (_tab == 'albums') ref.watch(favoriteAlbumsProvider).when(
            loading: () => const _LoadingState(),
            error: (error, _) => _ErrorState(message: error.toString(), onRetry: () => ref.invalidate(favoriteAlbumsProvider)),
            data: (items) => items.isEmpty ? const _EmptyState(message: 'No saved albums yet', detail: 'Albums you favorite will appear here.') : Column(children: [for (final item in items) if (item['album'] is Map<String, dynamic>) _AlbumTile(album: item['album'] as Map<String, dynamic>)]),
          ),
        ])),
      ])),
    );
  }
  Future<void> _createPlaylist(BuildContext context) async {
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
      leading: _Artwork(url: image, circular: false),
      title: Text(playlist.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text('${playlist.songCount} songs · ${playlist.visibility ?? 'private'}'),
      trailing: IconButton(onPressed: playlist.songs.isEmpty ? null : () => ref.read(audioHandlerProvider).playSongs(playlist.songs), icon: const Icon(Icons.play_circle_outline_rounded)),
      onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => PlaylistDetailScreen(playlistId: playlist.id, name: playlist.name))),
    );
  }
}
class _ArtistTile extends StatelessWidget {
  const _ArtistTile({required this.artist}); final Map<String, dynamic> artist;
  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: const EdgeInsets.symmetric(vertical: 4),
    leading: _Artwork(url: artist['thumbnail_url'] as String? ?? '', circular: true),
    title: Text(artist['name'] as String? ?? 'Artist', style: const TextStyle(fontWeight: FontWeight.w600)),
    subtitle: Text('${artist['follower_count'] ?? 0} followers'),
    trailing: const Icon(Icons.chevron_right_rounded),
    onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ArtistDetailScreen(artist: artist))),
  );
}
class _AlbumTile extends StatelessWidget {
  const _AlbumTile({required this.album}); final Map<String, dynamic> album;
  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: const EdgeInsets.symmetric(vertical: 4),
    leading: _Artwork(url: album['thumbnail_url'] as String? ?? '', circular: false),
    title: Text(album['title'] as String? ?? 'Album', style: const TextStyle(fontWeight: FontWeight.w600)),
    subtitle: Text(album['artist_name'] as String? ?? ''),
    trailing: const Icon(Icons.chevron_right_rounded),
    onTap: () {
      final browseId = album['browse_id'] as String?;
      if (browseId != null) Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => AlbumDetailScreen(browseId: browseId)));
    },
  );
}
class _Artwork extends StatelessWidget {
  const _Artwork({required this.url, required this.circular}); final String url; final bool circular;
  @override
  Widget build(BuildContext context) {
    final placeholder = Container(width: 54, height: 54, color: Theme.of(context).colorScheme.surfaceContainerHighest, child: Icon(circular ? Icons.person_rounded : Icons.queue_music_rounded));
    final child = url.isEmpty ? placeholder : CachedNetworkImage(imageUrl: url, width: 54, height: 54, fit: BoxFit.cover, errorWidget: (_, __, ___) => placeholder);
    return ClipRRect(borderRadius: BorderRadius.circular(circular ? 27 : 8), child: child);
  }
}
class _LoadingState extends StatelessWidget {
  const _LoadingState();
  @override
  Widget build(BuildContext context) => const Center(child: Padding(padding: EdgeInsets.all(30), child: CircularProgressIndicator()));
}
class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.message, required this.detail}); final String message, detail;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 48), child: Column(children: [
    Icon(Icons.library_music_outlined, size: 42, color: Theme.of(context).hintColor),
    const SizedBox(height: 12), Text(message),
    const SizedBox(height: 5), Text(detail, style: TextStyle(color: Theme.of(context).hintColor)),
  ]));
}
class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry}); final String message; final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Column(children: [Text(message), TextButton(onPressed: onRetry, child: const Text('Try again'))]);
}
