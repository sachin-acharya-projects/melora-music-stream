import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/providers.dart';

class _LyricLine {
  const _LyricLine({required this.text, this.time});
  final String text; final Duration? time;
  factory _LyricLine.fromJson(Map<String, dynamic> json) => _LyricLine(
    text: json['text'] as String? ?? '',
    time: (json['time'] as num?) == null ? null : Duration(milliseconds: ((json['time'] as num) * 1000).round()),
  );
}
class _Lyrics {
  const _Lyrics({required this.synced, required this.lines, this.source});
  final bool synced; final List<_LyricLine> lines; final String? source;
  factory _Lyrics.fromJson(Map<String, dynamic> json) => _Lyrics(
    synced: json['synced'] as bool? ?? false,
    lines: (json['lines'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().map(_LyricLine.fromJson).toList(),
    source: json['source'] as String?,
  );
}
final _lyricsProvider = FutureProvider.family<_Lyrics, String>((ref, songId) async {
  final response = await ref.watch(dioProvider).get<Map<String, dynamic>>('/songs/$songId/lyrics');
  return _Lyrics.fromJson(response.data ?? const {});
});

class LyricsSheet extends ConsumerWidget {
  const LyricsSheet({super.key, required this.songId});
  final String songId;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lyrics = ref.watch(_lyricsProvider(songId));
    return SafeArea(child: SizedBox(
      height: MediaQuery.sizeOf(context).height * .82,
      child: Column(children: [
        Padding(padding: const EdgeInsets.fromLTRB(20, 16, 12, 12), child: Row(children: [
          Text('Lyrics', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          const Spacer(), IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
        ])),
        Expanded(child: lyrics.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Text('Could not load lyrics: $error'))),
          data: (data) => data.lines.isEmpty
            ? const Center(child: Text('Lyrics are not available for this track.'))
            : StreamBuilder(
                stream: ref.read(audioHandlerProvider).playbackState,
                builder: (context, snapshot) {
                  final position = snapshot.data?.updatePosition ?? Duration.zero;
                  var active = -1;
                  if (data.synced) {
                    for (var i = 0; i < data.lines.length; i++) {
                      final time = data.lines[i].time;
                      if (time != null && time <= position) active = i;
                    }
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.fromLTRB(22, 12, 22, 32),
                    itemCount: data.lines.length,
                    itemBuilder: (context, index) {
                      final line = data.lines[index];
                      final isActive = index == active;
                      return Padding(padding: const EdgeInsets.symmetric(vertical: 10), child: Text(
                        line.text.isEmpty ? ' ' : line.text,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontSize: isActive ? 23 : 18,
                          height: 1.35,
                          fontWeight: isActive ? FontWeight.w800 : FontWeight.w500,
                          color: isActive ? Theme.of(context).colorScheme.primary : Theme.of(context).hintColor,
                        ),
                      ));
                    },
                  );
                },
              ),
        )),
        if (lyrics.valueOrNull?.source != null) Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Text('Source: ${lyrics.valueOrNull!.source}', style: Theme.of(context).textTheme.labelSmall),
        ),
      ]),
    ));
  }
}
