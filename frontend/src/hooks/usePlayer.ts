import { type Song } from "@/types"
import { create } from "zustand"

interface PlayerStore {
    currentSong: Song | null
    playlist: Song[]
    currentIndex: number
    isPlaying: boolean
    repeatMode: "none" | "one" | "all"
    volume: number
    progress: number
    duration: number
    seekTime: number | null

    setPlaylist: (songs: Song[], startIndex: number) => void
    reorderPlaylist: (songs: Song[]) => void
    playNext: () => void
    playPrevious: () => void
    togglePlay: () => void
    setPlaying: (playing: boolean) => void
    setRepeatMode: (mode: "none" | "one" | "all") => void
    setProgress: (progress: number) => void
    setDuration: (duration: number) => void
    setVolume: (volume: number) => void
    seekTo: (time: number) => void
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
    currentSong: null,
    playlist: [],
    currentIndex: -1,
    isPlaying: false,
    repeatMode: "none",
    volume: 1,
    progress: 0,
    duration: 0,
    seekTime: null,

    setPlaylist: (songs, startIndex) => {
        set({
            playlist: songs,
            currentIndex: startIndex,
            currentSong: songs[startIndex],
            isPlaying: true,
            progress: 0,
        })
    },

    reorderPlaylist: (songs) => {
        const { currentSong } = get()
        const newIndex = currentSong ? songs.findIndex((s) => s.id === currentSong.id) : -1
        set({ playlist: songs, currentIndex: newIndex })
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
        set({
            currentIndex: nextIndex,
            currentSong: playlist[nextIndex],
            progress: 0,
            isPlaying: true,
        })
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
        set({
            currentIndex: prevIndex,
            currentSong: playlist[prevIndex],
            progress: 0,
            isPlaying: true,
        })
    },

    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
    setPlaying: (playing) => set({ isPlaying: playing }),
    setRepeatMode: (mode) => set({ repeatMode: mode }),
    setProgress: (progress) => set({ progress }),
    setDuration: (duration) => set({ duration }),
    setVolume: (volume) => set({ volume }),
    seekTo: (time) => set({ seekTime: time, progress: time }),
}))
