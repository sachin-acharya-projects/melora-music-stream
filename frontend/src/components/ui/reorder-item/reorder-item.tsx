import { formatDuration } from "@/lib/utils"
import { type Song } from "@/types"
import { Reorder, useDragControls } from "framer-motion"
import { Download, GripVertical, ListMusic, Play } from "lucide-react"

interface ReorderItemProps {
    song: Song
    selectedSongIds: string[]
    toggleSelect: (id: string, e: React.MouseEvent) => void
    handlePlay: () => void
    onAddToQueue?: () => void
    onDownload?: () => void
}

export default function ReorderItem({
    song,
    selectedSongIds,
    toggleSelect,
    handlePlay,
    onAddToQueue,
    onDownload,
}: ReorderItemProps) {
    const controls = useDragControls()
    const isSelected = selectedSongIds.includes(song.id)

    return (
        <Reorder.Item value={song} dragListener={false} dragControls={controls} className='w-full'>
            <div
                onClick={(e) => toggleSelect(song.id, e)}
                className={`group flex cursor-pointer items-center gap-4 rounded-xl border p-2 transition-all select-none ${
                    isSelected
                        ? "border-red-500 bg-red-50 dark:bg-red-950"
                        : "dark:bg-card border-gray-100 bg-white hover:border-red-200 dark:border-white/10"
                }`}
            >
                <div
                    onPointerDown={(e) => controls.start(e)}
                    className='drag-handle cursor-grab p-2 text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:hover:text-gray-200'
                >
                    <GripVertical className='h-4 w-4' />
                </div>
                <div className='relative h-14 w-24 shrink-0 overflow-hidden rounded-lg'>
                    {song.thumbnail ? (
                        <img
                            src={song.thumbnail}
                            alt={song.title}
                            loading='lazy'
                            decoding='async'
                            referrerPolicy='no-referrer'
                            className='h-full w-full object-cover'
                        />
                    ) : (
                        <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-red-500/20 via-purple-500/20 to-blue-500/20' />
                    )}
                    <div className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100'>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                handlePlay()
                            }}
                            className='cursor-pointer rounded-full bg-red-600 p-1.5 text-white shadow-lg'
                        >
                            <Play className='h-4 w-4 translate-x-0.5 fill-current' />
                        </button>
                    </div>
                </div>
                <div className='min-w-0 flex-1'>
                    <h3 className='truncate text-sm font-semibold dark:text-white'>
                        {song.title || "Unknown Title"}
                    </h3>
                    <p className='truncate text-xs text-gray-500 dark:text-gray-400'>
                        {song.uploader || "Unknown Artist"}
                    </p>
                </div>
                <div className='flex items-center gap-2 pr-2'>
                    <span className='mr-2 text-xs font-medium text-gray-400'>
                        {formatDuration(song.duration)}
                    </span>
                    {onAddToQueue && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onAddToQueue()
                            }}
                            className='flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/5 hover:text-red-500 dark:hover:bg-white/5'
                            title='Add to Queue'
                        >
                            <ListMusic className='h-4 w-4' />
                        </button>
                    )}
                    {onDownload && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onDownload()
                            }}
                            className='flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/5 hover:text-red-500 dark:hover:bg-white/5'
                            title='Download'
                        >
                            <Download className='h-4 w-4' />
                        </button>
                    )}
                    {isSelected && (
                        <div className='ml-2 flex h-5 w-5 items-center justify-center rounded bg-red-600 text-[10px] text-white'>
                            ✓
                        </div>
                    )}
                </div>
            </div>
        </Reorder.Item>
    )
}
