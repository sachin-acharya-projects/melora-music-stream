import { usePlayerStore } from "@/hooks/usePlayer"
import { useEffect } from "react"

const SUPPORTED = typeof navigator !== "undefined" && "mediaSession" in navigator
const SEEK_STEP_SECONDS = 10

// Bridges the player to the OS media session (lock screen, hardware media
// keys, browser media controls). Metadata and playback state reflect the
// store, and media actions are translated back into store actions.
export function useMediaSession() {
    const currentSong = usePlayerStore((s) => s.currentSong)
    const isPlaying = usePlayerStore((s) => s.isPlaying)

    useEffect(() => {
        if (!SUPPORTED) return
        if (!currentSong) {
            navigator.mediaSession.metadata = null
            navigator.mediaSession.playbackState = "none"
            return
        }
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentSong.title,
            artist: currentSong.uploader,
            artwork: [{ src: currentSong.thumbnail }],
        })
    }, [currentSong])

    useEffect(() => {
        if (!SUPPORTED) return
        navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused"
    }, [isPlaying])

    useEffect(() => {
        if (!SUPPORTED) return
        const mediaSession = navigator.mediaSession

        mediaSession.setActionHandler("play", () => usePlayerStore.getState().setPlaying(true))
        mediaSession.setActionHandler("pause", () => usePlayerStore.getState().setPlaying(false))
        mediaSession.setActionHandler("previoustrack", () =>
            usePlayerStore.getState().playPrevious(),
        )
        mediaSession.setActionHandler("nexttrack", () => usePlayerStore.getState().playNext())
        mediaSession.setActionHandler("seekto", (details) => {
            if (details.seekTime !== null && details.seekTime !== undefined) {
                usePlayerStore.getState().seekTo(details.seekTime)
            }
        })
        mediaSession.setActionHandler("seekbackward", (details) => {
            const { progress } = usePlayerStore.getState()
            const offset = details.seekOffset ?? SEEK_STEP_SECONDS
            usePlayerStore.getState().seekTo(Math.max(0, progress - offset))
        })
        mediaSession.setActionHandler("seekforward", (details) => {
            const { progress, duration } = usePlayerStore.getState()
            const offset = details.seekOffset ?? SEEK_STEP_SECONDS
            const target = duration > 0 ? Math.min(duration, progress + offset) : progress + offset
            usePlayerStore.getState().seekTo(target)
        })

        return () => {
            mediaSession.setActionHandler("play", null)
            mediaSession.setActionHandler("pause", null)
            mediaSession.setActionHandler("previoustrack", null)
            mediaSession.setActionHandler("nexttrack", null)
            mediaSession.setActionHandler("seekto", null)
            mediaSession.setActionHandler("seekbackward", null)
            mediaSession.setActionHandler("seekforward", null)
        }
    }, [])
}
