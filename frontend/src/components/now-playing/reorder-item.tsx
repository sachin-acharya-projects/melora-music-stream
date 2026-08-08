import { QueueItemMenu } from "@/components/now-playing/queue-item-menu"
import { SongThumb } from "@/components/song-thumb/song-thumb"
import { type PlaylistItem } from "@/hooks/usePlayer"
import { cn, formatDuration } from "@/lib/utils"
import { GripVertical } from "lucide-react"
import { useDragControls } from "framer-motion"
import { Reorder } from "framer-motion"

export function ReorderItem({
    item,
    index,
    activeIndex,
    isPlaying,
    onSelect,
    activeRef,
    menuOpen,
    onOpenMenu,
    onCloseMenu,
    onPlayNext,
    onAddToPlaylist,
    onDownload,
    onRemove,
}: {
    item: PlaylistItem
    index: number
    activeIndex: number
    isPlaying: boolean
    onSelect: () => void
    activeRef: React.RefObject<HTMLButtonElement | null> | null
    menuOpen: boolean
    onOpenMenu: () => void
    onCloseMenu: () => void
    onPlayNext: () => void
    onAddToPlaylist: () => void
    onDownload: () => void
    onRemove: () => void
}) {
    const controls = useDragControls()
    const isActive = index === activeIndex

    return (
        <Reorder.Item value={item} dragListener={false} dragControls={controls} className='w-full'>
            <div
                className={cn(
                    "flex w-full items-center gap-2 rounded-2xl p-2 transition-all select-none",
                    isActive
                        ? "bg-red-50 text-red-600 shadow-sm dark:bg-red-100/20"
                        : "hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5",
                )}
            >
                <div
                    onPointerDown={(e) => controls.start(e)}
                    className='drag-handle p-2 text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:hover:text-gray-200'
                >
                    <GripVertical className='h-4 w-4' />
                </div>

                <button
                    ref={activeRef}
                    onClick={onSelect}
                    className='flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left'
                >
                    <div className='relative h-14 w-14 shrink-0 overflow-hidden rounded-xl'>
                        <SongThumb song={item} />
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
                        <p className='truncate font-semibold dark:text-white'>{item.title}</p>
                        <p className='truncate text-xs opacity-70 dark:text-gray-400'>
                            {item.uploader}
                        </p>
                    </div>
                    <span className='pr-2 text-xs whitespace-nowrap opacity-60 dark:text-gray-500'>
                        {formatDuration(item.duration)}
                    </span>
                </button>

                <QueueItemMenu
                    open={menuOpen}
                    onOpen={onOpenMenu}
                    onClose={onCloseMenu}
                    onPlayNext={onPlayNext}
                    onAddToPlaylist={onAddToPlaylist}
                    onDownload={onDownload}
                    onRemove={onRemove}
                />
            </div>
        </Reorder.Item>
    )
}
