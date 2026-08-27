import { usePlayerStore } from "@/hooks/usePlayer"
import { Capacitor } from "@capacitor/core"
import type { PluginListenerHandle } from "@capacitor/core"
import { useEffect } from "react"
import { BackgroundAudio, type BackgroundAudioAction } from "@/plugins/background-audio"

const SUPPORTED = typeof navigator !== "undefined" && "mediaSession" in navigator
const SEEK_STEP_SECONDS = 10
const isNative = Capacitor.isNativePlatform()

// Bridges the player to the OS media session (lock screen, hardware media
// keys, browser media controls). Metadata and playback state reflect the
// store, and media actions are translated back into store actions.
//
// On native (Capacitor Android) the web MediaSession API is a no-op for the OS,
// so a native BackgroundAudio plugin drives a foreground service + MediaSession
// that keeps the WebView <audio> playing in the background and shows controls.
export function useMediaSession() {
    const currentSong = usePlayerStore((s) => s.currentSong)
    const isPlaying = usePlayerStore((s) => s.isPlaying)

    // ---- Web / fallback: navigator.mediaSession ----
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

    // ---- Native: BackgroundAudio foreground service + MediaSession ----
    useEffect(() => {
        if (!isNative) return
        const handler = BackgroundAudio.addListener("action", (e: BackgroundAudioAction) => {
            const store = usePlayerStore.getState()
            if (e.action === "play") store.setPlaying(true)
            else if (e.action === "pause") store.setPlaying(false)
            else if (e.action === "next") store.playNext()
            else if (e.action === "previous") store.playPrevious()
            else if (e.action === "seek" && typeof e.time === "number") store.seekTo(e.time)
        })
        return () => {
            handler.then((h: PluginListenerHandle) => h.remove()).catch(() => {})
        }
    }, [])

    useEffect(() => {
        if (!isNative) return
        if (!currentSong) {
            BackgroundAudio.setPlaybackState({ state: "none" }).catch(() => {})
            return
        }
        BackgroundAudio.enable().catch(() => {})
        BackgroundAudio.setMetadata({
            title: currentSong.title,
            artist: currentSong.uploader ?? "",
        }).catch(() => {})
    }, [currentSong])

    useEffect(() => {
        if (!isNative) return
        BackgroundAudio.setPlaybackState({ state: isPlaying ? "playing" : "paused" }).catch(() => {})
    }, [isPlaying])

    useEffect(() => {
        if (!isNative) return
        const id = setInterval(() => {
            const s = usePlayerStore.getState()
            BackgroundAudio.setPositionState({
                duration: s.duration,
                position: s.progress,
                playbackRate: 1,
            }).catch(() => {})
        }, 5000)
        return () => clearInterval(id)
    }, [])
}
