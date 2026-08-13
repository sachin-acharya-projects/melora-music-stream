import { AddToPlaylistModal } from "@/components/playlist/add-to-playlist-modal"
import { LyricsPanel } from "@/components/now-playing/lyrics-panel"
import { ReorderItem } from "@/components/now-playing/reorder-item"
import { ShortcutHelp } from "@/components/now-playing/shortcut-help"
import { SongInfoModal } from "@/components/song-info/song-info-modal"
import { SongThumb } from "@/components/song-thumb/song-thumb"
import { type PlaylistItem, usePlayerStore } from "@/hooks/usePlayer"
import { useRelatedSongs } from "@/hooks/useRelatedSongs"
import { useTitle } from "@/hooks/useTitle"
import { cn, formatDuration, slugify } from "@/lib/utils"
import { apiService } from "@/services/api.service"
import { motion, Reorder } from "framer-motion"
import {
    Info,
    ListMusic,
    ListPlus,
    MicVocal,
    Music2,
    Pause,
    Play,
    Repeat,
    Repeat1,
    RotateCcw,
    RotateCw,
    Shuffle,
    SkipBack,
    SkipForward,
    Sparkles,
    Target,
    Volume1,
    Volume2,
    VolumeX,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

export default function NowPlaying() {
    const navigate = useNavigate()
    const {
        currentSong,
        playlist,
        currentIndex,
        isPlaying,
        togglePlay,
        playNext,
        playPrevious,
        repeatMode,
        setRepeatMode,
        shuffle,
        toggleShuffle,
        progress,
        duration,
        reorderPlaylist,
        seekTo,
        volume,
        setVolume,
        addToQueueNext,
        removeFromQueue,
    } = usePlayerStore()

    useTitle(currentSong ? `Playing ${currentSong.title}` : "Now Playing")

    const relatedSongsQuery = useRelatedSongs(currentSong?.id ?? null)
    const relatedSongs = relatedSongsQuery.data ?? []

    const listRef = useRef<HTMLDivElement>(null)
    const activeItemRef = useRef<HTMLButtonElement>(null)
    const scrubRef = useRef<HTMLDivElement>(null)
    const isScrubbingRef = useRef(false)
    const lastVolumeRef = useRef(1)

    const [previewTime, setPreviewTime] = useState<number | null>(null)
    const [menuQueueId, setMenuQueueId] = useState<string | null>(null)
    const [addToPlaylistTarget, setAddToPlaylistTarget] = useState<PlaylistItem | null>(null)
    const [isCurrentOffscreen, setIsCurrentOffscreen] = useState(false)
    const [rightTab, setRightTab] = useState<"queue" | "lyrics">("queue")
    const [showSongInfo, setShowSongInfo] = useState(false)

    // Auto-scroll to active item
    useEffect(() => {
        if (activeItemRef.current && listRef.current) {
            const container = listRef.current
            const item = activeItemRef.current
            const scrollPos =
                item.offsetTop -
                container.offsetTop -
                container.clientHeight / 2 +
                item.clientHeight / 2
            container.scrollTo({
                top: scrollPos,
                behavior: "smooth",
            })
        }
    }, [currentIndex, playlist, rightTab])

    // Track whether the current song has scrolled out of the visible list area
    const checkActiveVisibility = useCallback(() => {
        const container = listRef.current
        const item = activeItemRef.current
        if (!container || !item) {
            setIsCurrentOffscreen(false)
            return
        }
        const itemTop = item.offsetTop
        const itemBottom = itemTop + item.clientHeight
        const isVisible =
            itemTop >= container.scrollTop - 8 &&
            itemBottom <= container.scrollTop + container.clientHeight + 8
        setIsCurrentOffscreen(!isVisible)
    }, [])

    useEffect(() => {
        const container = listRef.current
        if (!container) return
        const onScroll = () => checkActiveVisibility()
        container.addEventListener("scroll", onScroll)
        checkActiveVisibility()
        return () => container.removeEventListener("scroll", onScroll)
    }, [checkActiveVisibility, currentIndex, playlist])

    // Keep the last non-zero volume around so the volume button can toggle mute
    useEffect(() => {
        if (volume > 0) lastVolumeRef.current = volume
    }, [volume])

    const toggleMute = useCallback(() => {
        if (volume === 0) {
            setVolume(lastVolumeRef.current || 0.5)
        } else {
            setVolume(0)
        }
    }, [volume, setVolume])

    const seekBy = useCallback(
        (delta: number) => {
            const upper = duration > 0 ? duration : progress + delta
            seekTo(Math.min(Math.max(0, progress + delta), upper))
        },
        [progress, duration, seekTo],
    )

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            if (
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.tagName === "SELECT" ||
                    target.isContentEditable)
            ) {
                return
            }
            if (!currentSong) return

            switch (e.key.toLowerCase()) {
                case " ":
                    e.preventDefault()
                    togglePlay()
                    break
                case "arrowleft":
                    seekBy(-10)
                    break
                case "arrowright":
                    seekBy(10)
                    break
                case "arrowup":
                    e.preventDefault()
                    setVolume(Math.min(1, volume + 0.1))
                    break
                case "arrowdown":
                    e.preventDefault()
                    setVolume(Math.max(0, volume - 0.1))
                    break
                case "n":
                    playNext()
                    break
                case "p":
                    playPrevious()
                    break
            }
        }

        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [currentSong, togglePlay, playNext, playPrevious, seekBy, volume, setVolume])

    if (!currentSong) {
        return (
            <div className='flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center'>
                <div className='rounded-full bg-gray-100 p-8 dark:bg-white/5'>
                    <Music2 className='h-16 w-12 text-gray-400' />
                </div>
                <h2 className='text-2xl font-bold dark:text-white'>No music playing</h2>
                <p className='text-gray-500'>
                    Select a song from search or your playlists to start listening.
                </p>
            </div>
        )
    }

    const cycleRepeat = () => {
        if (repeatMode === "none") setRepeatMode("all")
        else if (repeatMode === "all") setRepeatMode("one")
        else setRepeatMode("none")
    }

    const scrollToActive = () => {
        if (activeItemRef.current && listRef.current) {
            const container = listRef.current
            const item = activeItemRef.current
            const scrollPos =
                item.offsetTop -
                container.offsetTop -
                container.clientHeight / 2 +
                item.clientHeight / 2
            container.scrollTo({ top: scrollPos, behavior: "smooth" })
        }
    }

    const handleSelect = (item: PlaylistItem, index: number) => {
        usePlayerStore.setState({
            currentIndex: index,
            currentSong: item,
            isPlaying: true,
            progress: 0,
        })
    }

    const playRelated = (index: number) => {
        if (relatedSongs.length === 0) return
        usePlayerStore.setState({
            playlist: relatedSongs.map((s) => ({ ...s, queueId: s.id })),
            currentIndex: index,
            currentSong: { ...relatedSongs[index], queueId: relatedSongs[index].id },
            isPlaying: true,
            progress: 0,
        })
        usePlayerStore.getState().syncWithBackend()
    }

    const progressRatio = duration > 0 ? progress / duration : 0

    const handleScrubMove = (clientX: number) => {
        const rect = scrubRef.current?.getBoundingClientRect()
        if (!rect) return
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
        const time = Math.round(ratio * duration)
        setPreviewTime(time)
        if (isScrubbingRef.current) {
            seekTo(time)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='mx-auto w-full max-w-6xl px-6 py-10'
        >
            <div className='grid grid-cols-1 gap-12 lg:grid-cols-2'>
                {/* Left side: Main Player */}
                <div className='flex flex-col gap-8'>
                    <div
                        className={cn(
                            "relative aspect-square w-full overflow-hidden rounded-3xl shadow-2xl dark:shadow-red-900/10",
                            isPlaying && "ring-4 ring-red-500/25",
                        )}
                    >
                        <SongThumb song={currentSong} />
                        {isPlaying && (
                            <div className='pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 via-black/0 to-black/0 pb-10'>
                                <div className='flex h-10 items-end gap-1.5'>
                                    <div className='animate-music-bar-1 w-1.5 rounded-full bg-red-400' />
                                    <div className='animate-music-bar-2 w-1.5 rounded-full bg-red-400' />
                                    <div className='animate-music-bar-3 w-1.5 rounded-full bg-red-400' />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className='flex items-start justify-between gap-4'>
                        <div className='min-w-0'>
                            <h1 className='truncate text-2xl font-bold dark:text-white'>
                                {currentSong.title}
                            </h1>
                            <button
                                onClick={() =>
                                    navigate(`/artists/${slugify(currentSong.uploader)}`)
                                }
                                className='max-w-full cursor-pointer truncate text-lg text-gray-500 transition-colors hover:text-red-500 dark:text-gray-400'
                                title={`View ${currentSong.uploader}`}
                            >
                                {currentSong.uploader}
                            </button>
                        </div>
                        <div className='flex shrink-0 items-center gap-2'>
                            <button
                                onClick={() => setShowSongInfo(true)}
                                className='cursor-pointer rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 dark:hover:bg-white/5'
                                title='View music info'
                            >
                                <Info className='h-5 w-5' />
                            </button>
                            <ShortcutHelp />
                        </div>
                    </div>

                    <div className='flex flex-col gap-4'>
                        <div className='flex items-center gap-3'>
                            <button
                                onClick={() => seekBy(-15)}
                                className='cursor-pointer rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200'
                                title='Back 15 seconds'
                            >
                                <RotateCcw className='h-5 w-5' />
                            </button>

                            <div
                                ref={scrubRef}
                                className='group/scrub relative h-6 flex-1 cursor-pointer touch-none'
                                onPointerDown={(e) => {
                                    isScrubbingRef.current = true
                                    e.currentTarget.setPointerCapture(e.pointerId)
                                    handleScrubMove(e.clientX)
                                }}
                                onPointerMove={(e) => handleScrubMove(e.clientX)}
                                onPointerUp={() => {
                                    isScrubbingRef.current = false
                                }}
                                onPointerLeave={() => {
                                    if (isScrubbingRef.current) return
                                    setPreviewTime(null)
                                }}
                            >
                                <div className='absolute top-1/2 h-2 w-full -translate-y-1/2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10'>
                                    <div
                                        className='h-full rounded-full bg-red-600'
                                        style={{ width: `${progressRatio * 100}%` }}
                                    />
                                </div>
                                <div
                                    className='absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600 shadow-md transition-transform group-hover/scrub:scale-125'
                                    style={{ left: `${progressRatio * 100}%` }}
                                />
                                {previewTime !== null && (
                                    <div
                                        className='pointer-events-none absolute -top-8 z-10 -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-lg dark:bg-white dark:text-gray-900'
                                        style={{
                                            left: `${(
                                                (previewTime / (duration || 1)) *
                                                100
                                            ).toFixed(2)}%`,
                                        }}
                                    >
                                        {formatDuration(previewTime)}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => seekBy(15)}
                                className='cursor-pointer rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200'
                                title='Forward 15 seconds'
                            >
                                <RotateCw className='h-5 w-5' />
                            </button>
                        </div>

                        <div className='flex justify-between text-sm font-medium text-gray-500'>
                            <span>{formatDuration(progress)}</span>
                            <span>{formatDuration(duration)}</span>
                        </div>
                    </div>

                    <div className='flex items-center'>
                        <div className='flex flex-1 items-center gap-2'>
                            <button
                                onClick={toggleShuffle}
                                className={cn(
                                    "cursor-pointer rounded-full p-2 transition-colors",
                                    shuffle
                                        ? "bg-red-50 text-red-600 dark:bg-red-500/10"
                                        : "text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5",
                                )}
                                title='Shuffle'
                            >
                                <Shuffle className='h-6 w-6' />
                            </button>

                            <button
                                onClick={cycleRepeat}
                                className={cn(
                                    "cursor-pointer rounded-full p-2 transition-colors",
                                    repeatMode !== "none"
                                        ? "bg-red-50 text-red-600 dark:bg-red-500/10"
                                        : "text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5",
                                )}
                                title='Repeat'
                            >
                                {repeatMode === "one" ? (
                                    <Repeat1 className='h-6 w-6' />
                                ) : (
                                    <Repeat className='h-6 w-6' />
                                )}
                            </button>
                        </div>

                        <div className='flex flex-2 items-center justify-center gap-3'>
                            <button
                                onClick={playPrevious}
                                className='cursor-pointer text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500'
                            >
                                <SkipBack className='h-8 w-8 fill-current' />
                            </button>

                            <button
                                onClick={togglePlay}
                                className='flex h-20 w-20 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow-xl shadow-red-600/20 transition-transform hover:scale-105 active:scale-95'
                            >
                                {isPlaying ? (
                                    <Pause className='h-10 w-10 fill-current' />
                                ) : (
                                    <Play className='h-10 w-10 translate-x-1 fill-current' />
                                )}
                            </button>

                            <button
                                onClick={playNext}
                                className='cursor-pointer text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500'
                            >
                                <SkipForward className='h-8 w-8 fill-current' />
                            </button>
                        </div>

                        <div className='group flex flex-1 items-center justify-end'>
                            <button
                                onClick={toggleMute}
                                className='cursor-pointer rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/5'
                                title={volume === 0 ? "Unmute" : "Mute"}
                            >
                                {volume === 0 ? (
                                    <VolumeX className='h-6 w-6' />
                                ) : volume < 0.5 ? (
                                    <Volume1 className='h-6 w-6' />
                                ) : (
                                    <Volume2 className='h-6 w-6' />
                                )}
                            </button>
                            <div className='flex h-5 w-0 items-center overflow-hidden transition-all duration-300 group-hover:ml-1 group-hover:w-28'>
                                <input
                                    type='range'
                                    min='0'
                                    max='1'
                                    step='0.01'
                                    value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className='h-1 w-24 cursor-pointer appearance-none rounded-full bg-gray-200 accent-red-600 dark:bg-white/10'
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side: Up Next / Lyrics */}
                <div className='flex flex-col gap-6'>
                    <div className='flex items-center justify-between gap-2 border-b pb-4 dark:border-white/10'>
                        <div className='flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-white/10'>
                            <button
                                onClick={() => setRightTab("queue")}
                                className={cn(
                                    "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all",
                                    rightTab === "queue"
                                        ? "bg-red-600 text-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white",
                                )}
                            >
                                <ListMusic className='h-4 w-4' /> Up Next
                            </button>
                            <button
                                onClick={() => setRightTab("lyrics")}
                                className={cn(
                                    "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all",
                                    rightTab === "lyrics"
                                        ? "bg-red-600 text-white shadow-sm"
                                        : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white",
                                )}
                            >
                                <MicVocal className='h-4 w-4' /> Lyrics
                            </button>
                        </div>
                    </div>

                    {rightTab === "lyrics" ? (
                        currentSong ? (
                            <LyricsPanel song={currentSong} />
                        ) : (
                            <p className='py-16 text-center text-sm text-gray-400'>
                                Nothing playing right now.
                            </p>
                        )
                    ) : (
                        <>
                            <div className='flex items-center gap-2'>
                                <button
                                    onClick={scrollToActive}
                                    className={cn(
                                        "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                                        isCurrentOffscreen
                                            ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:hover:bg-red-500/20"
                                            : "border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 dark:border-white/10 dark:text-gray-400 dark:hover:text-red-500",
                                    )}
                                    title='Scroll to current song'
                                >
                                    <Target
                                        className={cn(
                                            "h-4 w-4",
                                            isCurrentOffscreen && "animate-pulse",
                                        )}
                                    />
                                    Now playing
                                </button>
                                <span className='ml-auto text-sm text-gray-500'>
                                    {playlist.length} songs
                                </span>
                            </div>

                            <div
                                ref={listRef}
                                className='relative flex max-h-[55vh] scrollbar-thin scrollbar-thumb-gray-200 flex-col gap-2 overflow-y-auto pr-2 dark:scrollbar-thumb-white/10'
                            >
                                <Reorder.Group
                                    axis='y'
                                    values={playlist}
                                    onReorder={reorderPlaylist}
                                    className='flex flex-col gap-2'
                                >
                                    {playlist.map((item, index) => (
                                        <ReorderItem
                                            key={item.queueId}
                                            item={item}
                                            index={index}
                                            activeIndex={currentIndex}
                                            isPlaying={isPlaying}
                                            onSelect={() => handleSelect(item, index)}
                                            activeRef={
                                                index === currentIndex ? activeItemRef : null
                                            }
                                            menuOpen={menuQueueId === item.queueId}
                                            onOpenMenu={() => setMenuQueueId(item.queueId)}
                                            onCloseMenu={() => setMenuQueueId(null)}
                                            onPlayNext={() => {
                                                addToQueueNext(item)
                                                toast.success(`"${item.title}" added to play next`)
                                            }}
                                            onAddToPlaylist={() => {
                                                setMenuQueueId(null)
                                                setAddToPlaylistTarget(item)
                                            }}
                                            onDownload={() => {
                                                window.open(
                                                    apiService.getDownloadUrl(item.id),
                                                    "_blank",
                                                )
                                            }}
                                            onRemove={() => {
                                                setMenuQueueId(null)
                                                removeFromQueue(item.queueId)
                                            }}
                                        />
                                    ))}
                                </Reorder.Group>
                            </div>

                            {relatedSongs.length > 0 && (
                                <div className='flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-white/10'>
                                    <div className='flex items-center justify-between gap-3'>
                                        <div className='flex items-center gap-2'>
                                            <Sparkles className='h-4 w-4 shrink-0 text-red-500' />
                                            <div className='flex flex-col gap-0.5'>
                                                <h3 className='text-sm font-bold text-gray-900 dark:text-white'>
                                                    Play something similar
                                                </h3>
                                                <p className='text-xs text-gray-500 dark:text-gray-400'>
                                                    Similar songs picked for you
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => playRelated(0)}
                                            className='flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700'
                                            title='Play all similar songs'
                                        >
                                            <Play className='h-3.5 w-3.5 fill-current' /> Play all
                                        </button>
                                    </div>
                                    <div className='flex flex-col gap-1'>
                                        {relatedSongs.map((song, index) => (
                                            <div
                                                key={song.id}
                                                className='group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5'
                                            >
                                                <div className='h-10 w-10 shrink-0 overflow-hidden rounded-lg'>
                                                    <SongThumb song={song} />
                                                </div>
                                                <div className='min-w-0 flex-1'>
                                                    <p className='truncate text-sm font-medium dark:text-white'>
                                                        {song.title}
                                                    </p>
                                                    <p className='truncate text-xs text-gray-500 dark:text-gray-400'>
                                                        {song.uploader}
                                                    </p>
                                                </div>
                                                <span className='text-xs text-gray-400'>
                                                    {formatDuration(song.duration)}
                                                </span>
                                                <button
                                                    onClick={() => playRelated(index)}
                                                    className='cursor-pointer rounded-full p-1.5 text-gray-400 transition-colors hover:text-red-500'
                                                    title='Play'
                                                >
                                                    <Play className='h-4 w-4 fill-current' />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        addToQueueNext(song)
                                                        toast.success(
                                                            `"${song.title}" added to play next`,
                                                        )
                                                    }}
                                                    className='cursor-pointer rounded-full p-1.5 text-gray-400 transition-colors hover:text-red-500'
                                                    title='Play next'
                                                >
                                                    <ListPlus className='h-4 w-4' />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {addToPlaylistTarget && (
                <AddToPlaylistModal
                    song={addToPlaylistTarget}
                    onClose={() => setAddToPlaylistTarget(null)}
                />
            )}

            {showSongInfo && (
                <SongInfoModal
                    song={currentSong}
                    onClose={() => setShowSongInfo(false)}
                />
            )}
        </motion.div>
    )
}
