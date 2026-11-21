import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/providers.dart';
import '../../core/models/song.dart';
import '../../core/playback/providers.dart';

class PlaylistDetailScreen extends ConsumerStatefulWidget {
  const PlaylistDetailScreen({super.key, required this.playlistId, required this.name});
  final String playlistId, name;
  @override
  ConsumerState<PlaylistDetailScreen> createState() => _PlaylistDetailScreenState();
}
class _PlaylistDetailScreenState extends ConsumerState<PlaylistDetailScreen> {
  bool _loading = true;
  String? _error;
  List<Song> _songs = [];
  String? _description;
  String? _visibility;
  @override
  void initState() { super.initState(); _load(); }
  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final response = await ref.read(dioProvider).get<Map<String, dynamic>>('/playlists/${widget.playlistId}', queryParameters: {'sort_by': 'position', 'order': 'asc', 'page': 1, 'page_size': 500});
      final data = response.data ?? const <String, dynamic>{};
      final songs = (data['songs'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().map(Song.fromJson).toList();
      if (mounted) setState(() { _songs = songs; _description = data['description'] as String?; _visibility = data['visibility'] as String?; });
    } catch (error) { if (mounted) setState(() => _error = error.toString()); }
    finally { if (mounted) setState(() => _loading = false); }
  }
  @override
  Widget build(BuildContext context) {
    final handler = ref.watch(audioHandlerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Playlist'), actions: [IconButton(onPressed: _load, icon: const Icon(Icons.refresh_rounded))]),
      body: _loading ? const Center(child: CircularProgressIndicator()) : _error != null
        ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Text('Could not load playlist'), TextButton(onPressed: _load, child: const Text('Retry'))]))
        : CustomScrollView(slivers: [
          SliverPadding(padding: const EdgeInsets.fromLTRB(20, 8, 20, 24), sliver: SliverList.list(children: [
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Container(width: 112, height: 112, decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(12)), child: const Icon(Icons.queue_music_rounded, size: 48)),
              const SizedBox(width: 16),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(_visibility?.toUpperCase() ?? 'PLAYLIST', style: Theme.of(context).textTheme.labelSmall?.copyWith(letterSpacing: 1.2)),
                const SizedBox(height: 5),
                Text(widget.name, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800), maxLines: 3, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 5), Text('${_songs.length} songs', style: Theme.of(context).textTheme.bodySmall),
              ])),
            ]),
            if (_description?.isNotEmpty == true) ...[const SizedBox(height: 12), Text(_description!)],
            const SizedBox(height: 18),
            Row(children: [
              FilledButton.icon(onPressed: _songs.isEmpty ? null : () => handler.playSongs(_songs), icon: const Icon(Icons.play_arrow_rounded), label: const Text('Play all')),
              const SizedBox(width: 10),
              OutlinedButton.icon(onPressed: _songs.isEmpty ? null : () => handler.playSongs(_songs, startIndex: 0), icon: const Icon(Icons.shuffle_rounded), label: const Text('Shuffle')),
            ]),
            const SizedBox(height: 18),
            if (_songs.isEmpty) const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('This playlist has no songs yet.'))),
            for (var index = 0; index < _songs.length; index++)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Text('${index + 1}', style: Theme.of(context).textTheme.labelMedium),
                title: Text(_songs[index].title, maxLines: 1, overflow: TextOverflow.ellipsis),
                subtitle: Text(_songs[index].uploader, maxLines: 1, overflow: TextOverflow.ellipsis),
                trailing: const Icon(Icons.play_arrow_rounded),
                onTap: () => handler.playSongs(_songs, startIndex: index),
              ),
          ])),
        ]),
    );
  }
}
