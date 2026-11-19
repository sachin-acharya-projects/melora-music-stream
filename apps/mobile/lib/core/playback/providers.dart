import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'audio_handler.dart';
final audioHandlerProvider = Provider<MeloraAudioHandler>(
  (ref) => throw StateError('Audio handler was not initialized.'),
);
