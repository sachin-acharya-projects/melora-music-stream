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
