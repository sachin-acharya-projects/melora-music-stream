import 'package:dio/dio.dart';
import '../../core/models/song.dart';

class SearchResults {
  const SearchResults({required this.songs, required this.artists, required this.albums, required this.playlists});
  final List<Song> songs;
  final List<Map<String, dynamic>> artists, albums, playlists;
  factory SearchResults.fromJson(Map<String, dynamic> json) => SearchResults(
    songs: (json['songs'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().map(Song.fromJson).toList(),
    artists: (json['artists'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().toList(),
    albums: (json['albums'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().toList(),
    playlists: (json['playlists'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().toList(),
  );
}
class SearchRepository {
  const SearchRepository(this._dio);
  final Dio _dio;
  Future<SearchResults> search(String query) async {
    final response = await _dio.get<Map<String, dynamic>>('/search/', queryParameters: {'q': query});
    return SearchResults.fromJson(response.data ?? const {});
  }
}
