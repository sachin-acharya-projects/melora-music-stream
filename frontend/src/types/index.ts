export interface Song {
    id: string
    title: string
    uploader: string
    thumbnail: string
    duration: number
    created_at: string
}

export type SearchResultType = "song" | "video" | "artist" | "album" | "playlist"

export interface SearchArtistItem {
    id: string | null
    name: string
    thumbnail: string
}

export interface SearchAlbumItem {
    id: string | null
    title: string
    artists: string[]
    year: number | null
    thumbnail: string
    audio_playlist_id: string | null
}

export interface SearchPlaylistItem {
    id: string | null
    title: string
    thumbnail: string
    song_count: number | null
}

export interface SearchTopResult {
    type: SearchResultType
    id?: string
    name?: string
    title?: string
    uploader?: string
    thumbnail?: string
    duration?: number
    artists?: string[]
    year?: number | null
    audio_playlist_id?: string | null
}

export interface SearchResults {
    top_result: SearchTopResult | null
    artists: SearchArtistItem[]
    songs: Song[]
    albums: SearchAlbumItem[]
    playlists: SearchPlaylistItem[]
    videos: Song[]
    cached: boolean
}

export type PlaylistVisibility = "public" | "private"

export interface Playlist {
    id: string
    name: string
    created_at: string
    songs?: Song[]
    song_count?: number
    total_duration?: number
    thumbnails?: string[]
    visibility?: PlaylistVisibility
    description?: string | null
    cover_image_url?: string | null
    source_url?: string | null
    follower_count?: number
    is_owner?: boolean
    is_following?: boolean
    is_collaborative?: boolean
    is_editor?: boolean
}

export interface PlaylistDetail extends Playlist {
    total: number
    total_songs: number
    total_duration: number
    songs: Song[]
}

export type CollaboratorRole = "viewer" | "editor"

export interface PlaylistCollaborator {
    user_id: string
    role: CollaboratorRole
    username: string | null
    display_name: string | null
    avatar_url: string | null
}

export interface UserSearchResult {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
}

export interface LyricLine {
    time: number | null
    text: string
}

export interface LyricsResponse {
    synced: boolean
    lines: LyricLine[]
    source?: "lrclib" | "ytmusic" | "captions" | null
}

export interface ArtistMoreInfo {
    description: string
    subscribers: number | null
    view_count: number | null
    video_count: number | null
    country: string | null
    is_verified: boolean | null
    handle: string | null
    channel_url: string | null
    links: string[]
}

export interface Artist {
    id: string
    name: string
    slug: string
    thumbnail_url: string | null
    bio: string | null
    genres: string[]
    monthly_listeners: number | null
    follower_count: number
    subscribers?: number | null
    is_following: boolean
    is_enriched: boolean
    is_from_youtube: boolean
    is_external?: boolean
    channel_id?: string | null
    play_count?: number
    reason?: string
    more_info?: ArtistMoreInfo | null
}

export interface ArtistSong {
    id: string
    title: string
    uploader: string
    thumbnail: string
    duration: number
    created_at: string | null
    played_at?: string | null
}

export interface ArtistDetail extends Artist {
    songs: ArtistSong[]
}

export interface ArtistAlbum {
    id: string | null
    name: string
    cover_image_url: string | null
    songs: ArtistSong[]
}

export interface ArtistListResponse {
    total: number
    items: Artist[]
}

export interface FeaturedArtistSection {
    key: "suggested" | "popular" | "top" | "most_followed" | "recent"
    title: string
    items: Artist[]
}

export interface ArtistFeaturedResponse {
    sections: FeaturedArtistSection[]
}

export interface ArtistSuggestedResponse {
    items: Artist[]
    total: number
}

export interface ArtistAlbumsResponse {
    albums: ArtistAlbum[]
}

export interface YouTubeArtist {
    channel_id: string
    name: string
    thumbnail: string
    subscribers: number | null
    url: string
    is_in_library: boolean
}

export interface YouTubeArtistSearchResponse {
    total: number
    items: YouTubeArtist[]
}

export interface StatSong {
    id: string
    title: string | null
    uploader: string | null
    thumbnail: string | null
    duration: number | null
}

export interface HistoryItem {
    id: string
    played_at: string | null
    play_duration: number | null
    context_playlist_id: string | null
    song: StatSong | null
}

export interface HistoryListResponse {
    total: number
    items: HistoryItem[]
}

export interface DayPlays {
    date: string
    plays: number
}

export interface TopSongStat {
    count: number
    song: StatSong
}

export interface TopArtistStat {
    name: string
    plays: number
}

export interface GenreStat {
    name: string
    plays: number
}

export interface StatsData {
    total_plays: number
    total_play_time: number
    plays_last_30_days: DayPlays[]
    top_songs: TopSongStat[]
    top_artists: TopArtistStat[]
    genres: GenreStat[]
    cached: boolean
}

export type NotificationChannel = "in_app" | "email" | "push"

export interface Notification {
    id: string
    channel: NotificationChannel
    type: string
    title: string
    message: string | null
    data: Record<string, unknown> | null
    is_read: boolean
    created_at: string
}

export interface NotificationListResponse {
    total: number
    unread_count: number
    items: Notification[]
}

export type NotificationEventSettings = Record<
    string,
    Record<NotificationChannel, boolean>
>

export interface AdminArtist extends Artist {
    is_featured: boolean
    is_published: boolean
}

export interface AdminSong extends Omit<Song, "created_at"> {
    is_featured: boolean
    is_published: boolean
    created_at: string | null
}

export interface AdminUser {
    id: string
    email: string
    username: string
    display_name: string | null
    avatar_url: string | null
    role: string
    is_active: boolean
    is_super_admin: boolean
    created_at: string | null
}

export interface AdminDashboard {
    artists_total: number
    artists_published: number
    artists_hidden: number
    artists_featured: number
    songs_total: number
    songs_published: number
    songs_hidden: number
    songs_featured: number
    users_total: number
    active_users: number
    total_plays: number
    plays_last_30_days: number
}

export interface AdminListResponse<T> {
    total: number
    items: T[]
}

export interface BatchImportItemResult {
    input: string
    status: "imported" | "already_exists" | "failed"
    name?: string
    channel_id?: string
    message?: string
}

export interface BatchImportResponse {
    total: number
    imported: number
    already_exists: number
    failed: number
    items: BatchImportItemResult[]
}

export interface PlaylistImportResponse {
    total: number
    imported: number
    skipped_existing: number
    failed: number
}
