import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/providers.dart';
import '../../core/models/song.dart';
import '../../core/playback/providers.dart';
import 'home_repository.dart';

final homeRepositoryProvider = Provider<HomeRepository>((ref) => HomeRepository(ref.watch(dioProvider)));
final discoverFeedProvider = FutureProvider<DiscoverFeed>((ref) => ref.watch(homeRepositoryProvider).getFeed());
final recentSongsProvider = FutureProvider<List<Song>>((ref) => ref.watch(homeRepositoryProvider).getRecentSongs());

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key, required this.onSearch, required this.onLibrary});
  final VoidCallback onSearch, onLibrary;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feed = ref.watch(discoverFeedProvider);
    final recent = ref.watch(recentSongsProvider);
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(discoverFeedProvider);
        ref.invalidate(recentSongsProvider);
        await Future.wait([ref.read(discoverFeedProvider.future), ref.read(recentSongsProvider.future)]);
      },
      child: CustomScrollView(slivers: [
        SliverPadding(padding: const EdgeInsets.fromLTRB(20, 22, 20, 32), sliver: SliverList.list(children: [
          Text('MELORA', style: Theme.of(context).textTheme.labelLarge?.copyWith(letterSpacing: 2.2, fontWeight: FontWeight.w800, color: const Color(0xFFE5484D))),
          const SizedBox(height: 12),
          Text('Find your next\nfavourite track.', style: Theme.of(context).textTheme.headlineLarge?.copyWith(fontSize: 34, height: 1.08, fontWeight: FontWeight.w800, letterSpacing: -1.2)),
          const SizedBox(height: 20),
          Row(children: [
            Expanded(child: _QuickAction(icon: Icons.search_rounded, label: 'Search music', onTap: onSearch)),
            const SizedBox(width: 10),
            Expanded(child: _QuickAction(icon: Icons.library_music_outlined, label: 'Your library', onTap: onLibrary)),
          ]),
          const SizedBox(height: 28),
          recent.when(
            loading: () => const _SectionLoading(title: 'Recently played'),
            error: (_, __) => const SizedBox.shrink(),
            data: (songs) => songs.isEmpty ? const SizedBox.shrink() : _SongSection(title: 'Recently played', songs: songs),
          ),
          feed.when(
            loading: () => const _SectionLoading(title: 'Trending on Melora'),
            error: (error, _) => _InlineError(message: 'Could not load discovery: $error', onRetry: () => ref.invalidate(discoverFeedProvider)),
            data: (data) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (data.topSongs.isNotEmpty) _SongSection(title: 'Trending on Melora', songs: data.topSongs),
              if (data.newReleases.isNotEmpty) ...[
                const SizedBox(height: 28),
                _CoverSection(title: 'New releases', entries: data.newReleases.map((album) => _CoverEntry(title: album.title, subtitle: album.artists.join(', '), image: album.thumbnail, songs: album.songs)).toList()),
              ],
              if (data.moodPlaylists.isNotEmpty) ...[
                const SizedBox(height: 28),
                _CoverSection(title: 'Moods and mixes', entries: data.moodPlaylists.map((playlist) => _CoverEntry(title: playlist.title, subtitle: playlist.category ?? 'Curated playlist', image: playlist.thumbnail, songs: playlist.songs)).toList()),
              ],
            ]),
          ),
        ])),
      ]),
    );
  }
}
class _QuickAction extends StatelessWidget {
  const _QuickAction({required this.icon, required this.label, required this.onTap});
  final IconData icon; final String label; final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
    color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: .65),
    borderRadius: BorderRadius.circular(13),
    child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(13), child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 15),
      child: Row(children: [Icon(icon, color: const Color(0xFFE5484D), size: 19), const SizedBox(width: 9), Flexible(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)))]),
    )),
  );
}
class _SongSection extends ConsumerWidget {
  const _SongSection({required this.title, required this.songs});
  final String title; final List<Song> songs;
  @override
  Widget build(BuildContext context, WidgetRef ref) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
    const SizedBox(height: 12),
    SizedBox(height: 186, child: ListView.separated(
      scrollDirection: Axis.horizontal, itemCount: songs.length, separatorBuilder: (_, __) => const SizedBox(width: 12),
      itemBuilder: (context, index) {
        final song = songs[index];
        return SizedBox(width: 126, child: InkWell(
          onTap: () => ref.read(audioHandlerProvider).playSongs(songs, startIndex: index),
          borderRadius: BorderRadius.circular(10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            ClipRRect(borderRadius: BorderRadius.circular(9), child: _Artwork(url: song.thumbnail, width: 126, height: 126)),
            const SizedBox(height: 8),
            Text(song.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
            Text(song.uploader, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodySmall),
          ]),
        ));
      },
    )),
  ]);
}
class _CoverEntry {
  const _CoverEntry({required this.title, required this.subtitle, required this.image, required this.songs});
  final String title, subtitle, image; final List<Song> songs;
}
class _CoverSection extends ConsumerWidget {
  const _CoverSection({required this.title, required this.entries});
  final String title; final List<_CoverEntry> entries;
  @override
  Widget build(BuildContext context, WidgetRef ref) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
    const SizedBox(height: 12),
    SizedBox(height: 190, child: ListView.separated(
      scrollDirection: Axis.horizontal, itemCount: entries.length, separatorBuilder: (_, __) => const SizedBox(width: 12),
      itemBuilder: (context, index) {
        final item = entries[index];
        return SizedBox(width: 142, child: InkWell(
          onTap: item.songs.isEmpty ? null : () => ref.read(audioHandlerProvider).playSongs(item.songs),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            ClipRRect(borderRadius: BorderRadius.circular(9), child: _Artwork(url: item.image, width: 142, height: 142)),
            const SizedBox(height: 7),
            Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
            Text(item.subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodySmall),
          ]),
        ));
      },
    )),
  ]);
}
class _Artwork extends StatelessWidget {
  const _Artwork({required this.url, required this.width, required this.height});
  final String url; final double width, height;
  @override
  Widget build(BuildContext context) => url.isEmpty
    ? Container(width: width, height: height, color: Theme.of(context).colorScheme.surfaceContainerHighest, child: const Icon(Icons.music_note_rounded))
    : CachedNetworkImage(imageUrl: url, width: width, height: height, fit: BoxFit.cover, placeholder: (_, __) => Container(width: width, height: height, color: Theme.of(context).colorScheme.surfaceContainerHighest), errorWidget: (_, __, ___) => Container(width: width, height: height, color: Theme.of(context).colorScheme.surfaceContainerHighest, child: const Icon(Icons.music_note_rounded)));
}
class _SectionLoading extends StatelessWidget {
  const _SectionLoading({required this.title}); final String title;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 20), child: Row(children: [Text(title), const SizedBox(width: 12), const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))]));
}
class _InlineError extends StatelessWidget {
  const _InlineError({required this.message, required this.onRetry}); final String message; final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Row(children: [Expanded(child: Text(message, style: TextStyle(color: Theme.of(context).colorScheme.error))), TextButton(onPressed: onRetry, child: const Text('Retry'))]);
}
