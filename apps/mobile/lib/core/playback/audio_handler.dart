import 'dart:async';
import 'package:audio_service/audio_service.dart';
import 'package:audio_session/audio_session.dart';
import 'package:dio/dio.dart';
import 'package:just_audio/just_audio.dart';
import '../models/song.dart';

class MeloraAudioHandler extends BaseAudioHandler with QueueHandler, SeekHandler {
  MeloraAudioHandler({required Dio dio}) : _dio = dio {
    _player.playbackEventStream.listen((_) => _publishState());
    _player.playerStateStream.listen((_) => _publishState());
    unawaited(_configureSession());
  }
  final Dio _dio;
  final AudioPlayer _player = AudioPlayer();
  int _queueIndex = 0;
  String? _loadedId;
  bool _resumeAfterInterruption = false;

  Future<void> _configureSession() async {
    final session = await AudioSession.instance;
    await session.configure(const AudioSessionConfiguration.music());
    session.interruptionEventStream.listen((event) async {
      if (event.begin) { _resumeAfterInterruption = _player.playing; await pause(); }
      else if (_resumeAfterInterruption) { _resumeAfterInterruption = false; await play(); }
    });
    session.becomingNoisyEventStream.listen((_) => pause());
  }
  MediaItem _item(Song song) => MediaItem(
    id: song.id, title: song.title, artist: song.uploader,
    artUri: song.thumbnail.isEmpty ? null : Uri.tryParse(song.thumbnail),
    duration: song.duration > 0 ? Duration(seconds: song.duration) : null,
  );
  Future<void> playSongs(List<Song> songs, {int startIndex = 0}) async {
    if (songs.isEmpty) return;
    final items = songs.map(_item).toList(growable: false);
    queue.add(items);
    _queueIndex = startIndex.clamp(0, items.length - 1);
    await _loadAndPlay(items[_queueIndex]);
  }
  Future<void> _loadAndPlay(MediaItem item) async {
    mediaItem.add(item);
    playbackState.add(playbackState.value.copyWith(processingState: AudioProcessingState.loading, playing: false, queueIndex: _queueIndex));
    final response = await _dio.get<Map<String, dynamic>>('/stream/' + Uri.encodeComponent(item.id));
    final url = response.data?['url'] as String?;
    if (url == null || url.isEmpty) throw StateError('Backend returned no stream URL.');
    await _player.setAudioSource(AudioSource.uri(Uri.parse(url)));
    _loadedId = item.id;
    await _player.play();
  }
  @override
  Future<void> play() async {
    final item = mediaItem.value;
    if (item == null) return;
    if (_loadedId != item.id || _player.processingState == ProcessingState.idle) await _loadAndPlay(item);
    else await _player.play();
  }
  @override
  Future<void> pause() => _player.pause();
  @override
  Future<void> stop() async { await _player.stop(); await super.stop(); }
  @override
  Future<void> seek(Duration position) => _player.seek(position);
  @override
  Future<void> skipToNext() async {
    final items = queue.value;
    if (_queueIndex + 1 < items.length) { _queueIndex++; await _loadAndPlay(items[_queueIndex]); }
  }
  @override
  Future<void> skipToPrevious() async {
    if (_player.position > const Duration(seconds: 3)) { await seek(Duration.zero); return; }
    if (_queueIndex > 0) { _queueIndex--; await _loadAndPlay(queue.value[_queueIndex]); }
  }
  @override
  Future<void> skipToQueueItem(int index) async {
    final items = queue.value;
    if (index < 0 || index >= items.length) return;
    _queueIndex = index;
    await _loadAndPlay(items[index]);
  }
  @override
  Future<void> updateQueue(List<MediaItem> items) async {
    queue.add(items);
    if (items.isEmpty) { _queueIndex = 0; await _player.stop(); mediaItem.add(null); }
    else if (_queueIndex >= items.length) _queueIndex = items.length - 1;
    _publishState();
  }
  @override
  Future<void> setRepeatMode(AudioServiceRepeatMode mode) async {
    await _player.setLoopMode(switch (mode) {
      AudioServiceRepeatMode.one => LoopMode.one,
      AudioServiceRepeatMode.all => LoopMode.all,
      _ => LoopMode.off,
    });
    await super.setRepeatMode(mode);
  }
  @override
  Future<void> setShuffleMode(AudioServiceShuffleMode mode) async {
    await _player.setShuffleModeEnabled(mode == AudioServiceShuffleMode.all);
    await super.setShuffleMode(mode);
  }
  void _publishState() {
    final processing = switch (_player.processingState) {
      ProcessingState.idle => AudioProcessingState.idle,
      ProcessingState.loading => AudioProcessingState.loading,
      ProcessingState.buffering => AudioProcessingState.buffering,
      ProcessingState.ready => AudioProcessingState.ready,
      ProcessingState.completed => AudioProcessingState.completed,
    };
    final playing = _player.playing;
    playbackState.add(PlaybackState(
      controls: [MediaControl.skipToPrevious, playing ? MediaControl.pause : MediaControl.play, MediaControl.skipToNext],
      systemActions: const {MediaAction.seek, MediaAction.seekForward, MediaAction.seekBackward},
      androidCompactActionIndices: const [0, 1, 2],
      processingState: processing, playing: playing,
      updatePosition: _player.position, bufferedPosition: _player.bufferedPosition,
      speed: _player.speed, queueIndex: _queueIndex,
    ));
  }
  Future<void> dispose() => _player.dispose();
}
