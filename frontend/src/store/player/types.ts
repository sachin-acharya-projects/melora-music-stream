import { type Song } from "@/types"

// We wrap the song with a unique queueId to allow duplicates in the queue and reliable reordering
export interface PlaylistItem extends Song {
    queueId: string
}

export interface PlayerState {
    currentSong: PlaylistItem | null
    playlist: PlaylistItem[]
    currentIndex: number
    isPlaying: boolean
    repeatMode: "none" | "one" | "all"
    volume: number
    progress: number
    duration: number
    seekTime: number | null
    lastPlaylistId: string | null
    recentSongs: Song[]
    isInitialized: boolean
    shuffle: boolean
    unshuffledPlaylist: PlaylistItem[] | null
}

export interface PlayerStore extends PlayerState {
    setPlaylist: (songs: Song[], startIndex: number, playlistId?: string | null) => void
    reorderPlaylist: (items: PlaylistItem[]) => void
    playNext: () => void
    playPrevious: () => void
    togglePlay: () => void
    setPlaying: (playing: boolean) => void
    setRepeatMode: (mode: "none" | "one" | "all") => void
    setProgress: (progress: number) => void
    setDuration: (duration: number) => void
    setVolume: (volume: number) => void
    seekTo: (time: number) => void
    addToQueue: (song: Song) => void
    addToQueueNext: (song: Song) => void
    removeFromQueue: (queueId: string) => void
    toggleShuffle: () => void

    // Sync logic
    syncWithBackend: () => Promise<void>
    initialize: () => Promise<void>
    reset: () => void
}
