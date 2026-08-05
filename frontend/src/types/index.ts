export interface Song {
    id: string
    title: string
    uploader: string
    thumbnail: string
    duration: number
    created_at: string
}

export interface Playlist {
    id: string
    name: string
    created_at: string
    songs: Song[]
}

export interface PlaylistDetail extends Playlist {
    total: number
    total_songs: number
    total_duration: number
}

export interface LyricLine {
    time: number | null
    text: string
}

export interface LyricsResponse {
    synced: boolean
    lines: LyricLine[]
}
