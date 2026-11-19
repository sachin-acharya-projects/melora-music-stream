class Song {
  const Song({required this.id, required this.title, required this.uploader, required this.thumbnail, this.duration = 0});
  final String id, title, uploader, thumbnail;
  final int duration;
  factory Song.fromJson(Map<String, dynamic> json) => Song(
    id: json['id'] as String, title: json['title'] as String? ?? 'Unknown title',
    uploader: json['uploader'] as String? ?? 'Unknown artist',
    thumbnail: json['thumbnail'] as String? ?? '',
    duration: (json['duration'] as num?)?.round() ?? 0,
  );
}
