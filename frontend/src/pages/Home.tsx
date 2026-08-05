import SearchForm from "@/components/search-form/search-form"
import SongSkeleton from "@/components/song-skeleton/song-skeleton"
import BulkActionBar from "@/components/ui/bulk-action-bar/bulk-action-bar"
import ViewToggle from "@/components/ui/view-toggle/view-toggle"
import { usePlayerStore } from "@/hooks/usePlayer"
import { usePlaylists } from "@/hooks/usePlaylists"
import { useQueueStore } from "@/hooks/useQueue"
import { useSearch } from "@/hooks/useSearch"
import { useSongSelection } from "@/hooks/useSongSelection"
import { useThemeStore } from "@/hooks/useTheme"
import { useTitle } from "@/hooks/useTitle"
import { formatDuration } from "@/lib/utils"
import { openDownload, openDownloads } from "@/utils/download"
import {
    Download,
    ListEnd,
    ListMusic,
    Music2,
    Play,
    Search,
    User,
    type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"

export default function Home() {
    useTitle("Melora Music")
    const [searchQuery, setSearchQuery] = useState("")
    const [playlistInput, setPlaylistInput] = useState("")
    const { selectedSongIds, toggleSelect, toggleSelectAll, clearSelection, getSelectedSongs } =
        useSongSelection()

    const quickActions: Array<{
        to: string
        label: string
        description: string
        icon: LucideIcon
    }> = [
        {
            to: "/playlists",
            label: "Playlists",
            description: "Manage your collections",
            icon: ListMusic,
        },
        { to: "/now-playing", label: "Now Playing", description: "Control playback", icon: Music2 },
        { to: "/queue", label: "Queue", description: "See what's next", icon: ListEnd },
        { to: "/profile", label: "Profile", description: "Your account", icon: User },
    ]

    const { viewMode, setViewMode } = useThemeStore()
    const addDownloadQueue = useQueueStore((s) => s.add)
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)
    const addToNowPlaying = usePlayerStore((s) => s.addToQueue)

    const { playlists, addSongsBulk, createPlaylist, isAddingBulk, isCreating } = usePlaylists()
    const { data: videos = [], isLoading: isSearchLoading, isError } = useSearch(searchQuery)

    const onSearch = (q: string) => {
        setSearchQuery(q)
        clearSelection()
    }

    const handleBulkAddToDownloadQueue = () => {
        const selectedSongs = getSelectedSongs(videos)
        selectedSongs.forEach((song) => {
            addDownloadQueue(song, "audio", false)
        })
        toast.success(`Added ${selectedSongs.length} items to download queue`)
        clearSelection()
    }

    const handleDownloadNow = () => {
        openDownloads(selectedSongIds)
        clearSelection()
    }

    const handleAddToPlaylist = async () => {
        if (!playlistInput) return

        const songsToAdd = getSelectedSongs(videos)

        try {
            const existing = playlists.find(
                (p) => p.name?.toLowerCase() === playlistInput.toLowerCase(),
            )
            let playlistId = existing?.id

            if (!playlistId) {
                const newPlaylist = await createPlaylist(playlistInput)
                playlistId = newPlaylist.id
            }

            await addSongsBulk({ playlistId: playlistId!, songs: songsToAdd })

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
        const selected = getSelectedSongs(videos)
        if (selected.length > 0) {
            setPlaylist(selected, 0)
            clearSelection()
        }
    }

    const isPlaylistActionLoading = isAddingBulk || isCreating

    return (
        <div className='flex flex-col items-center gap-12'>
            {/* Header */}
            <div className='flex flex-col items-center gap-5 pt-32'>
                <h1 className='text-center text-5xl font-bold text-shadow-md dark:text-white'>
                    <span className='text-red-500'>Melora</span> Music
                </h1>

                <p className='text-center text-gray-500 dark:text-gray-400'>
                    Search, discover, and stream your favorite music
                </p>

                <SearchForm onSearch={onSearch} isLoading={isSearchLoading} />

                <div className='mt-4 grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-4'>
                    {quickActions.map((action) => (
                        <Link
                            key={action.to}
                            to={action.to}
                            className='group dark:bg-card flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-5 text-center transition-all hover:-translate-y-1 hover:border-red-300 hover:shadow-md dark:border-white/10 dark:hover:border-red-800'
                        >
                            <span className='flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600 transition-colors group-hover:bg-red-600 group-hover:text-white dark:bg-red-950 dark:text-red-400'>
                                <action.icon className='h-5 w-5' />
                            </span>
                            <span className='text-sm font-semibold dark:text-white'>
                                {action.label}
                            </span>
                            <span className='text-xs text-gray-500 dark:text-gray-400'>
                                {action.description}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Content Section */}
            <div className='mx-auto w-full max-w-375 px-4 pb-40'>
                {videos.length > 0 && (
                    <>
                        {/* Toolbar */}
                        <div className='mb-6 flex items-center justify-between'>
                            <div className='flex items-center gap-4'>
                                <button
                                    onClick={() => toggleSelectAll(videos.map((v) => v.id))}
                                    className='cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95'
                                >
                                    {selectedSongIds.length === videos.length
                                        ? "Deselect All"
                                        : "Select All"}
                                </button>
                                <p className='text-sm text-gray-600 dark:text-gray-400'>
                                    {selectedSongIds.length} selected
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
                                const selected = selectedSongIds.includes(video.id)

                                return viewMode === "grid" ? (
                                    <div
                                        key={video.id}
                                        onClick={(e) => toggleSelect(video.id, e, videos)}
                                        className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all hover:-translate-y-1 hover:shadow-md ${
                                            selected
                                                ? "border-red-500 bg-red-50 ring-2 ring-red-500/50 dark:bg-red-950"
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
                                                        openDownload(video.id)
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
                                        onClick={(e) => toggleSelect(video.id, e, videos)}
                                        className={`group flex cursor-pointer items-center gap-4 rounded-xl border p-2 transition-all select-none ${
                                            selected
                                                ? "border-red-500 bg-red-50 dark:bg-red-950"
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
                                                    openDownload(video.id)
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
                    <div className='-mt-4 flex flex-col items-center gap-4 pt-16 text-center'>
                        <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                            <Search className='h-9 w-9 text-red-500' />
                        </span>
                        <div className='flex flex-col gap-1'>
                            <h2 className='text-lg font-semibold dark:text-white'>
                                No results found
                            </h2>
                            <p className='text-sm text-gray-500 dark:text-gray-400'>
                                Nothing matched "{searchQuery}". Try a different search.
                            </p>
                        </div>
                    </div>
                )}

                {!isSearchLoading && !searchQuery && (
                    <div className='-mt-4 flex flex-col items-center gap-4 pt-16 text-center'>
                        <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                            <Music2 className='h-9 w-9 text-red-500' />
                        </span>
                        <div className='flex flex-col gap-1'>
                            <h2 className='text-lg font-semibold dark:text-white'>
                                Discover new music
                            </h2>
                            <p className='text-sm text-gray-500 dark:text-gray-400'>
                                Search for songs, artists, or albums to start listening
                            </p>
                        </div>
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
                isVisible={selectedSongIds.length > 0}
                selectedCount={selectedSongIds.length}
                totalCount={videos.length}
                onSelectAll={() => toggleSelectAll(videos.map((v) => v.id))}
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
