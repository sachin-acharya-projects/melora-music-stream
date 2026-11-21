import 'package:dio/dio.dart';
import '../../core/models/song.dart';

class DiscoverAlbum {
  const DiscoverAlbum({required this.id, required this.title, required this.artists, required this.thumbnail, required this.songs});
  final String id, title, thumbnail;
  final List<String> artists;
  final List<Song> songs;
  factory DiscoverAlbum.fromJson(Map<String, dynamic> json) => DiscoverAlbum(
    id: (json['audio_playlist_id'] ?? json['browse_id'] ?? '') as String,
    title: json['title'] as String? ?? 'Unknown album',
    artists: (json['artists'] as List<dynamic>? ?? const []).whereType<String>().toList(),
    thumbnail: json['thumbnail'] as String? ?? '',
    songs: (json['songs'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().map(Song.fromJson).toList(),
  );
}
class DiscoverPlaylist {
  const DiscoverPlaylist({required this.id, required this.title, required this.thumbnail, required this.songs, this.category});
  final String id, title, thumbnail;
  final String? category;
  final List<Song> songs;
  factory DiscoverPlaylist.fromJson(Map<String, dynamic> json) => DiscoverPlaylist(
    id: json['playlistId'] as String? ?? '',
    title: json['title'] as String? ?? 'Playlist',
    thumbnail: json['thumbnail'] as String? ?? '',
    category: json['category'] as String?,
    songs: (json['songs'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().map(Song.fromJson).toList(),
  );
}
class DiscoverFeed {
  const DiscoverFeed({required this.topSongs, required this.newReleases, required this.moodPlaylists});
  final List<Song> topSongs;
  final List<DiscoverAlbum> newReleases;
  final List<DiscoverPlaylist> moodPlaylists;
  factory DiscoverFeed.fromJson(Map<String, dynamic> json) => DiscoverFeed(
    topSongs: (json['top_songs'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().map(Song.fromJson).toList(),
    newReleases: (json['new_releases'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().map(DiscoverAlbum.fromJson).toList(),
    moodPlaylists: (json['mood_playlists'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().map(DiscoverPlaylist.fromJson).toList(),
  );
}
class HomeRepository {
  const HomeRepository(this._dio);
  final Dio _dio;
  Future<DiscoverFeed> getFeed() async {
    final response = await _dio.get<Map<String, dynamic>>('/discover/');
    return DiscoverFeed.fromJson(response.data ?? const {});
  }
  Future<List<Song>> getRecentSongs() async {
    final response = await _dio.get<List<dynamic>>('/history/recent', queryParameters: {'limit': 12});
    return (response.data ?? const []).whereType<Map<String, dynamic>>().map((item) {
      final nested = item['song'];
      return Song.fromJson(nested is Map<String, dynamic> ? nested : item);
    }).toList();
  }
}
