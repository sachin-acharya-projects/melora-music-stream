import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/providers.dart';
import '../../core/models/song.dart';
import '../../core/playback/providers.dart';
import 'search_repository.dart';

final searchRepositoryProvider = Provider<SearchRepository>((ref) => SearchRepository(ref.watch(dioProvider)));

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});
  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}
class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  SearchResults? _results;
  List<String> _suggestions = [];
  bool _loading = false, _loadingSuggestions = false;
  String? _error;
  int _request = 0;

  @override
  void dispose() { _controller.dispose(); super.dispose(); }
  Future<void> _loadSuggestions(String value) async {
    if (value.trim().length < 2) { if (mounted) setState(() => _suggestions = []); return; }
    setState(() => _loadingSuggestions = true);
    try {
      final values = await ref.read(searchRepositoryProvider).suggestions(value.trim());
      if (mounted && _controller.text.trim() == value.trim()) setState(() => _suggestions = values);
    } catch (_) {
      if (mounted) setState(() => _suggestions = []);
    } finally { if (mounted) setState(() => _loadingSuggestions = false); }
  }
  Future<void> _search([String? value]) async {
    final query = (value ?? _controller.text).trim();
    if (query.isEmpty) return;
    _controller.text = query;
    final request = ++_request;
    setState(() { _loading = true; _error = null; _suggestions = []; });
    FocusScope.of(context).unfocus();
    try {
      final result = await ref.read(searchRepositoryProvider).search(query);
      if (mounted && request == _request) setState(() => _results = result);
    } catch (error) {
      if (mounted && request == _request) setState(() => _error = error.toString());
    } finally {
      if (mounted && request == _request) setState(() => _loading = false);
    }
  }
  Future<void> _playCollection(SearchCollection collection) async {
    if (collection.id == null || collection.id!.isEmpty) return;
    try {
      final songs = await ref.read(searchRepositoryProvider).getTracks(collection.id!);
      if (songs.isEmpty) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No playable tracks found.')));
        return;
      }
      await ref.read(audioHandlerProvider).playSongs(songs);
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not load tracks: $error')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final result = _results;
    final songs = result?.songs ?? const <Song>[];
    return CustomScrollView(slivers: [
      SliverPadding(padding: const EdgeInsets.fromLTRB(18, 22, 18, 32), sliver: SliverList.list(children: [
        Text('Search', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -.6)),
        const SizedBox(height: 14),
        TextField(
          controller: _controller, textInputAction: TextInputAction.search,
          onChanged: _loadSuggestions, onSubmitted: _search,
          decoration: InputDecoration(
            hintText: 'Songs, artists, albums…', isDense: true,
            prefixIcon: const Icon(Icons.search_rounded, size: 21),
            suffixIcon: IconButton(onPressed: _loading ? null : () => _search(), icon: const Icon(Icons.arrow_forward_rounded)),
            filled: true, fillColor: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: .6),
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: BorderSide.none),
          ),
        ),
        if (_loadingSuggestions && _suggestions.isEmpty) const LinearProgressIndicator(minHeight: 2),
        if (_suggestions.isNotEmpty) ...[
          const SizedBox(height: 5),
          for (final suggestion in _suggestions.take(5))
            ListTile(dense: true, leading: const Icon(Icons.history_rounded, size: 19), title: Text(suggestion), onTap: () => _search(suggestion)),
        ],
        const SizedBox(height: 18),
        if (_loading) const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator())),
        if (_error != null) Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
        if (result != null && result.songs.isEmpty && result.artists.isEmpty && result.albums.isEmpty && result.playlists.isEmpty)
          const Padding(padding: EdgeInsets.symmetric(vertical: 32), child: Center(child: Text('No results found.'))),
        if (result != null && songs.isNotEmpty) ...[
          _SectionHeading('Songs'),
          for (var i = 0; i < songs.length; i++) _SongTile(song: songs[i], onTap: () => ref.read(audioHandlerProvider).playSongs(songs, startIndex: i)),
        ],
        if (result != null && result.artists.isNotEmpty) ...[
          const SizedBox(height: 20), const _SectionHeading('Artists'),
          SizedBox(height: 132, child: ListView.separated(scrollDirection: Axis.horizontal, itemCount: result.artists.length, separatorBuilder: (_, __) => const SizedBox(width: 13), itemBuilder: (context, index) {
            final artist = result.artists[index];
            return SizedBox(width: 94, child: Column(children: [
              ClipOval(child: _Artwork(url: artist.thumbnail, width: 76, height: 76)),
              const SizedBox(height: 7), Text(artist.name, maxLines: 2, textAlign: TextAlign.center, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            ]));
          })),
        ],
        if (result != null && result.albums.isNotEmpty) ...[
          const SizedBox(height: 20), const _SectionHeading('Albums'),
          for (final album in result.albums) _CollectionTile(collection: album, onTap: () => _playCollection(album)),
        ],
        if (result != null && result.playlists.isNotEmpty) ...[
          const SizedBox(height: 20), const _SectionHeading('Playlists'),
          for (final playlist in result.playlists) _CollectionTile(collection: playlist, onTap: () => _playCollection(playlist)),
        ],
      ])),
    ]);
  }
}
class _SectionHeading extends StatelessWidget {
  const _SectionHeading(this.title); final String title;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 9), child: Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w750)));
}
class _SongTile extends StatelessWidget {
  const _SongTile({required this.song, required this.onTap}); final Song song; final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: EdgeInsets.zero, dense: true,
    leading: ClipRRect(borderRadius: BorderRadius.circular(7), child: _Artwork(url: song.thumbnail, width: 48, height: 48)),
    title: Text(song.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
    subtitle: Text(song.uploader, maxLines: 1, overflow: TextOverflow.ellipsis),
    trailing: const Icon(Icons.play_circle_outline_rounded), onTap: onTap,
  );
}
class _CollectionTile extends StatelessWidget {
  const _CollectionTile({required this.collection, required this.onTap}); final SearchCollection collection; final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: EdgeInsets.zero, dense: true,
    leading: ClipRRect(borderRadius: BorderRadius.circular(7), child: _Artwork(url: collection.thumbnail, width: 48, height: 48)),
    title: Text(collection.title, maxLines: 1, overflow: TextOverflow.ellipsis),
    subtitle: Text(collection.subtitle, maxLines: 1, overflow: TextOverflow.ellipsis),
    trailing: const Icon(Icons.play_arrow_rounded), onTap: onTap,
  );
}
class _Artwork extends StatelessWidget {
  const _Artwork({required this.url, required this.width, required this.height}); final String url; final double width, height;
  @override
  Widget build(BuildContext context) => url.isEmpty
    ? Container(width: width, height: height, color: Theme.of(context).colorScheme.surfaceContainerHighest, child: const Icon(Icons.music_note_rounded))
    : CachedNetworkImage(imageUrl: url, width: width, height: height, fit: BoxFit.cover, placeholder: (_, __) => Container(width: width, height: height, color: Theme.of(context).colorScheme.surfaceContainerHighest), errorWidget: (_, __, ___) => Container(width: width, height: height, color: Theme.of(context).colorScheme.surfaceContainerHighest, child: const Icon(Icons.music_note_rounded)));
}
