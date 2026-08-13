import { type Playlist } from "@/types"
import { AnimatePresence, motion } from "framer-motion"
import { CheckSquare, Download, ListEnd, Loader2, Play, Plus, Trash2 } from "lucide-react"
import PlaylistSelector from "../playlist-selector/playlist-selector"

interface BulkActionBarProps {
    isVisible: boolean
    selectedCount: number
    totalCount: number
    onSelectAll: () => void
    onPlay: () => void
    playlists: Playlist[]
    playlistValue: string
    onPlaylistValueChange: (val: string) => void
    onAddToPlaylist: () => void
    isPlaylistLoading: boolean
    onAddToQueue: () => void
    onDownload: () => void
    onDelete?: () => void
    onClear: () => void
}

export default function BulkActionBar({
    isVisible,
    selectedCount,
    totalCount,
    onSelectAll,
    onPlay,
    playlists,
    playlistValue,
    onPlaylistValueChange,
    onAddToPlaylist,
    isPlaylistLoading,
    onAddToQueue,
    onDownload,
    onDelete,
    onClear,
}: BulkActionBarProps) {
    const isAllSelected = selectedCount === totalCount

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className='fixed bottom-20 left-1/2 z-50 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-white/90 px-4 py-3 shadow-2xl backdrop-blur-md md:bottom-6 md:max-w-none md:gap-6 md:px-6 dark:border-white/10 dark:bg-black/90'
                >
                    <p className='text-sm font-bold whitespace-nowrap dark:text-white'>
                        {selectedCount} selected
                    </p>

                    <div className='flex items-center gap-3'>
                        <button
                            onClick={onSelectAll}
                            className='flex cursor-pointer items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-600 hover:text-white dark:bg-red-950'
                            title='Toggle All'
                        >
                            <CheckSquare className='h-4 w-4' />
                            <span>{isAllSelected ? "Deselect All" : "Select All"}</span>
                        </button>

                        <button
                            onClick={onPlay}
                            className='flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-transform active:scale-95'
                        >
                            <Play className='h-4 w-4 fill-current' /> Play
                        </button>

                        <div className='flex items-center gap-2 border-x px-3 dark:border-white/10'>
                            <PlaylistSelector
                                playlists={playlists}
                                value={playlistValue}
                                onChange={onPlaylistValueChange}
                                className='w-48'
                            />
                            <button
                                onClick={onAddToPlaylist}
                                disabled={!playlistValue || isPlaylistLoading}
                                className='flex min-w-20 cursor-pointer items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50'
                            >
                                {isPlaylistLoading ? (
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                    <Plus className='h-4 w-4' />
                                )}
                                <span>Add</span>
                            </button>
                        </div>

                        <button
                            onClick={onAddToQueue}
                            className='cursor-pointer rounded-lg bg-gray-200 px-4 py-2 text-sm font-bold whitespace-nowrap text-gray-700 hover:bg-gray-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                            title='Add to Collection'
                        >
                            <ListEnd className='h-4 w-4' />
                            {/* Collection */}
                        </button>

                        <button
                            onClick={onDownload}
                            className='flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-transform active:scale-95'
                        >
                            <Download className='h-4 w-4' /> Download
                        </button>

                        {onDelete && (
                            <button
                                onClick={onDelete}
                                className='flex cursor-pointer items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-red-500/10'
                            >
                                <Trash2 className='h-4 w-4' /> Delete
                            </button>
                        )}
                    </div>

                    <button
                        onClick={onClear}
                        className='cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
                    >
                        Clear
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
