import { MiniPlayer } from "@/components/audio-player/mini-player"
import { usePlayerStore } from "@/hooks/usePlayer"
import { useStreaming } from "@/hooks/useStreaming"
import { useRecordListen, useUpdatePlayDuration } from "@/hooks/useHistory"
import { AnimatePresence } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"

// A listen only counts as "recently played" once the user has listened past a
// threshold: 30 seconds or half the track, whichever is reached first.
const MIN_LISTEN_SECONDS = 30
const LISTEN_FRACTION = 0.5

function listenThresholdSeconds(duration: number | null | undefined): number {
    if (!duration || !Number.isFinite(duration) || duration <= 0) {
        return MIN_LISTEN_SECONDS
    }
    return Math.min(MIN_LISTEN_SECONDS, Math.max(1, duration * LISTEN_FRACTION))
}

export default function AudioPlayer() {
    const {
        currentSong,
        isPlaying,
        togglePlay,
        playNext,
        playPrevious,
        repeatMode,
        setRepeatMode,
        progress,
        setProgress,
        duration,
        setDuration,
        setPlaying,
        seekTime,
        volume,
    } = usePlayerStore()

    const location = useLocation()
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isBuffering, setIsBuffering] = useState(false)
    const recordListen = useRecordListen()
    const updatePlayDuration = useUpdatePlayDuration()

    // The useMutation result is a fresh object every render; keep a stable ref
    // to its mutate function so the listen effect below only reacts to
    // progress/currentSong changes (otherwise it re-fires on every render).
    const recordListenRef = useRef(recordListen.mutateAsync)

    useEffect(() => {
        recordListenRef.current = recordListen.mutateAsync
    }, [recordListen.mutateAsync])

    // Tracks the history entry for the song currently being listened to. An
    // entry is only created once the user has listened past a threshold, then
    // its play_duration is filled in when the song ends or is skipped.
    // `recording` guards against a second POST while the first is in flight.
    const pendingListenRef = useRef<{
        songId: string
        entryId: string | null
        recording: boolean
        failed: boolean
    } | null>(null)

    const isNowPlayingPage = location.pathname === "/now-playing"

    const { data: streamData, isLoading: isFetchingUrl } = useStreaming(currentSong?.id)

    const streamUrl = streamData?.url || null

    useEffect(() => {
        if (audioRef.current && streamUrl) {
            if (isPlaying) {
                audioRef.current.play().catch(() => setPlaying(false))
            } else {
                audioRef.current.pause()
            }
        }
    }, [isPlaying, streamUrl, setPlaying])

    useEffect(() => {
        if (audioRef.current && seekTime !== null) {
            audioRef.current.currentTime = seekTime
            usePlayerStore.setState({ seekTime: null })
        }
    }, [seekTime])

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume
        }
    }, [volume])

    // Record a listen once the user has listened past the threshold so the
    // song shows up as "recently played" without counting instant skips.
    useEffect(() => {
        if (!isPlaying || !currentSong) return

        const pending = pendingListenRef.current
        if (pending?.songId !== currentSong.id) {
            pendingListenRef.current = {
                songId: currentSong.id,
                entryId: null,
                recording: false,
                failed: false,
            }
        }
        const current = pendingListenRef.current
        if (!current || current.entryId || current.recording || current.failed) return

        const audioDuration = audioRef.current?.duration
        const threshold = listenThresholdSeconds(
            audioDuration && Number.isFinite(audioDuration) && audioDuration > 0
                ? audioDuration
                : currentSong.duration,
        )
        if (progress < threshold) return

        // Mark as in-flight synchronously so rapid progress ticks (or React
        // StrictMode double effects) can't fire duplicate history POSTs.
        current.recording = true
        recordListenRef
            .current({ song: currentSong, playDuration: Math.floor(progress) })
            .then((entry) => {
                const latest = pendingListenRef.current
                if (latest !== current) return
                latest.recording = false
                if (entry?.id) {
                    latest.entryId = entry.id
                }
            })
            .catch(() => {
                const latest = pendingListenRef.current
                if (latest === current) {
                    latest.failed = true
                }
            })
    }, [progress, isPlaying, currentSong])

    const handleTimeUpdate = useCallback(() => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime)
        }
    }, [setProgress])

    const handleLoadedMetadata = useCallback(() => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration)
        }
    }, [setDuration])

    const handleSeek = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time
            setProgress(time)
        }
    }

    const handleEnded = useCallback(() => {
        if (currentSong) {
            const pending = pendingListenRef.current
            if (pending?.songId === currentSong.id && pending.entryId) {
                updatePlayDuration.mutate({
                    entryId: pending.entryId,
                    playDuration: Math.floor(progress),
                })
            }
            // Reset so repeat-one plays the same song and records a fresh
            // listen on the next loop.
            pendingListenRef.current = {
                songId: currentSong.id,
                entryId: null,
                recording: false,
                failed: false,
            }
        }
        if (repeatMode === "one" && audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play()
        } else {
            playNext()
        }
    }, [currentSong, progress, updatePlayDuration, repeatMode, playNext])

    // Flush the partial play duration when the user skips to another song.
    useEffect(() => {
        const pending = pendingListenRef.current
        if (pending && pending.songId !== currentSong?.id) {
            if (pending.entryId) {
                updatePlayDuration.mutate({
                    entryId: pending.entryId,
                    playDuration: Math.floor(progress),
                })
            }
            pendingListenRef.current = currentSong
                ? { songId: currentSong.id, entryId: null, recording: false, failed: false }
                : null
        }
    }, [currentSong, progress, updatePlayDuration])

    const cycleRepeat = () => {
        if (repeatMode === "none") setRepeatMode("all")
        else if (repeatMode === "all") setRepeatMode("one")
        else setRepeatMode("none")
    }

    const isLoading = isFetchingUrl || isBuffering

    if (!currentSong) return null

    return (
        <>
            <audio
                ref={audioRef}
                src={streamUrl || undefined}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                onWaiting={() => setIsBuffering(true)}
                onCanPlay={() => setIsBuffering(false)}
            />

            <AnimatePresence>
                {!isNowPlayingPage && (
                    <MiniPlayer
                        currentSong={currentSong}
                        isPlaying={isPlaying}
                        isLoading={isLoading}
                        repeatMode={repeatMode}
                        progress={progress}
                        duration={duration}
                        onTogglePlay={togglePlay}
                        onPrevious={playPrevious}
                        onNext={playNext}
                        onCycleRepeat={cycleRepeat}
                        onSeek={handleSeek}
                        onClose={() => usePlayerStore.setState({ currentSong: null })}
                    />
                )}
            </AnimatePresence>
        </>
    )
}
