import { apiService } from "@/services/api.service"
import { playlistService } from "@/services/playlist.service"
import { type Song } from "@/types"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

// We wrap the song with a unique queueId to allow duplicates in the queue and reliable reordering
export interface PlaylistItem extends Song {
    queueId: string
}

interface PlayerStore {
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

    // Sync logic
    syncWithBackend: () => Promise<void>
    initialize: () => Promise<void>
}

const createPlaylistItem = (song: Song): PlaylistItem => ({
    ...song,
    queueId: crypto.randomUUID(),
})

export const usePlayerStore = create<PlayerStore>()(
    persist(
        (set, get) => ({
            currentSong: null,
            playlist: [],
            currentIndex: -1,
            isPlaying: false,
            repeatMode: "none",
            volume: 1,
            progress: 0,
            duration: 0,
            seekTime: null,
            lastPlaylistId: null,
            recentSongs: [],
            isInitialized: false,

            setPlaylist: (songs, startIndex, playlistId = null) => {
                const playlistItems = songs.map(createPlaylistItem)
                set({
                    playlist: playlistItems,
                    currentIndex: startIndex,
                    currentSong: playlistItems[startIndex],
                    isPlaying: true,
                    progress: 0,
                    lastPlaylistId: playlistId,
                })

                // Add to recent (original song object)
                const { recentSongs } = get()
                const song = songs[startIndex]
                const filteredRecent = recentSongs.filter((s) => s.id !== song.id)
                set({ recentSongs: [song, ...filteredRecent].slice(0, 50) })

                get().syncWithBackend()
            },

            reorderPlaylist: (items) => {
                const { currentSong } = get()
                const newIndex = currentSong
                    ? items.findIndex((item) => item.queueId === currentSong.queueId)
                    : -1
                set({ playlist: items, currentIndex: newIndex })
                get().syncWithBackend()
            },

            playNext: () => {
                const { playlist, currentIndex, repeatMode } = get()
                if (playlist.length === 0) return

                let nextIndex = currentIndex + 1
                if (nextIndex >= playlist.length) {
                    if (repeatMode === "all") {
                        nextIndex = 0
                    } else {
                        set({ isPlaying: false })
                        return
                    }
                }
                const nextItem = playlist[nextIndex]
                set({
                    currentIndex: nextIndex,
                    currentSong: nextItem,
                    progress: 0,
                    isPlaying: true,
                })

                // Add to recent
                const { recentSongs } = get()
                const filteredRecent = recentSongs.filter((s) => s.id !== nextItem.id)
                set({ recentSongs: [nextItem, ...filteredRecent].slice(0, 50) })

                get().syncWithBackend()
            },

            playPrevious: () => {
                const { playlist, currentIndex, progress } = get()
                if (playlist.length === 0) return

                if (progress > 3) {
                    set({ progress: 0, seekTime: 0 })
                    return
                }

                let prevIndex = currentIndex - 1
                if (prevIndex < 0) {
                    prevIndex = playlist.length - 1
                }
                const prevItem = playlist[prevIndex]
                set({
                    currentIndex: prevIndex,
                    currentSong: prevItem,
                    progress: 0,
                    isPlaying: true,
                })

                // Add to recent
                const { recentSongs } = get()
                const filteredRecent = recentSongs.filter((s) => s.id !== prevItem.id)
                set({ recentSongs: [prevItem, ...filteredRecent].slice(0, 50) })

                get().syncWithBackend()
            },

            addToQueue: (song) => {
                const { playlist, currentIndex } = get()
                const newItem = createPlaylistItem(song)
                const newPlaylist = [...playlist, newItem]
                set({ playlist: newPlaylist })

                if (currentIndex === -1 || !get().currentSong) {
                    set({
                        currentIndex: newPlaylist.length - 1,
                        currentSong: newItem,
                        isPlaying: true,
                    })
                }

                get().syncWithBackend()
            },

            togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
            setPlaying: (playing) => set({ isPlaying: playing }),
            setRepeatMode: (mode) => set({ repeatMode: mode }),
            setProgress: (progress) => set({ progress }),
            setDuration: (duration) => set({ duration }),
            setVolume: (volume) => set({ volume }),
            seekTo: (time) => set({ seekTime: time, progress: time }),

            syncWithBackend: async () => {
                const { currentSong, playlist, lastPlaylistId, recentSongs, isInitialized } = get()
                if (!isInitialized) return

                try {
                    await apiService.updateState({
                        last_song_id: currentSong?.id || null,
                        current_queue: playlist.map((s) => s.id),
                        last_playlist_id: lastPlaylistId,
                        recent_songs: recentSongs.map((s) => s.id),
                    })
                } catch (error) {
                    console.error("Failed to sync state with backend", error)
                }
            },

            initialize: async () => {
                try {
                    const state = await apiService.getState()

                    if (state.last_playlist_id) {
                        const playlist = await playlistService.getById(state.last_playlist_id)
                        if (playlist && playlist.songs.length > 0) {
                            const playlistItems = playlist.songs.map(createPlaylistItem)
                            const songIndex = state.last_song_id
                                ? playlist.songs.findIndex((s) => s.id === state.last_song_id)
                                : 0

                            set({
                                playlist: playlistItems,
                                currentIndex: songIndex >= 0 ? songIndex : 0,
                                currentSong:
                                    songIndex >= 0 ? playlistItems[songIndex] : playlistItems[0],
                                lastPlaylistId: state.last_playlist_id,
                                isInitialized: true,
                            })
                            return
                        }
                    }

                    set({ isInitialized: true })
                } catch (error) {
                    console.error("Failed to initialize player state from backend", error)
                    set({ isInitialized: true })
                }
            },
        }),
        {
            name: "melora-player-storage",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                playlist: state.playlist,
                currentSong: state.currentSong,
                currentIndex: state.currentIndex,
                volume: state.volume,
                repeatMode: state.repeatMode,
                lastPlaylistId: state.lastPlaylistId,
                recentSongs: state.recentSongs,
                progress: state.progress,
            }),
        },
    ),
)
