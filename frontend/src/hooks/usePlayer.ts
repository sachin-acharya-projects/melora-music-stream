import { createPlaylistItem } from "@/store/player/playlist-item"
import { MAX_RECENT, restorePlayerState, syncPlayerState } from "@/store/player/state-sync"
import { type PlayerStore } from "@/store/player/types"
import { type Song } from "@/types"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { rewriteThumbnails } from "@/utils/thumbnail"

export type { PlaylistItem } from "@/store/player/types"

const addRecentSong = (recentSongs: Song[], song: Song): Song[] => {
    const filteredRecent = recentSongs.filter((s) => s.id !== song.id)
    return [song, ...filteredRecent].slice(0, MAX_RECENT)
}

const mergeRecentSongs = (local: Song[], server: Song[]): Song[] => {
    const seen = new Set<string>()
    const merged: Song[] = []
    for (const song of [...server, ...local]) {
        if (song && song.id && !seen.has(song.id)) {
            seen.add(song.id)
            merged.push(song)
        }
    }
    return merged.slice(0, MAX_RECENT)
}

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
            shuffle: false,
            unshuffledPlaylist: null,

            setPlaylist: (songs, startIndex, playlistId = null) => {
                const playlistItems = songs.map(createPlaylistItem)
                set({
                    playlist: playlistItems,
                    currentIndex: startIndex,
                    currentSong: playlistItems[startIndex],
                    isPlaying: true,
                    progress: 0,
                    lastPlaylistId: playlistId,
                    recentSongs: addRecentSong(get().recentSongs, songs[startIndex]),
                })
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
                    recentSongs: addRecentSong(get().recentSongs, nextItem),
                })
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
                    recentSongs: addRecentSong(get().recentSongs, prevItem),
                })
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

            addToQueueNext: (song) => {
                const { playlist, currentIndex } = get()
                const newItem = createPlaylistItem(song)
                const insertAt = currentIndex === -1 ? playlist.length : currentIndex + 1
                const newPlaylist = [
                    ...playlist.slice(0, insertAt),
                    newItem,
                    ...playlist.slice(insertAt),
                ]
                set({ playlist: newPlaylist })

                if (currentIndex === -1) {
                    set({ currentIndex: insertAt, currentSong: newItem, isPlaying: true })
                }

                get().syncWithBackend()
            },

            removeFromQueue: (queueId) => {
                const { playlist, currentIndex, currentSong } = get()
                const removeIndex = playlist.findIndex((item) => item.queueId === queueId)
                if (removeIndex === -1) return

                const newPlaylist = playlist.filter((item) => item.queueId !== queueId)

                if (currentSong?.queueId === queueId) {
                    if (newPlaylist.length === 0) {
                        set({
                            playlist: [],
                            currentSong: null,
                            currentIndex: -1,
                            isPlaying: false,
                            progress: 0,
                            unshuffledPlaylist: null,
                            shuffle: false,
                        })
                        get().syncWithBackend()
                        return
                    }
                    const newIndex = Math.min(removeIndex, newPlaylist.length - 1)
                    set({
                        playlist: newPlaylist,
                        currentIndex: newIndex,
                        currentSong: newPlaylist[newIndex],
                        isPlaying: true,
                        progress: 0,
                    })
                    get().syncWithBackend()
                    return
                }

                const newIndex = removeIndex < currentIndex ? currentIndex - 1 : currentIndex
                set({ playlist: newPlaylist, currentIndex: newIndex })
                get().syncWithBackend()
            },

            toggleShuffle: () => {
                const { playlist, currentIndex, currentSong, shuffle, unshuffledPlaylist } = get()

                if (shuffle) {
                    const restored = unshuffledPlaylist ?? playlist
                    const newIndex = currentSong
                        ? restored.findIndex((item) => item.queueId === currentSong.queueId)
                        : 0
                    set({
                        shuffle: false,
                        playlist: restored,
                        currentIndex: newIndex >= 0 ? newIndex : 0,
                        unshuffledPlaylist: null,
                    })
                } else {
                    const others = playlist.filter((_, i) => i !== currentIndex)
                    for (let i = others.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1))
                        ;[others[i], others[j]] = [others[j], others[i]]
                    }
                    const newPlaylist = currentSong ? [currentSong, ...others] : others
                    set({
                        shuffle: true,
                        playlist: newPlaylist,
                        currentIndex: 0,
                        unshuffledPlaylist: playlist,
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
                if (!get().isInitialized) return
                try {
                    await syncPlayerState(get())
                } catch (error) {
                    console.error("Failed to sync state with backend", error)
                }
            },

            initialize: async () => {
                try {
                    const restored = await restorePlayerState()
                    set((state) => ({
                        ...restored,
                        recentSongs: mergeRecentSongs(
                            state.recentSongs,
                            restored.recentSongs ?? [],
                        ),
                        isInitialized: true,
                    }))
                } catch (error) {
                    console.error("Failed to initialize player state from backend", error)
                    set({ isInitialized: true })
                }
            },

            reset: () => {
                usePlayerStore.persist.clearStorage()
                set({
                    currentSong: null,
                    playlist: [],
                    currentIndex: -1,
                    isPlaying: false,
                    repeatMode: "none",
                    progress: 0,
                    duration: 0,
                    seekTime: null,
                    lastPlaylistId: null,
                    recentSongs: [],
                    isInitialized: false,
                    shuffle: false,
                    unshuffledPlaylist: null,
                })
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
            // Persisted state may predate the thumbnail proxy, so route any
            // stored Google artwork URLs through the backend on rehydrate.
            merge: (persisted, current) => {
                const merged = {
                    ...(current as object),
                    ...(persisted as object),
                }
                return rewriteThumbnails(merged) as PlayerStore
            },
        },
    ),
)
