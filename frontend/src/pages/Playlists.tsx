import BulkActionBar from "@/components/ui/bulk-action-bar/bulk-action-bar"
import ConfirmationDialog from "@/components/ui/confirmation-dialog/confirmation-dialog"
import PlaylistSelector from "@/components/ui/playlist-selector/playlist-selector"
import ReorderItem from "@/components/ui/reorder-item/reorder-item"
import ViewToggle from "@/components/ui/view-toggle/view-toggle"
import { usePlayerStore } from "@/hooks/usePlayer"
import { usePlaylists } from "@/hooks/usePlaylists"
import { useQueueStore } from "@/hooks/useQueue"
import { useThemeStore } from "@/hooks/useTheme"
import { useTitle } from "@/hooks/useTitle"
import { formatDuration } from "@/lib/utils"
import { apiService } from "@/services/api.service"
import { type Playlist, type Song } from "@/types"
import { useQueryClient } from "@tanstack/react-query"
import { AnimatePresence, motion, Reorder } from "framer-motion"
import {
    ArrowDown,
    ArrowUp,
    Calendar,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    Import,
    LayoutList,
    ListMusic,
    Loader2,
    Play,
    Search,
    Settings,
    Type,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { toast } from "react-toastify"

const ITEMS_PER_PAGE = 10

export default function Playlists() {
    useTitle("My Playlists")
    const queryClient = useQueryClient()
    const [searchParams, setSearchParams] = useSearchParams()

    const [importUrl, setImportUrl] = useState("")
    const [importName, setImportName] = useState("")
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [playlistSearch, setPlaylistSearch] = useState("")
    const [selectedSongIds, setSelectedSongs] = useState<string[]>([])
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
    const [isPaginated, setIsPaginated] = useState(true)
    const [targetPlaylistId, setTargetPlaylistId] = useState("")

    const importRef = useRef<HTMLDivElement>(null)
    const { viewMode, setViewMode, sortOrder, setSortOrder } = useThemeStore()
    const addDownloadQueue = useQueueStore((s) => s.add)
    const addToNowPlaying = usePlayerStore((s) => s.addToQueue)

    // Derived state from URL
    const selectedView = searchParams.get("view") || "all"
    const currentPage = parseInt(searchParams.get("page") || "1")
    const urlSortOrder = (searchParams.get("order") as "asc" | "desc") || sortOrder
    const urlSortBy = (searchParams.get("sort_by") as "name" | "created_at") || "created_at"

    const {
        playlists,
        isLoading,
        importPlaylist,
        isImporting,
        removeSongs,
        isRemoving,
        addSong,
        isAdding,
        createPlaylist,
        isCreating,
    } = usePlaylists({
        sort_by: urlSortBy,
        order: urlSortOrder,
        q: playlistSearch,
    })

    // Local state for songs to allow smooth reordering without cache lag
    const [localSongs, setLocalSongs] = useState<Song[]>([])

    useEffect(() => {
        if (
            !searchParams.get("order") ||
            !searchParams.get("sort_by") ||
            !searchParams.get("view")
        ) {
            setSearchParams(
                (prev) => {
                    if (!prev.get("order")) prev.set("order", urlSortOrder)
                    if (!prev.get("sort_by")) prev.set("sort_by", urlSortBy)
                    if (!prev.get("view")) prev.set("view", selectedView)
                    return prev
                },
                { replace: true },
            )
        }
    }, [searchParams, setSearchParams, urlSortBy, urlSortOrder, selectedView])

    // Sync local songs when external playlists data changes
    const sortedSongsFromPlaylists = useMemo(() => {
        let songs: Song[] = []
        if (selectedView === "all") {
            songs = playlists.flatMap((p) => p.songs)
        } else {
            const playlist = playlists.find((p) => p.id === selectedView)
            songs = playlist ? [...playlist.songs] : []
        }

        if (playlistSearch) {
            const query = playlistSearch.toLowerCase()
            songs = songs.filter(
                (s) =>
                    (s.title?.toLowerCase() || "").includes(query) ||
                    (s.uploader?.toLowerCase() || "").includes(query),
            )
        }
        return songs
    }, [playlists, selectedView, playlistSearch])

    useEffect(() => {
        setLocalSongs(sortedSongsFromPlaylists)
    }, [sortedSongsFromPlaylists])

    // Dialog states
    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
    const [removalData, setRemovalData] = useState<{
        playlistId: string
        songIds: string[]
    } | null>(null)

    const setPlaylist = usePlayerStore((s) => s.setPlaylist)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (importRef.current && !importRef.current.contains(event.target as Node)) {
                // Selector handles itself
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleImport = (e: React.FormEvent) => {
        e.preventDefault()
        if (!importUrl || !importName) return

        const existing = playlists.find((p) => p.name?.toLowerCase() === importName.toLowerCase())
        if (existing) {
            importPlaylist({ url: importUrl, id: existing.id })
        } else {
            importPlaylist({ url: importUrl, name: importName })
        }
    }

    const totalPages = Math.ceil(localSongs.length / ITEMS_PER_PAGE)
    const paginatedSongs = isPaginated
        ? localSongs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
        : localSongs

    const handlePlay = (index: number) => {
        setPlaylist(localSongs, index, selectedView === "all" ? null : selectedView)
    }

    const handlePageChange = (newPage: number) => {
        setSearchParams((prev) => {
            prev.set("page", newPage.toString())
            return prev
        })
    }

    const handleViewChange = (view: string) => {
        setSearchParams((prev) => {
            prev.set("view", view)
            prev.set("page", "1")
            return prev
        })
        setIsDropdownOpen(false)
    }

    const handleSortOrderToggle = () => {
        const next = urlSortOrder === "asc" ? "desc" : "asc"
        setSortOrder(next)
        setSearchParams((prev) => {
            prev.set("order", next)
            return prev
        })
    }

    const handleSortByToggle = () => {
        const next = urlSortBy === "name" ? "created_at" : "name"
        setSearchParams((prev) => {
            prev.set("sort_by", next)
            return prev
        })
    }

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        if (
            (e.target as HTMLElement).closest("button") ||
            (e.target as HTMLElement).closest(".drag-handle")
        )
            return

        if (e.shiftKey && lastSelectedId) {
            const currentIndex = localSongs.findIndex((s) => s.id === id)
            const lastIndex = localSongs.findIndex((s) => s.id === lastSelectedId)

            if (currentIndex !== -1 && lastIndex !== -1) {
                const start = Math.min(currentIndex, lastIndex)
                const end = Math.max(currentIndex, lastIndex)
                const rangeIds = localSongs.slice(start, end + 1).map((s) => s.id)

                setSelectedSongs((prev) => {
                    const newSelection = new Set([...prev, ...rangeIds])
                    return Array.from(newSelection)
                })
                setLastSelectedId(id)
                return
            }
        }

        setSelectedSongs((prev) => {
            const isSelected = prev.includes(id)
            if (isSelected) {
                setLastSelectedId(null)
                return prev.filter((i) => i !== id)
            } else {
                setLastSelectedId(id)
                return [...prev, id]
            }
        })
    }

    const handleSelectAll = () => {
        const allIds = localSongs.map((s) => s.id)
        if (selectedSongIds.length === allIds.length) {
            setSelectedSongs([])
        } else {
            setSelectedSongs(allIds)
        }
    }

    const clearSelection = () => {
        setSelectedSongs([])
        setLastSelectedId(null)
    }

    const handlePlaySelected = () => {
        const selected = localSongs.filter((s) => selectedSongIds.includes(s.id))
        if (selected.length > 0) {
            setPlaylist(selected, 0, selectedView === "all" ? null : selectedView)
            clearSelection()
        }
    }

    const handleBulkAddToDownloadQueue = () => {
        const selected = localSongs.filter((s) => selectedSongIds.includes(s.id))
        selected.forEach((song) => {
            addDownloadQueue(song, "audio", false)
        })
        toast.success(`Added ${selected.length} items to download queue`)
        clearSelection()
    }

    const handleBulkAddToPlaylist = async () => {
        if (!targetPlaylistId) return
        const songsToAdd = localSongs.filter((s) => selectedSongIds.includes(s.id))

        try {
            const existing = playlists.find(
                (p) =>
                    p.name?.toLowerCase() === targetPlaylistId.toLowerCase() ||
                    p.id === targetPlaylistId,
            )
            let playlistId = existing?.id

            if (!playlistId) {
                const newPlaylist = await createPlaylist(targetPlaylistId)
                playlistId = newPlaylist.id
            }

            await Promise.all(
                songsToAdd.map((song) => {
                    return addSong({ playlistId, song })
                }),
            )

            toast.success(`Added ${songsToAdd.length} items to playlist`)

            clearSelection()
            setTargetPlaylistId("")
        } catch {
            toast.error("Failed to add songs")
        }
    }

    const handleBulkDownload = () => {
        selectedSongIds.forEach((id) => {
            window.open(apiService.getDownloadUrl(id), "_blank")
        })
        clearSelection()
    }

    const handleBulkRemove = () => {
        setRemovalData({
            playlistId: selectedView === "all" ? playlists[0]?.id || "" : selectedView,
            songIds: selectedSongIds,
        })
        setIsRemoveDialogOpen(true)
    }

    const handleReorder = (newSongs: Song[]) => {
        setLocalSongs(newSongs)

        if (selectedView !== "all") {
            queryClient.setQueryData<Playlist[]>(
                ["playlists", { sort_by: urlSortBy, order: urlSortOrder, q: playlistSearch }],
                (prev) => {
                    if (!prev) return prev
                    return prev.map((p) => {
                        if (p.id === selectedView) {
                            const updatedSongs = [...p.songs]
                            const start = isPaginated ? (currentPage - 1) * ITEMS_PER_PAGE : 0
                            updatedSongs.splice(start, newSongs.length, ...newSongs)
                            return { ...p, songs: updatedSongs }
                        }
                        return p
                    })
                },
            )
        }
    }

    const isReorderEnabled = selectedView !== "all" && viewMode === "list"

    const isBulkActionLoading = isAdding || isCreating || isRemoving

    return (
        <div className='mx-auto w-full max-w-375 px-4 pt-10 pb-40'>
            <div className='mb-12 flex flex-col gap-8'>
                <h1 className='text-3xl font-bold dark:text-white'>My Playlists</h1>

                {/* Import Section */}
                <form
                    onSubmit={handleImport}
                    className='dark:bg-card flex flex-wrap items-end gap-4 rounded-xl border border-white/10 bg-white p-6 shadow-sm'
                >
                    <div className='flex min-w-75 flex-1 flex-col gap-2'>
                        <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                            YouTube Playlist URL
                        </label>
                        <input
                            type='text'
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            className='h-12 w-full rounded-lg border bg-gray-50 px-3 text-sm dark:border-white/5 dark:bg-black dark:text-white'
                            placeholder='https://www.youtube.com/playlist?list=...'
                            required
                        />
                    </div>
                    <div className='relative flex w-full flex-col gap-2 sm:w-64' ref={importRef}>
                        <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                            Playlist Name
                        </label>
                        <PlaylistSelector
                            playlists={playlists}
                            value={importName}
                            onChange={setImportName}
                            placeholder='New or existing name'
                        />
                    </div>
                    <button
                        type='submit'
                        disabled={isImporting}
                        className='flex h-12 cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-6 font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                        {isImporting ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                            <Import className='h-5 w-5' />
                        )}
                        Import
                    </button>
                </form>

                {/* Toolbar */}
                <div className='flex flex-wrap items-center justify-between gap-6'>
                    <div className='flex flex-wrap items-center gap-6'>
                        <div className='relative z-50 flex flex-col gap-2'>
                            <label className='text-xs tracking-wider text-gray-500'>
                                Viewing Playlist
                            </label>
                            <div className='relative w-64'>
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className='dark:bg-card flex h-12 w-full cursor-pointer items-center justify-between rounded-xl border bg-white px-4 text-left font-medium shadow-sm transition-all hover:border-red-200 dark:border-white/10 dark:text-white'
                                >
                                    <span className='capitalize'>
                                        {selectedView === "all"
                                            ? "All Playlists"
                                            : playlists.find((p) => p.id === selectedView)?.name ||
                                              "Select..."}
                                    </span>
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                                    />
                                </button>

                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className='dark:bg-card absolute top-full mt-2 w-full overflow-hidden rounded-xl border bg-white p-1 shadow-xl dark:border-white/10'
                                        >
                                            <button
                                                onClick={() => handleViewChange("all")}
                                                className={`w-full cursor-pointer rounded-lg px-4 py-2 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${selectedView === "all" ? "bg-red-50 text-red-600 dark:bg-red-500/10" : "dark:text-white"}`}
                                            >
                                                All Playlists
                                            </button>
                                            {playlists.map((p) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => handleViewChange(p.id)}
                                                    className={`w-full cursor-pointer rounded-lg px-4 py-2 text-left text-sm capitalize transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${selectedView === p.id ? "bg-red-50 text-red-600 dark:bg-red-500/10" : "dark:text-white"}`}
                                                >
                                                    {p.name}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className='flex flex-col gap-2'>
                            <label className='text-xs tracking-wider text-gray-500'>
                                Search Playlist
                            </label>
                            <div className='relative'>
                                <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
                                <input
                                    type='text'
                                    value={playlistSearch}
                                    onChange={(e) => setPlaylistSearch(e.target.value)}
                                    placeholder='Search songs...'
                                    className='dark:bg-card h-12 w-64 rounded-xl border bg-white pr-4 pl-10 text-sm shadow-sm transition-all focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                                />
                            </div>
                        </div>

                        <div className='flex flex-col gap-2'>
                            <label className='text-xs tracking-wider text-gray-500'>Sort By</label>
                            <button
                                onClick={handleSortByToggle}
                                className='dark:bg-card flex h-12 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 font-medium shadow-sm transition-all hover:border-red-200 dark:border-white/10 dark:text-white'
                            >
                                {urlSortBy === "name" ? (
                                    <>
                                        <Type className='h-4 w-4 text-red-500' />
                                        <span>Name</span>
                                    </>
                                ) : (
                                    <>
                                        <Calendar className='h-4 w-4 text-red-500' />
                                        <span>Date</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className='flex flex-col gap-2'>
                            <label className='text-xs tracking-wider text-gray-500'>Order</label>
                            <button
                                onClick={handleSortOrderToggle}
                                className='dark:bg-card flex h-12 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 font-medium shadow-sm transition-all hover:border-red-200 dark:border-white/10 dark:text-white'
                            >
                                {urlSortOrder === "asc" ? (
                                    <>
                                        <ArrowUp className='h-4 w-4 text-red-500' />
                                        <span>Ascending</span>
                                    </>
                                ) : (
                                    <>
                                        <ArrowDown className='h-4 w-4 text-red-500' />
                                        <span>Descending</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className='flex flex-col gap-2'>
                            <label className='text-xs tracking-wider text-gray-500'>
                                Reordering
                            </label>
                            <button
                                onClick={() => setIsPaginated(!isPaginated)}
                                className={`flex h-12 cursor-pointer items-center gap-2 rounded-xl border px-4 font-medium shadow-sm transition-all ${
                                    !isPaginated
                                        ? "border-red-500 bg-red-500 text-white"
                                        : "dark:bg-card bg-white hover:border-red-200 dark:border-white/10 dark:text-white"
                                }`}
                                title={
                                    isPaginated
                                        ? "Disable pagination to reorder across the whole list"
                                        : "Enable pagination"
                                }
                            >
                                <LayoutList className='h-4 w-4' />
                                <span>{isPaginated ? "Paginated" : "Show All"}</span>
                            </button>
                        </div>
                    </div>

                    <div className='flex items-center gap-4'>
                        <div className='flex flex-col items-end gap-2'>
                            <label className='text-xs tracking-wider text-gray-500'>Playlist Setting</label>
                            <Link
                                to='/playlists/edit'
                                className='flex h-12 cursor-pointer items-center gap-2 rounded-xl border px-4 font-medium shadow-sm transition-all'
                            >
                                <Settings className='h-4 w-4' /> Edit
                            </Link>
                        </div>
                        <div className='flex flex-col items-end gap-2'>
                            <label className='text-xs tracking-wider text-gray-500'>Layout</label>
                            <ViewToggle view={viewMode} onChange={setViewMode} />
                        </div>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className='flex justify-center py-20'>
                    <Loader2 className='h-12 w-12 animate-spin text-red-600' />
                </div>
            ) : localSongs.length === 0 ? (
                <div className='py-5 text-center text-2xl text-gray-500'>No songs found.</div>
            ) : (
                <div className='flex flex-col gap-8'>
                    <div className='flex items-center justify-between'>
                        <h2 className='text-xl font-semibold capitalize dark:text-white'>
                            {selectedView === "all"
                                ? "All Songs"
                                : playlists.find((p) => p.id === selectedView)?.name || "Playlist"}
                        </h2>
                        <span className='text-sm text-gray-500'>{localSongs.length} songs</span>
                    </div>

                    {isReorderEnabled ? (
                        <Reorder.Group
                            axis='y'
                            values={paginatedSongs}
                            onReorder={handleReorder}
                            className='flex flex-col gap-2'
                        >
                            {paginatedSongs.map((song) => (
                                <ReorderItem
                                    key={song.id}
                                    song={song}
                                    selectedSongIds={selectedSongIds}
                                    toggleSelect={toggleSelect}
                                    handlePlay={() => handlePlay(localSongs.indexOf(song))}
                                    onAddToQueue={() => {
                                        addToNowPlaying(song)
                                        toast.success("Added to queue")
                                    }}
                                    onDownload={() =>
                                        window.open(apiService.getDownloadUrl(song.id), "_blank")
                                    }
                                />
                            ))}
                        </Reorder.Group>
                    ) : (
                        <div
                            className={
                                viewMode === "grid"
                                    ? "grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                                    : "flex flex-col gap-2"
                            }
                        >
                            {paginatedSongs.map((song) => {
                                const isSelected = selectedSongIds.includes(song.id)
                                const globalIndex = localSongs.indexOf(song)

                                return viewMode === "grid" ? (
                                    <div
                                        key={song.id}
                                        onClick={(e) => toggleSelect(song.id, e)}
                                        className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all ${
                                            isSelected
                                                ? "border-red-500 bg-red-50/10 ring-2 ring-red-500/50"
                                                : "dark:bg-card border-gray-200 bg-white hover:border-red-300 dark:border-white/10"
                                        }`}
                                    >
                                        <div className='relative aspect-video w-full overflow-hidden'>
                                            <img
                                                src={song.thumbnail}
                                                alt={song.title}
                                                className='h-full w-full object-cover'
                                            />
                                            <div className='absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handlePlay(globalIndex)
                                                    }}
                                                    className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-110'
                                                    title='Play Now'
                                                >
                                                    <Play className='h-5 w-5 translate-x-0.5 fill-current' />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        addToNowPlaying(song)
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
                                                            apiService.getDownloadUrl(song.id),
                                                            "_blank",
                                                        )
                                                    }}
                                                    className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-110'
                                                    title='Download MP3'
                                                >
                                                    <Download className='h-5 w-5' />
                                                </button>
                                            </div>
                                            {isSelected && (
                                                <div className='absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded bg-red-600 text-xs text-white shadow-lg'>
                                                    ✓
                                                </div>
                                            )}
                                            <span className='absolute right-2 bottom-2 rounded bg-black/80 px-2 py-1 text-xs text-white'>
                                                {formatDuration(song.duration)}
                                            </span>
                                        </div>
                                        <div className='p-3'>
                                            <h3 className='line-clamp-2 text-sm font-semibold dark:text-white'>
                                                {song.title || "Unknown Title"}
                                            </h3>
                                            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                                                {song.uploader || "Unknown Artist"}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        key={song.id}
                                        onClick={(e) => toggleSelect(song.id, e)}
                                        className={`group flex cursor-pointer items-center gap-4 rounded-xl border p-2 transition-all select-none ${
                                            isSelected
                                                ? "border-red-500 bg-red-500/10"
                                                : "dark:bg-card border-gray-100 bg-white hover:border-red-200 dark:border-white/10"
                                        }`}
                                    >
                                        <div className='relative h-14 w-24 shrink-0 overflow-hidden rounded-lg'>
                                            <img
                                                src={song.thumbnail}
                                                alt={song.title}
                                                className='h-full w-full object-cover'
                                            />
                                            <div className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handlePlay(globalIndex)
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
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    addToNowPlaying(song)
                                                    toast.success("Added to queue")
                                                }}
                                                className='flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/5 hover:text-red-500 dark:hover:bg-white/5'
                                                title='Add to Queue'
                                            >
                                                <ListMusic className='h-4 w-4' />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    window.open(
                                                        apiService.getDownloadUrl(song.id),
                                                        "_blank",
                                                    )
                                                }}
                                                className='flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-black/5 hover:text-red-500 dark:hover:bg-white/5'
                                                title='Download'
                                            >
                                                <Download className='h-4 w-4' />
                                            </button>
                                            {isSelected && (
                                                <div className='ml-2 flex h-5 w-5 items-center justify-center rounded bg-red-600 text-[10px] text-white'>
                                                    ✓
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {isPaginated && totalPages > 1 && (
                        <div className='mt-8 flex items-center justify-center gap-4'>
                            <button
                                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className='dark:bg-card flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border bg-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white'
                            >
                                <ChevronLeft className='h-5 w-5' />
                            </button>
                            <span className='text-sm font-medium text-gray-500'>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() =>
                                    handlePageChange(Math.min(totalPages, currentPage + 1))
                                }
                                disabled={currentPage === totalPages}
                                className='dark:bg-card flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border bg-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white'
                            >
                                <ChevronRight className='h-5 w-5' />
                            </button>
                        </div>
                    )}
                </div>
            )}

            <BulkActionBar
                isVisible={selectedSongIds.length > 0}
                selectedCount={selectedSongIds.length}
                totalCount={localSongs.length}
                onSelectAll={handleSelectAll}
                onPlay={handlePlaySelected}
                playlists={playlists}
                playlistValue={targetPlaylistId}
                onPlaylistValueChange={setTargetPlaylistId}
                onAddToPlaylist={handleBulkAddToPlaylist}
                isPlaylistLoading={isBulkActionLoading}
                onAddToQueue={handleBulkAddToDownloadQueue}
                onDownload={handleBulkDownload}
                onDelete={handleBulkRemove}
                onClear={clearSelection}
            />

            <ConfirmationDialog
                isOpen={isRemoveDialogOpen}
                title='Remove Songs'
                message={`Are you sure you want to remove ${removalData?.songIds.length} songs from the playlist?`}
                confirmText='Remove'
                onConfirm={() => {
                    if (removalData) {
                        removeSongs({
                            playlistId: removalData.playlistId,
                            songIds: removalData.songIds,
                        })
                    }
                }}
                onCancel={() => setIsRemoveDialogOpen(false)}
                type='danger'
            />
        </div>
    )
}
