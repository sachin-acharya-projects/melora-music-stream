import { usePlayerStore } from "@/hooks/usePlayer"
import { useTitle } from "@/hooks/useTitle"
import { formatDuration } from "@/lib/utils"
import { type Song } from "@/types"
import { motion, Reorder, useDragControls } from "framer-motion"
import {
    GripVertical,
    ListMusic,
    Music2,
    Pause,
    Play,
    Repeat,
    Repeat1,
    SkipBack,
    SkipForward,
    Target,
    Volume1,
    Volume2,
    VolumeX,
} from "lucide-react"
import { useEffect, useRef } from "react"

export default function NowPlaying() {
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
        progress,
        duration,
        setPlaylist,
        reorderPlaylist,
        seekTo,
        volume,
        setVolume,
    } = usePlayerStore()

    useTitle(currentSong ? `Playing ${currentSong.title}` : "Now Playing")

    const listRef = useRef<HTMLDivElement>(null)
    const activeItemRef = useRef<HTMLButtonElement>(null)

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
    }, [currentIndex, playlist])

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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='mx-auto w-full max-w-6xl px-6 py-10'
        >
            <div className='grid grid-cols-1 gap-12 lg:grid-cols-2'>
                {/* Left side: Main Player */}
                <div className='flex flex-col gap-8'>
                    <div className='aspect-square w-full overflow-hidden rounded-3xl shadow-2xl dark:shadow-red-900/10'>
                        <img
                            src={currentSong.thumbnail}
                            alt={currentSong.title}
                            className='h-full w-full object-cover'
                        />
                    </div>

                    <div className='flex flex-col gap-2'>
                        <h1 className='text-3xl font-bold dark:text-white'>{currentSong.title}</h1>
                        <p className='text-xl text-gray-500 dark:text-gray-400'>
                            {currentSong.uploader}
                        </p>
                    </div>

                    <div className='flex flex-col gap-4'>
                        <input
                            type='range'
                            min={0}
                            max={duration || 100}
                            value={progress}
                            onChange={(e) => seekTo(parseFloat(e.target.value))}
                            className='h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-red-600 dark:bg-white/10'
                        />
                        <div className='flex justify-between text-sm font-medium text-gray-500'>
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

                    <div className='flex items-center justify-between'>
                        <button
                            onClick={cycleRepeat}
                            className={`cursor-pointer rounded-full p-2 transition-colors ${repeatMode !== "none" ? "bg-red-50 text-red-600 dark:bg-red-500/10" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"}`}
                        >
                            {repeatMode === "one" ? (
                                <Repeat1 className='h-6 w-6' />
                            ) : (
                                <Repeat className='h-6 w-6' />
                            )}
                        </button>

                        <div className='flex items-center gap-8'>
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

                        <div className='group relative flex items-center gap-3'>
                            <button className='cursor-pointer rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'>
                                {volume === 0 ? (
                                    <VolumeX className='h-6 w-6' />
                                ) : volume < 0.5 ? (
                                    <Volume1 className='h-6 w-6' />
                                ) : (
                                    <Volume2 className='h-6 w-6' />
                                )}
                            </button>
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

                {/* Right side: Up Next */}
                <div className='flex flex-col gap-6'>
                    <div className='flex items-center gap-2 border-b pb-4 dark:border-white/10'>
                        <ListMusic className='h-5 w-5 text-red-500' />
                        <h2 className='text-xl font-bold dark:text-white'>Up Next</h2>
                        <button
                            onClick={scrollToActive}
                            className='ml-4 cursor-pointer rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/5'
                            title='Scroll to current song'
                        >
                            <Target className='h-4 w-4' />
                        </button>
                        <span className='ml-auto text-sm text-gray-500'>
                            {playlist.length} songs
                        </span>
                    </div>

                    <div
                        ref={listRef}
                        className='scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 relative flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-2'
                    >
                        <Reorder.Group
                            axis='y'
                            values={playlist}
                            onReorder={reorderPlaylist}
                            className='flex flex-col gap-2'
                        >
                            {playlist.map((song, index) => (
                                <ReorderItem
                                    key={song.id}
                                    song={song}
                                    index={index}
                                    activeIndex={currentIndex}
                                    isPlaying={isPlaying}
                                    onSelect={() => setPlaylist(playlist, index)}
                                    activeRef={index === currentIndex ? activeItemRef : null}
                                />
                            ))}
                        </Reorder.Group>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

function ReorderItem({
    song,
    index,
    activeIndex,
    isPlaying,
    onSelect,
    activeRef,
}: {
    song: Song
    index: number
    activeIndex: number
    isPlaying: boolean
    onSelect: () => void
    activeRef: React.RefObject<HTMLButtonElement | null> | null
}) {
    const controls = useDragControls()
    const isActive = index === activeIndex

    return (
        <Reorder.Item value={song} dragListener={false} dragControls={controls} className='w-full'>
            <div
                className={`flex w-full items-center gap-2 rounded-2xl p-2 transition-all select-none ${
                    isActive
                        ? "bg-red-50 text-red-600 shadow-sm dark:bg-red-500/10"
                        : "hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                }`}
            >
                <div
                    onPointerDown={(e) => controls.start(e)}
                    className='cursor-grab p-2 text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:hover:text-gray-200'
                >
                    <GripVertical className='h-4 w-4' />
                </div>

                <button
                    ref={activeRef}
                    onClick={onSelect}
                    className='flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left'
                >
                    <div className='relative h-14 w-14 shrink-0 overflow-hidden rounded-xl'>
                        <img
                            src={song.thumbnail}
                            alt={song.title}
                            className='h-full w-full object-cover'
                        />
                        {isActive && isPlaying && (
                            <div className='absolute inset-0 flex items-center justify-center bg-black/20'>
                                <div className='flex h-4 items-end gap-0.5'>
                                    <div className='animate-music-bar-1 w-1 bg-white' />
                                    <div className='animate-music-bar-2 w-1 bg-white' />
                                    <div className='animate-music-bar-3 w-1 bg-white' />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className='min-w-0 flex-1 overflow-hidden'>
                        <p className='truncate font-semibold dark:text-white'>{song.title}</p>
                        <p className='truncate text-xs opacity-70 dark:text-gray-400'>
                            {song.uploader}
                        </p>
                    </div>
                    <span className='pr-2 text-xs whitespace-nowrap opacity-60 dark:text-gray-500'>
                        {formatDuration(song.duration)}
                    </span>
                </button>
            </div>
        </Reorder.Item>
    )
}
