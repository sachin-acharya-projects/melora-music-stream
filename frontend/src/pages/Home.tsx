import SearchForm from "@/components/search-form/search-form"
import SongSkeleton from "@/components/song-skeleton/song-skeleton"
import BulkActionBar from "@/components/ui/bulk-action-bar/bulk-action-bar"
import ViewToggle from "@/components/ui/view-toggle/view-toggle"
import { usePlayerStore } from "@/hooks/usePlayer"
import { usePlaylists } from "@/hooks/usePlaylists"
import { useQueueStore } from "@/hooks/useQueue"
import { useSearch } from "@/hooks/useSearch"
import { useThemeStore } from "@/hooks/useTheme"
import { useTitle } from "@/hooks/useTitle"
import { formatDuration } from "@/lib/utils"
import { apiService } from "@/services/api.service"
import { Download, ListMusic, Play, Settings2 } from "lucide-react"
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
    const addDownloadQueue = useQueueStore((s) => s.add)
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)
    const addToNowPlaying = usePlayerStore((s) => s.addToQueue)

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

    const handleBulkAddToDownloadQueue = () => {
        const selectedSongs = videos.filter((v) => selectedVideos.includes(v.id))
        selectedSongs.forEach((song) => {
            addDownloadQueue(song, "audio", false)
        })
        toast.success(`Added ${selectedSongs.length} items to download queue`)
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
                (p) => p.name?.toLowerCase() === playlistInput.toLowerCase(),
            )
            let playlistId = existing?.id

            if (!playlistId) {
                const newPlaylist = await createPlaylist(playlistInput)
                playlistId = newPlaylist.id
            }

            await Promise.all(
                songsToAdd.map(async (song) => {
                    await addSong({ playlistId: playlistId!, song })
                }),
            )

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
                                            <div className='absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
                                                <button
                                                    onClick={() => handlePlay(index)}
                                                    className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-110'
                                                    title='Play Now'
                                                >
                                                    <Play className='h-5 w-5 translate-x-0.5 fill-current' />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        addToNowPlaying(video)
                                                        toast.success("Added to queue")
                                                    }}
                                                    className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-110'
                                                    title='Add to Queue'
                                                >
                                                    <ListMusic className='h-5 w-5' />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        window.open(
                                                            apiService.getDownloadUrl(video.id),
                                                            "_blank",
                                                        )
                                                    }}
                                                    className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-110'
                                                    title='Download MP3'
                                                >
                                                    <Download className='h-5 w-5' />
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
                                                {video.title || "Unknown Title"}
                                            </h2>
                                            <p className='text-xs text-gray-600 dark:text-gray-400'>
                                                {video.uploader || "Unknown Artist"}
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
                                                {video.title || "Unknown Title"}
                                            </h3>
                                            <p className='truncate text-xs text-gray-500 dark:text-gray-400'>
                                                {video.uploader || "Unknown Artist"}
                                            </p>
                                        </div>
                                        <div className='flex items-center gap-2 pr-2'>
                                            <span className='mr-2 text-xs font-medium text-gray-400'>
                                                {formatDuration(video.duration)}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    addToNowPlaying(video)
                                                    toast.success("Added to queue")
                                                }}
                                                className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/5 hover:text-red-500 dark:hover:bg-white/5'
                                                title='Add to Queue'
                                            >
                                                <ListMusic className='h-4 w-4' />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    window.open(
                                                        apiService.getDownloadUrl(video.id),
                                                        "_blank",
                                                    )
                                                }}
                                                className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/5 hover:text-red-500 dark:hover:bg-white/5'
                                                title='Download'
                                            >
                                                <Download className='h-4 w-4' />
                                            </button>
                                            {selected && (
                                                <div className='ml-2 flex h-5 w-5 items-center justify-center rounded bg-red-600 text-[10px] text-white'>
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

            <BulkActionBar
                isVisible={selectedVideos.length > 0}
                selectedCount={selectedVideos.length}
                totalCount={videos.length}
                onSelectAll={toggleSelectAll}
                onPlay={handlePlaySelected}
                playlists={playlists}
                playlistValue={playlistInput}
                onPlaylistValueChange={setPlaylistInput}
                onAddToPlaylist={handleAddToPlaylist}
                isPlaylistLoading={isPlaylistActionLoading}
                onAddToQueue={handleBulkAddToDownloadQueue}
                onDownload={handleDownloadNow}
                onClear={clearSelection}
            />
        </div>
    )
}
