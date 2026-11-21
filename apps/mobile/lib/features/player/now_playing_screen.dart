import 'package:audio_service/audio_service.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/playback/providers.dart';
import '../../core/playback/audio_handler.dart';

class NowPlayingScreen extends ConsumerWidget {
  const NowPlayingScreen({super.key});
  String _time(Duration duration) {
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return duration.inHours > 0 ? '${duration.inHours}:$minutes:$seconds' : '$minutes:$seconds';
  }
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final handler = ref.watch(audioHandlerProvider);
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 30), onPressed: () => Navigator.pop(context)),
        title: const Text('NOW PLAYING', style: TextStyle(fontSize: 11, letterSpacing: 1.8, fontWeight: FontWeight.w700)),
        centerTitle: true,
        actions: [IconButton(onPressed: () => _showQueue(context, handler), icon: const Icon(Icons.queue_music_rounded))],
      ),
      body: SafeArea(child: StreamBuilder(
        stream: handler.mediaItem,
        builder: (context, itemSnapshot) {
          final item = itemSnapshot.data;
          if (item == null) return const Center(child: Text('Nothing playing'));
          return Padding(padding: const EdgeInsets.fromLTRB(28, 12, 28, 24), child: Column(children: [
            const Spacer(),
            AspectRatio(aspectRatio: 1, child: ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: item.artUri == null
                ? Container(color: Theme.of(context).colorScheme.surfaceContainerHighest, child: const Icon(Icons.music_note_rounded, size: 100))
                : CachedNetworkImage(imageUrl: item.artUri.toString(), fit: BoxFit.cover, errorWidget: (_, __, ___) => Container(color: Theme.of(context).colorScheme.surfaceContainerHighest, child: const Icon(Icons.music_note_rounded, size: 100))),
            )),
            const SizedBox(height: 30),
            Align(alignment: Alignment.centerLeft, child: Text(item.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -.5))),
            const SizedBox(height: 6),
            Align(alignment: Alignment.centerLeft, child: Text(item.artist ?? 'Unknown artist', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Theme.of(context).hintColor))),
            const SizedBox(height: 24),
            StreamBuilder<PlaybackState>(
              stream: handler.playbackState,
              builder: (context, snapshot) {
                final state = snapshot.data;
                final total = item.duration ?? Duration.zero;
                final position = state?.updatePosition ?? Duration.zero;
                final max = total.inMilliseconds.toDouble().clamp(1.0, double.infinity).toDouble();
                return Column(children: [
                  Slider(
                    value: position.inMilliseconds.toDouble().clamp(0.0, max).toDouble(),
                    max: max,
                    onChanged: total == Duration.zero ? null : (value) => handler.seek(Duration(milliseconds: value.round())),
                  ),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text(_time(position), style: Theme.of(context).textTheme.labelSmall),
                    Text(_time(total), style: Theme.of(context).textTheme.labelSmall),
                  ]),
                ]);
              },
            ),
            const SizedBox(height: 12),
            StreamBuilder<PlaybackState>(
              stream: handler.playbackState,
              builder: (context, snapshot) {
                final state = snapshot.data;
                final playing = state?.playing ?? false;
                final shuffle = state?.shuffleMode == AudioServiceShuffleMode.all;
                return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  IconButton(onPressed: () => handler.setShuffleMode(shuffle ? AudioServiceShuffleMode.none : AudioServiceShuffleMode.all), color: shuffle ? Theme.of(context).colorScheme.primary : Theme.of(context).hintColor, icon: const Icon(Icons.shuffle_rounded)),
                  IconButton(onPressed: handler.skipToPrevious, iconSize: 34, icon: const Icon(Icons.skip_previous_rounded)),
                  SizedBox(width: 68, height: 68, child: FilledButton(
                    style: FilledButton.styleFrom(shape: const CircleBorder(), padding: EdgeInsets.zero),
                    onPressed: playing ? handler.pause : handler.play,
                    child: Icon(playing ? Icons.pause_rounded : Icons.play_arrow_rounded, size: 34),
                  )),
                  IconButton(onPressed: handler.skipToNext, iconSize: 34, icon: const Icon(Icons.skip_next_rounded)),
                  IconButton(onPressed: () => _showQueue(context, handler), color: dark ? Colors.white70 : Colors.black54, icon: const Icon(Icons.queue_music_rounded)),
                ]);
              },
            ),
            const Spacer(),
          ]));
        },
      )),
    );
  }
  void _showQueue(BuildContext context, MeloraAudioHandler handler) {
    showModalBottomSheet<void>(context: context, isScrollControlled: true, builder: (context) => SafeArea(child: SizedBox(
      height: MediaQuery.sizeOf(context).height * .65,
      child: Column(children: [
        Padding(padding: const EdgeInsets.all(18), child: Row(children: [
          Text('Up next', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          const Spacer(), IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
        ])),
        Expanded(child: StreamBuilder<List<MediaItem>>(
          stream: handler.queue,
          builder: (context, snapshot) {
            final items = snapshot.data ?? const <MediaItem>[];
            return ListView.builder(itemCount: items.length, itemBuilder: (context, index) {
              final item = items[index];
              final active = item.id == (handler.mediaItem.value?.id ?? '');
              return ListTile(
                leading: const Icon(Icons.music_note_rounded),
                title: Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                subtitle: Text(item.artist ?? ''),
                trailing: active ? const Icon(Icons.equalizer_rounded, color: Color(0xFFE5484D)) : null,
                onTap: () { handler.skipToQueueItem(index); Navigator.pop(context); },
              );
            });
          },
        )),
      ]),
    )));
  }
}
