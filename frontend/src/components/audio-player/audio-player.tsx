import { MiniPlayer } from "@/components/audio-player/mini-player"
import { usePlayerStore } from "@/hooks/usePlayer"
import { useStreaming } from "@/hooks/useStreaming"
import { AnimatePresence } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"

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
        if (repeatMode === "one" && audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play()
        } else {
            playNext()
        }
    }, [repeatMode, playNext])

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
