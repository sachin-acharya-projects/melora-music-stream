import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/providers.dart';
import '../../core/models/song.dart';
import '../../core/playback/providers.dart';

class AlbumDetailScreen extends ConsumerStatefulWidget {
  const AlbumDetailScreen({super.key, required this.browseId});
  final String browseId;
  @override
  ConsumerState<AlbumDetailScreen> createState() => _AlbumDetailScreenState();
}
class _AlbumDetailScreenState extends ConsumerState<AlbumDetailScreen> {
  Map<String, dynamic> _album = {};
  List<Song> _tracks = [];
  bool _loading = true;
  String? _error;
  @override
  void initState() { super.initState(); _load(); }
  Future<void> _load() async {
    try {
      final response = await ref.read(dioProvider).get<Map<String, dynamic>>('/albums/${widget.browseId}');
      final data = response.data ?? const <String, dynamic>{};
      final album = data['album'];
      if (mounted) setState(() {
        _album = album is Map<String, dynamic> ? album : {};
        _tracks = (data['tracks'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().map(Song.fromJson).toList();
      });
    } catch (error) { if (mounted) setState(() => _error = error.toString()); }
    finally { if (mounted) setState(() => _loading = false); }
  }
  @override
  Widget build(BuildContext context) {
    final handler = ref.watch(audioHandlerProvider);
    final title = _album['title'] as String? ?? 'Album';
    final image = _album['thumbnail_url'] as String? ?? '';
    return Scaffold(
      appBar: AppBar(title: const Text('Album')),
      body: _loading ? const Center(child: CircularProgressIndicator()) : _error != null
        ? Center(child: Text(_error!))
        : CustomScrollView(slivers: [
          SliverPadding(padding: const EdgeInsets.all(20), sliver: SliverList.list(children: [
            Row(children: [
              ClipRRect(borderRadius: BorderRadius.circular(10), child: image.isEmpty ? Container(width: 112, height: 112, color: Theme.of(context).colorScheme.surfaceContainerHighest, child: const Icon(Icons.album_rounded, size: 48)) : CachedNetworkImage(imageUrl: image, width: 112, height: 112, fit: BoxFit.cover)),
              const SizedBox(width: 16),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('ALBUM', style: Theme.of(context).textTheme.labelSmall?.copyWith(letterSpacing: 1.5)),
                const SizedBox(height: 5),
                Text(title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
                Text(_album['artist_name'] as String? ?? '', style: Theme.of(context).textTheme.bodySmall),
              ])),
            ]),
            const SizedBox(height: 18),
            FilledButton.icon(onPressed: _tracks.isEmpty ? null : () => handler.playSongs(_tracks), icon: const Icon(Icons.play_arrow_rounded), label: const Text('Play album')),
            const SizedBox(height: 18),
            for (var i = 0; i < _tracks.length; i++) ListTile(
              contentPadding: EdgeInsets.zero, leading: Text('${i + 1}'),
              title: Text(_tracks[i].title, maxLines: 1, overflow: TextOverflow.ellipsis),
              subtitle: Text(_tracks[i].uploader), trailing: const Icon(Icons.play_arrow_rounded),
              onTap: () => handler.playSongs(_tracks, startIndex: i),
            ),
          ])),
        ]),
    );
  }
}
