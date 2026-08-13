import { type PlaylistItem } from "@/hooks/usePlayer"
import { cn, slugify } from "@/lib/utils"
import { motion } from "framer-motion"
import { Loader2, Pause, Play, Repeat, Repeat1, SkipBack, SkipForward, X } from "lucide-react"
import { useNavigate } from "react-router-dom"

export function MiniPlayer({
    currentSong,
    isPlaying,
    isLoading,
    repeatMode,
    progress,
    duration,
    onTogglePlay,
    onPrevious,
    onNext,
    onCycleRepeat,
    onSeek,
    onClose,
}: {
    currentSong: PlaylistItem
    isPlaying: boolean
    isLoading: boolean
    repeatMode: "none" | "one" | "all"
    progress: number
    duration: number
    onTogglePlay: () => void
    onPrevious: () => void
    onNext: () => void
    onCycleRepeat: () => void
    onSeek: (time: number) => void
    onClose: () => void
}) {
    const navigate = useNavigate()

    return (
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
                            referrerPolicy='no-referrer'
                            className={cn(
                                "h-full w-full object-cover transition-all group-hover:scale-105",
                                isLoading ? "opacity-40" : "opacity-100",
                            )}
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
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/artists/${slugify(currentSong.uploader)}`)
                            }}
                            className='max-w-full cursor-pointer truncate text-xs text-gray-500 transition-colors hover:text-red-500 dark:text-gray-400'
                            title={`View ${currentSong.uploader}`}
                        >
                            {currentSong.uploader}
                        </button>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className='cursor-pointer rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                >
                    <X className='h-4 w-4' />
                </button>
            </div>

            <div className='mt-4 flex items-center justify-center gap-4'>
                <button
                    onClick={onCycleRepeat}
                    className={`cursor-pointer transition-colors ${repeatMode !== "none" ? "text-red-500" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}`}
                >
                    {repeatMode === "one" ? (
                        <Repeat1 className='h-4 w-4' />
                    ) : (
                        <Repeat className='h-4 w-4' />
                    )}
                </button>

                <button
                    onClick={onPrevious}
                    className='cursor-pointer text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500'
                >
                    <SkipBack className='h-5 w-5 fill-current' />
                </button>

                <button
                    onClick={onTogglePlay}
                    disabled={isLoading}
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
                    onClick={onNext}
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
                    onChange={(e) => onSeek(parseFloat(e.target.value))}
                    className='h-1 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-red-600 dark:bg-white/10'
                />
                <div className='mt-2 flex justify-between text-[10px] font-medium text-gray-500'>
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
    )
}
