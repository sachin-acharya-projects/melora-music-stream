import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/providers.dart';
import '../../core/models/song.dart';
import '../../core/playback/providers.dart';

class ArtistDetailScreen extends ConsumerStatefulWidget {
  const ArtistDetailScreen({super.key, required this.artist});
  final Map<String, dynamic> artist;
  @override
  ConsumerState<ArtistDetailScreen> createState() => _ArtistDetailScreenState();
}
class _ArtistDetailScreenState extends ConsumerState<ArtistDetailScreen> {
  List<Song> _songs = [];
  bool _loading = true;
  String? _error;
  @override
  void initState() { super.initState(); _load(); }
  Future<void> _load() async {
    try {
      final slug = widget.artist['slug'] as String;
      final response = await ref.read(dioProvider).get<List<dynamic>>('/artists/$slug/songs');
      if (mounted) setState(() => _songs = (response.data ?? const []).whereType<Map<String, dynamic>>().map(Song.fromJson).toList());
    } catch (error) { if (mounted) setState(() => _error = error.toString()); }
    finally { if (mounted) setState(() => _loading = false); }
  }
  @override
  Widget build(BuildContext context) {
    final artist = widget.artist;
    final name = artist['name'] as String? ?? 'Artist';
    final image = artist['thumbnail_url'] as String? ?? '';
    final handler = ref.watch(audioHandlerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Artist')),
      body: CustomScrollView(slivers: [
        SliverPadding(padding: const EdgeInsets.all(20), sliver: SliverList.list(children: [
          Row(children: [
            ClipOval(child: image.isEmpty ? Container(width: 104, height: 104, color: Theme.of(context).colorScheme.surfaceContainerHighest, child: const Icon(Icons.person_rounded, size: 48)) : CachedNetworkImage(imageUrl: image, width: 104, height: 104, fit: BoxFit.cover)),
            const SizedBox(width: 18),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('ARTIST', style: Theme.of(context).textTheme.labelSmall?.copyWith(letterSpacing: 1.5)),
              const SizedBox(height: 5),
              Text(name, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
              Text('${artist['follower_count'] ?? 0} followers', style: Theme.of(context).textTheme.bodySmall),
            ])),
          ]),
          const SizedBox(height: 20),
          if (_songs.isNotEmpty) FilledButton.icon(onPressed: () => handler.playSongs(_songs), icon: const Icon(Icons.play_arrow_rounded), label: const Text('Play songs')),
          const SizedBox(height: 18),
          if (_loading) const Center(child: CircularProgressIndicator()),
          if (_error != null) Text(_error!),
          for (var i = 0; i < _songs.length; i++) ListTile(
            contentPadding: EdgeInsets.zero, leading: Text('${i + 1}'),
            title: Text(_songs[i].title, maxLines: 1, overflow: TextOverflow.ellipsis),
            subtitle: Text(_songs[i].uploader), trailing: const Icon(Icons.play_arrow_rounded),
            onTap: () => handler.playSongs(_songs, startIndex: i),
          ),
          if (!_loading && _songs.isEmpty && _error == null) const Center(child: Text('No tracks available for this artist.')),
        ])),
      ]),
    );
  }
}
