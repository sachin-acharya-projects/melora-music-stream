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
  bool _loading = false;
  String? _error;

  @override
  void dispose() { _controller.dispose(); super.dispose(); }

  Future<void> _search() async {
    final query = _controller.text.trim();
    if (query.isEmpty) return;
    setState(() { _loading = true; _error = null; });
    try {
      final results = await ref.read(searchRepositoryProvider).search(query);
      if (mounted) setState(() => _results = results);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final songs = _results?.songs ?? const <Song>[];
    return CustomScrollView(slivers: [
      SliverPadding(padding: const EdgeInsets.fromLTRB(18, 22, 18, 32), sliver: SliverList.list(children: [
        Text('Search', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -.6)),
        const SizedBox(height: 16),
        TextField(
          controller: _controller,
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => _search(),
          decoration: InputDecoration(
            hintText: 'Songs, artists, albums…',
            prefixIcon: const Icon(Icons.search_rounded),
            suffixIcon: IconButton(onPressed: _loading ? null : _search, icon: const Icon(Icons.arrow_forward_rounded)),
            filled: true,
            fillColor: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: .6),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
          ),
        ),
        const SizedBox(height: 20),
        if (_loading) const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator())),
        if (_error != null) Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
        if (_results != null && songs.isEmpty) const Text('No playable songs found.'),
        if (songs.isNotEmpty) ...[
          Text('Songs', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          for (var i = 0; i < songs.length; i++)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: ClipRRect(
                borderRadius: BorderRadius.circular(7),
                child: songs[i].thumbnail.isEmpty
                  ? const SizedBox(width: 48, height: 48, child: Icon(Icons.music_note))
                  : Image.network(songs[i].thumbnail, width: 48, height: 48, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const SizedBox(width: 48, height: 48, child: Icon(Icons.music_note))),
              ),
              title: Text(songs[i].title, maxLines: 1, overflow: TextOverflow.ellipsis),
              subtitle: Text(songs[i].uploader, maxLines: 1, overflow: TextOverflow.ellipsis),
              trailing: const Icon(Icons.play_circle_outline_rounded),
              onTap: () => ref.read(audioHandlerProvider).playSongs(songs, startIndex: i),
            ),
        ],
      ])),
    ]);
  }
}
