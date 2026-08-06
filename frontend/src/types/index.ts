export interface Song {
    id: string
    title: string
    uploader: string
    thumbnail: string
    duration: number
    created_at: string
}

export type PlaylistVisibility = "public" | "private"

export interface Playlist {
    id: string
    name: string
    created_at: string
    songs: Song[]
    visibility?: PlaylistVisibility
    description?: string | null
    cover_image_url?: string | null
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
