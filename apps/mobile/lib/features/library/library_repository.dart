import 'package:dio/dio.dart';
import '../../core/models/song.dart';

class MeloraPlaylist {
  const MeloraPlaylist({required this.id, required this.name, required this.songs, required this.songCount, required this.thumbnails, this.description, this.visibility, this.isOwner = false, this.isFollowing = false});
  final String id, name;
  final List<Song> songs;
  final int songCount;
  final List<String> thumbnails;
  final String? description, visibility;
  final bool isOwner, isFollowing;
  factory MeloraPlaylist.fromJson(Map<String, dynamic> json) => MeloraPlaylist(
    id: json['id'] as String, name: json['name'] as String? ?? 'Untitled playlist',
    songs: (json['songs'] as List<dynamic>? ?? const []).whereType<Map<String, dynamic>>().map(Song.fromJson).toList(),
    songCount: (json['song_count'] as num?)?.toInt() ?? (json['songs'] as List<dynamic>?)?.length ?? 0,
    thumbnails: (json['thumbnails'] as List<dynamic>? ?? const []).whereType<String>().toList(),
    description: json['description'] as String?, visibility: json['visibility'] as String?,
    isOwner: json['is_owner'] as bool? ?? false, isFollowing: json['is_following'] as bool? ?? false,
  );
}
class LibraryRepository {
  const LibraryRepository(this._dio); final Dio _dio;
  Future<List<MeloraPlaylist>> getPlaylists() async {
    final response = await _dio.get<List<dynamic>>('/playlists/', queryParameters: {'sort_by': 'created_at', 'order': 'desc'});
    return (response.data ?? const []).whereType<Map<String, dynamic>>().map(MeloraPlaylist.fromJson).toList();
  }
  Future<MeloraPlaylist> createPlaylist(String name) async {
    final response = await _dio.post<Map<String, dynamic>>('/playlists/', data: {'name': name});
    return MeloraPlaylist.fromJson(response.data ?? const {});
  }
}
