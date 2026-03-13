export interface Song {
    id: string
    title: string
    uploader: string
    thumbnail: string
    duration: number
}

export interface Playlist {
    id: string
    name: string
    songs: Song[]
}
