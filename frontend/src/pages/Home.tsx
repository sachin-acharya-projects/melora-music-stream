import SearchForm from "@/components/search-form/search-form"
import SongSkeleton from "@/components/song-skeleton/song-skeleton"
import PlaylistSelector from "@/components/ui/playlist-selector/playlist-selector"
import ViewToggle from "@/components/ui/view-toggle/view-toggle"
import { usePlayerStore } from "@/hooks/usePlayer"
import { usePlaylists } from "@/hooks/usePlaylists"
import { useQueueStore } from "@/hooks/useQueue"
import { useSearch } from "@/hooks/useSearch"
import { useThemeStore } from "@/hooks/useTheme"
import { useTitle } from "@/hooks/useTitle"
import { formatDuration } from "@/lib/utils"
import { apiService } from "@/services/api.service"
import { AnimatePresence, motion } from "framer-motion"
import { CheckSquare, Loader2, Play, Plus, Settings2 } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"

export default function Home() {
    useTitle("Search and Download Music")
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedVideos, setSelectedVideos] = useState<string[]>([])
    const [playlistInput, setPlaylistInput] = useState("")
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

    const { viewMode, setViewMode } = useThemeStore()
    const addQueue = useQueueStore((s) => s.add)
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)

    const { playlists, addSong, createPlaylist, isAdding, isCreating } = usePlaylists()
    const { data: videos = [], isLoading: isSearchLoading, isError } = useSearch(searchQuery)

    const toggleSelect = (video_id: string, e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("button")) return

        if (e.shiftKey && lastSelectedId) {
            const currentIndex = videos.findIndex((v) => v.id === video_id)
            const lastIndex = videos.findIndex((v) => v.id === lastSelectedId)

            if (currentIndex !== -1 && lastIndex !== -1) {
                const start = Math.min(currentIndex, lastIndex)
                const end = Math.max(currentIndex, lastIndex)
                const rangeIds = videos.slice(start, end + 1).map((v) => v.id)

                setSelectedVideos((prev) => {
                    const newSelection = new Set([...prev, ...rangeIds])
                    return Array.from(newSelection)
                })
                setLastSelectedId(video_id)
                return
            }
        }

        setSelectedVideos((prev) => {
            const isSelected = prev.includes(video_id)
            if (isSelected) {
                setLastSelectedId(null)
                return prev.filter((v) => v !== video_id)
            } else {
                setLastSelectedId(video_id)
                return [...prev, video_id]
            }
        })
    }

    const toggleSelectAll = () => {
        if (selectedVideos.length === videos.length) {
            setSelectedVideos([])
        } else {
            setSelectedVideos(videos.map((v) => v.id))
        }
    }

    const clearSelection = () => {
        setSelectedVideos([])
        setLastSelectedId(null)
    }

    const onSearch = (q: string) => {
        setSearchQuery(q)
        clearSelection()
    }

    const handleAddToQueue = () => {
        const selectedSongs = videos.filter((v) => selectedVideos.includes(v.id))
        selectedSongs.forEach((song) => {
            addQueue(song, "audio", false)
        })
        toast.success(`Added ${selectedSongs.length} items to queue`)
        clearSelection()
    }

    const handleDownloadNow = () => {
        selectedVideos.forEach((id) => {
            window.open(apiService.getDownloadUrl(id), "_blank")
        })
        clearSelection()
    }

    const handleAddToPlaylist = async () => {
        if (!playlistInput) return

        const songsToAdd = videos.filter((v) => selectedVideos.includes(v.id))

        try {
            const existing = playlists.find(
                (p) => p.name.toLowerCase() === playlistInput.toLowerCase(),
            )
            let playlistId = existing?.id

            if (!playlistId) {
                const newPlaylist = await createPlaylist(playlistInput)
                playlistId = newPlaylist.id
            }

            for (const song of songsToAdd) {
                await addSong({ playlistId: playlistId!, song })
            }

            toast.success(`Added ${songsToAdd.length} songs to ${playlistInput}`)
            clearSelection()
            setPlaylistInput("")
        } catch {
            toast.error("Failed to add songs to playlist")
        }
    }

    const handlePlay = (index: number) => {
        setPlaylist(videos, index)
    }

    const handlePlaySelected = () => {
        const selected = videos.filter((v) => selectedVideos.includes(v.id))
        if (selected.length > 0) {
            setPlaylist(selected, 0)
            clearSelection()
        }
    }

    const isPlaylistActionLoading = isAdding || isCreating

    return (
        <div className='flex flex-col items-center gap-12'>
            {/* Header */}
            <div className='flex flex-col items-center gap-5 pt-32'>
                <h1 className='text-center text-5xl font-bold text-shadow-md dark:text-white'>
                    <span className='text-red-500'>YouTube</span> Downloader
                </h1>

                <SearchForm onSearch={onSearch} isLoading={isSearchLoading} />

                <Link
                    to='/playlists/edit'
                    className='-mt-2 flex w-full cursor-pointer items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400'
                >
                    <Settings2 className='h-5 w-5' />
                    Edit Playlists
                </Link>
            </div>

            {/* Content Section */}
            <div className='mx-auto w-full max-w-375 px-4 pb-40'>
                {videos.length > 0 && (
                    <>
                        {/* Toolbar */}
                        <div className='mb-6 flex items-center justify-between'>
                            <div className='flex items-center gap-4'>
                                <button
                                    onClick={toggleSelectAll}
                                    className='cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95'
                                >
                                    {selectedVideos.length === videos.length
                                        ? "Deselect All"
                                        : "Select All"}
                                </button>
                                <p className='text-sm text-gray-600 dark:text-gray-400'>
                                    {selectedVideos.length} selected
                                </p>
                            </div>

                            <ViewToggle view={viewMode} onChange={setViewMode} />
                        </div>

                        {/* Video Display */}
                        <div
                            className={
                                viewMode === "grid"
                                    ? "grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                                    : "flex flex-col gap-2"
                            }
                        >
                            {videos.map((video, index) => {
                                const selected = selectedVideos.includes(video.id)

                                return viewMode === "grid" ? (
                                    <div
                                        key={video.id}
                                        onClick={(e) => toggleSelect(video.id, e)}
                                        className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all hover:-translate-y-1 hover:shadow-md ${
                                            selected
                                                ? "border-red-500 bg-red-50/5 ring-2 ring-red-500/50"
                                                : "dark:bg-card border-gray-200 bg-white dark:border-white/10"
                                        } `}
                                    >
                                        <div className='relative aspect-video w-full overflow-hidden'>
                                            <img
                                                src={video.thumbnail}
                                                alt={video.title}
                                                className='h-full w-full object-cover'
                                            />
                                            <div className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
                                                <button
                                                    onClick={() => handlePlay(index)}
                                                    className='flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-110'
                                                >
                                                    <Play className='h-6 w-6 translate-x-0.5 fill-current' />
                                                </button>
                                            </div>
                                            {selected && (
                                                <div className='absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded bg-red-600 text-xs text-white shadow-lg'>
                                                    ✓
                                                </div>
                                            )}
                                            <span className='absolute right-2 bottom-2 rounded bg-black/80 px-2 py-1 text-xs text-white'>
                                                {formatDuration(video.duration)}
                                            </span>
                                        </div>
                                        <div className='flex flex-col gap-1 p-3'>
                                            <h2 className='line-clamp-2 text-sm font-semibold dark:text-white'>
                                                {video.title}
                                            </h2>
                                            <p className='text-xs text-gray-600 dark:text-gray-400'>
                                                {video.uploader}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        key={video.id}
                                        onClick={(e) => toggleSelect(video.id, e)}
                                        className={`group flex cursor-pointer items-center gap-4 rounded-xl border p-2 transition-all select-none ${
                                            selected
                                                ? "border-red-500 bg-red-50/5"
                                                : "dark:bg-card border-gray-100 bg-white hover:border-red-200 dark:border-white/10"
                                        }`}
                                    >
                                        <div className='relative h-14 w-24 shrink-0 overflow-hidden rounded-lg'>
                                            <img
                                                src={video.thumbnail}
                                                alt={video.title}
                                                className='h-full w-full object-cover'
                                            />
                                            <div className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
                                                <button
                                                    onClick={() => handlePlay(index)}
                                                    className='cursor-pointer rounded-full bg-red-600 p-1.5 text-white shadow-lg'
                                                >
                                                    <Play className='h-4 w-4 translate-x-0.5 fill-current' />
                                                </button>
                                            </div>
                                        </div>
                                        <div className='min-w-0 flex-1'>
                                            <h3 className='truncate text-sm font-semibold dark:text-white'>
                                                {video.title}
                                            </h3>
                                            <p className='truncate text-xs text-gray-500 dark:text-gray-400'>
                                                {video.uploader}
                                            </p>
                                        </div>
                                        <div className='flex items-center gap-4 pr-2'>
                                            <span className='text-xs font-medium text-gray-400'>
                                                {formatDuration(video.duration)}
                                            </span>
                                            {selected && (
                                                <div className='flex h-5 w-5 items-center justify-center rounded bg-red-600 text-[10px] text-white'>
                                                    ✓
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                {!isSearchLoading && videos.length === 0 && searchQuery && !isError && (
                    <div className='-mt-4 text-center text-gray-500 dark:text-gray-400'>
                        No results found for "{searchQuery}"
                    </div>
                )}

                {!isSearchLoading && !searchQuery && (
                    <div className='-mt-4 text-center text-gray-500 dark:text-gray-400'>
                        Search for videos to start downloading
                    </div>
                )}

                {isSearchLoading && (
                    <div
                        className={
                            viewMode === "grid"
                                ? "grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                                : "flex flex-col gap-2"
                        }
                    >
                        {Array.from({ length: 10 }).map((_, i) => (
                            <SongSkeleton key={i} view={viewMode} />
                        ))}
                    </div>
                )}

                {isError && (
                    <div className='-mt-4 text-center text-red-500'>
                        Search failed. Please try again.
                    </div>
                )}
            </div>

            {/* Floating Bottom Bar */}
            <AnimatePresence>
                {selectedVideos.length > 0 && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className='fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-6 rounded-2xl border border-red-500/20 bg-white/90 px-6 py-3 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-black/90'
                    >
                        <p className='text-sm font-bold whitespace-nowrap dark:text-white'>
                            {selectedVideos.length} selected
                        </p>

                        <div className='flex items-center gap-3'>
                            <button
                                onClick={toggleSelectAll}
                                className='flex cursor-pointer items-center gap-2 rounded-lg bg-red-600/10 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-600 hover:text-white'
                                title='Toggle All'
                            >
                                <CheckSquare className='h-4 w-4' />
                                <span>
                                    {selectedVideos.length === videos.length
                                        ? "Deselect All"
                                        : "Select All"}
                                </span>
                            </button>

                            <button
                                onClick={handlePlaySelected}
                                className='flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-transform active:scale-95'
                            >
                                <Play className='h-4 w-4 fill-current' /> Play
                            </button>

                            <div className='flex items-center gap-2 border-x px-3 dark:border-white/10'>
                                <PlaylistSelector
                                    playlists={playlists}
                                    value={playlistInput}
                                    onChange={(playlistInput) => setPlaylistInput(playlistInput)}
                                    className='w-48'
                                />
                                <button
                                    onClick={handleAddToPlaylist}
                                    disabled={!playlistInput || isPlaylistActionLoading}
                                    className='flex min-w-20 cursor-pointer items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50'
                                >
                                    {isPlaylistActionLoading ? (
                                        <Loader2 className='h-4 w-4 animate-spin' />
                                    ) : (
                                        <Plus className='h-4 w-4' />
                                    )}
                                    <span>Add</span>
                                </button>
                            </div>

                            <button
                                onClick={handleAddToQueue}
                                className='cursor-pointer rounded-lg bg-gray-200 px-4 py-2 text-sm font-bold whitespace-nowrap text-gray-700 hover:bg-gray-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                            >
                                Queue
                            </button>

                            <button
                                onClick={handleDownloadNow}
                                className='cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold whitespace-nowrap text-white hover:bg-blue-700'
                            >
                                Download
                            </button>
                        </div>

                        <button
                            onClick={clearSelection}
                            className='cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
                        >
                            Clear
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
