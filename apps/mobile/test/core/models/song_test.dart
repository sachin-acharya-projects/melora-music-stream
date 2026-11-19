import 'package:flutter_test/flutter_test.dart';
import 'package:melora_mobile/core/models/song.dart';

void main() {
  group('Song.fromJson', () {
    test('maps backend song payload', () {
      final song = Song.fromJson({
        'id': 'video-123',
        'title': 'Track title',
        'uploader': 'Artist',
        'thumbnail': 'https://example.com/art.jpg',
        'duration': 187,
      });
      expect(song.id, 'video-123');
      expect(song.title, 'Track title');
      expect(song.uploader, 'Artist');
      expect(song.duration, 187);
    });

    test('uses safe defaults for optional fields', () {
      final song = Song.fromJson({'id': 'video-456'});
      expect(song.title, 'Unknown title');
      expect(song.uploader, 'Unknown artist');
      expect(song.thumbnail, isEmpty);
      expect(song.duration, 0);
    });
  });
}
