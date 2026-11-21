import 'package:dio/dio.dart';
import '../../core/models/song.dart';

class SearchArtist {
  const SearchArtist({required this.name, required this.thumbnail, this.id});
  final String name, thumbnail; final String? id;
  factory SearchArtist.fromJson(Map<String, dynamic> json) => SearchArtist(
    name: json['name'] as String? ?? 'Unknown artist',
    thumbnail: json['thumbnail'] as String? ?? '',
    id: json['id'] as String?,
  );
}
class SearchCollection {
  const SearchCollection({required this.id, required this.title, required this.thumbnail, this.subtitle = ''});
  final String? id; final String title, thumbnail, subtitle;
  factory SearchCollection.fromJson(Map<String, dynamic> json, {required bool album}) => SearchCollection(
    id: (album ? json['audio_playlist_id'] ?? json['id'] : json['id']) as String?,
    title: json['title'] as String? ?? 'Untitled',
    thumbnail: json['thumbnail'] as String? ?? '',
    subtitle: album ? (json['artists'] as List<dynamic>? ?? const []).whereType<String>().join(', ') : '${json['song_count'] ?? ''} songs',
  );
}
class SearchResults {
  const SearchResults({required this.songs, required this.videos, required this.artists, required this.albums, required this.playlists});
  final List<Song> songs, videos;
  final List<SearchArtist> artists;
  final List<SearchCollection> albums, playlists;
  factory SearchResults.fromJson(Map<String, dynamic> json) => SearchResults(
    songs: (json['songs'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().map(Song.fromJson).toList(),
    videos: (json['videos'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().map(Song.fromJson).toList(),
    artists: (json['artists'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().map(SearchArtist.fromJson).toList(),
    albums: (json['albums'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().map((item) => SearchCollection.fromJson(item, album: true)).toList(),
    playlists: (json['playlists'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().map((item) => SearchCollection.fromJson(item, album: false)).toList(),
  );
}
class SearchRepository {
  const SearchRepository(this._dio); final Dio _dio;
  Future<SearchResults> search(String query) async {
    final response = await _dio.get<Map<String, dynamic>>('/search/', queryParameters: {'q': query});
    return SearchResults.fromJson(response.data ?? const {});
  }
  Future<List<String>> suggestions(String query) async {
    final response = await _dio.get<List<dynamic>>('/search/suggestions', queryParameters: {'q': query});
    return (response.data ?? const []).whereType<String>().toList();
  }
  Future<List<Song>> getTracks(String playlistId) async {
    final response = await _dio.get<List<dynamic>>('/search/tracks', queryParameters: {'playlist_id': playlistId});
    return (response.data ?? const []).whereType<Map<String, dynamic>>().map(Song.fromJson).toList();
  }
}
