import { usePlayerStore } from "@/hooks/usePlayer"
import { http } from "@/utils/api/http"
import { useQuery } from "@tanstack/react-query"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2, Pause, Play, Repeat, Repeat1, SkipBack, SkipForward, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

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

    const navigate = useNavigate()
    const location = useLocation()
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isBuffering, setIsBuffering] = useState(false)

    const isNowPlayingPage = location.pathname === "/now-playing"

    const { data: streamData, isLoading: isFetchingUrl } = useQuery({
        queryKey: ["stream", currentSong?.id],
        queryFn: async () => {
            if (!currentSong) return null
            const res = await http.get<{ url: string }>(`/stream/${currentSong.id}`)
            return res.data
        },
        enabled: !!currentSong,
        staleTime: 1000 * 60 * 5,
    })

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

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value)
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
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className='fixed right-6 bottom-24 z-100 flex w-80 flex-col overflow-hidden rounded-2xl border bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-black/95'
                    >
                        <div className='flex items-start justify-between gap-4'>
                            <div
                                onClick={() => navigate("/now-playing")}
                                className='group flex flex-1 cursor-pointer gap-3 overflow-hidden'
                            >
                                <div className='relative h-12 w-12 shrink-0 overflow-hidden rounded-lg'>
                                    <img
                                        src={currentSong.thumbnail}
                                        alt={currentSong.title}
                                        className={`h-full w-full object-cover transition-all group-hover:scale-105 ${isLoading ? "opacity-40" : "opacity-100"}`}
                                    />
                                    {isLoading && (
                                        <div className='absolute inset-0 flex items-center justify-center'>
                                            <Loader2 className='h-6 w-6 animate-spin text-red-600' />
                                        </div>
                                    )}
                                </div>
                                <div className='flex-1 overflow-hidden'>
                                    <h4 className='truncate text-sm font-semibold transition-colors group-hover:text-red-500 dark:text-white'>
                                        {currentSong.title}
                                    </h4>
                                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                                        {currentSong.uploader}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => usePlayerStore.setState({ currentSong: null })}
                                className='cursor-pointer rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                            >
                                <X className='h-4 w-4' />
                            </button>
                        </div>

                        <div className='mt-4 flex items-center justify-center gap-4'>
                            <button
                                onClick={cycleRepeat}
                                className={`cursor-pointer transition-colors ${repeatMode !== "none" ? "text-red-500" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}`}
                            >
                                {repeatMode === "one" ? (
                                    <Repeat1 className='h-4 w-4' />
                                ) : (
                                    <Repeat className='h-4 w-4' />
                                )}
                            </button>

                            <button
                                onClick={playPrevious}
                                className='cursor-pointer text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500'
                            >
                                <SkipBack className='h-5 w-5 fill-current' />
                            </button>

                            <button
                                onClick={togglePlay}
                                disabled={isLoading && !streamUrl}
                                className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white transition-transform hover:bg-red-700 active:scale-90 disabled:opacity-50'
                            >
                                {isLoading ? (
                                    <Loader2 className='h-5 w-5 animate-spin' />
                                ) : isPlaying ? (
                                    <Pause className='h-5 w-5 fill-current' />
                                ) : (
                                    <Play className='h-5 w-5 translate-x-0.5 fill-current' />
                                )}
                            </button>

                            <button
                                onClick={playNext}
                                className='cursor-pointer text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500'
                            >
                                <SkipForward className='h-5 w-5 fill-current' />
                            </button>
                        </div>

                        <div className='mt-4 flex flex-col gap-1'>
                            <input
                                type='range'
                                min={0}
                                max={duration || 100}
                                value={progress}
                                onChange={handleSeek}
                                className='h-1 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-red-600 dark:bg-white/10'
                            />
                            <div className='flex justify-between text-[10px] font-medium text-gray-500'>
                                <span>
                                    {Math.floor(progress / 60)}:
                                    {Math.floor(progress % 60)
                                        .toString()
                                        .padStart(2, "0")}
                                </span>
                                <span>
                                    {Math.floor(duration / 60)}:
                                    {Math.floor(duration % 60)
                                        .toString()
                                        .padStart(2, "0")}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
