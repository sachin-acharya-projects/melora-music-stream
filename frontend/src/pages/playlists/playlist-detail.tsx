import { PlaylistArt } from "@/components/playlist/playlist-art"
import { SearchAddModal } from "@/components/playlist/search-add-modal"
import BulkActionBar from "@/components/ui/bulk-action-bar/bulk-action-bar"
import ConfirmationDialog from "@/components/ui/confirmation-dialog/confirmation-dialog"
import ReorderItem from "@/components/ui/reorder-item/reorder-item"
import ViewToggle from "@/components/ui/view-toggle/view-toggle"
import { usePlayerStore } from "@/hooks/usePlayer"
import { usePlaylistMenu } from "@/hooks/usePlaylistMenu"
import { usePlaylist, usePlaylists } from "@/hooks/usePlaylists"
import { useQueueStore } from "@/hooks/useQueue"
import { useSongSelection } from "@/hooks/useSongSelection"
import { useThemeStore } from "@/hooks/useTheme"
import { formatDuration } from "@/lib/utils"
import { apiService } from "@/services/api.service"
import { type PlaylistDetail, type Song } from "@/types"
import { useQueryClient } from "@tanstack/react-query"
import { motion, Reorder } from "framer-motion"
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Download,
    Edit2,
    Import,
    LayoutList,
    ListMusic,
    Loader2,
    MoreHorizontal,
    Play,
    Plus,
    Search,
    Shuffle,
    Trash2,
    X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

const ITEMS_PER_PAGE = 10
const SEARCH_PAGE_SIZE = 500

export function PlaylistDetail({ playlistId }: { playlistId: string }) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { viewMode, setViewMode } = useThemeStore()
    const addDownloadQueue = useQueueStore((s) => s.add)
    const addToNowPlaying = usePlayerStore((s) => s.addToQueue)
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)
    const {
        playlists,
        importPlaylist,
        isImporting,
        removeSongs,
        isRemoving,
        addSongsBulk,
        isAddingBulk,
        createPlaylist,
        renamePlaylist,
        deletePlaylist,
    } = usePlaylists()
    const { selectedSongIds, toggleSelect, toggleSelectAll, clearSelection, getSelectedSongs } =
        useSongSelection()

    const [playlistSearch, setPlaylistSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [isPaginated, setIsPaginated] = useState(true)
    const [targetPlaylistId, setTargetPlaylistId] = useState("")

    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
    const [removalData, setRemovalData] = useState<{
        playlistId: string
        songIds: string[]
    } | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isRenameOpen, setIsRenameOpen] = useState(false)
    const [newName, setNewName] = useState("")
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [importUrl, setImportUrl] = useState("")
    const [isSearchAddOpen, setIsSearchAddOpen] = useState(false)
    const { moreMenuFor, setMoreMenuFor, renderMoreMenu, renderDialogs } = usePlaylistMenu({
        playlists,
    })

    const detailOptions = { q: debouncedSearch || undefined, page_size: SEARCH_PAGE_SIZE }
    const playlistQuery = usePlaylist(playlistId, detailOptions)
    const playlist = playlistQuery.data

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(playlistSearch), 250)
        return () => clearTimeout(timer)
    }, [playlistSearch])

    const serverSongs = useMemo(() => playlist?.songs ?? [], [playlist?.songs])
    const totalSongs = playlist?.total_songs ?? serverSongs.length
    const totalDuration =
        playlist?.total_duration ?? serverSongs.reduce((acc, song) => acc + (song.duration || 0), 0)

    const [prevSongs, setPrevSongs] = useState(serverSongs)
    const [localSongs, setLocalSongs] = useState<Song[]>(serverSongs)
    const [currentPage, setCurrentPage] = useState(1)

    if (prevSongs !== serverSongs) {
        setPrevSongs(serverSongs)
        setLocalSongs(serverSongs)
        setCurrentPage(1)
    }

    const totalPages = Math.max(1, Math.ceil(localSongs.length / ITEMS_PER_PAGE))
    const safePage = Math.min(currentPage, totalPages)
    const paginatedSongs = isPaginated
        ? localSongs.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
        : localSongs

    const handlePlay = (index: number) => {
        setPlaylist(localSongs, index, playlistId)
    }

    const handleShuffle = () => {
        const shuffled = [...localSongs].sort(() => Math.random() - 0.5)
        setPlaylist(shuffled, 0, playlistId)
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }

    const handlePlaySelected = () => {
        const selected = getSelectedSongs(localSongs)
        if (selected.length > 0) {
            setPlaylist(selected, 0, playlistId)
            clearSelection()
        }
    }

    const handleBulkAddToDownloadQueue = () => {
        const selected = getSelectedSongs(localSongs)
        selected.forEach((song) => {
            addDownloadQueue(song, "audio", false)
        })
        toast.success(`Added ${selected.length} items to download queue`)
        clearSelection()
    }

    const handleBulkAddToPlaylist = async () => {
        if (!targetPlaylistId) return
        const songsToAdd = getSelectedSongs(localSongs)

        try {
            const existing = playlists.find(
                (p) =>
                    p.name?.toLowerCase() === targetPlaylistId.toLowerCase() ||
                    p.id === targetPlaylistId,
            )
            let playlistIdForBulk = existing?.id

            if (!playlistIdForBulk) {
                const newPlaylist = await createPlaylist(targetPlaylistId)
                playlistIdForBulk = newPlaylist.id
            }

            await addSongsBulk({ playlistId: playlistIdForBulk, songs: songsToAdd })

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
        setRemovalData({ playlistId, songIds: selectedSongIds })
        setIsRemoveDialogOpen(true)
    }

    const handleReorder = (newSongs: Song[]) => {
        setLocalSongs(newSongs)

        queryClient.setQueryData<PlaylistDetail | null>(
            ["playlist", playlistId, detailOptions],
            (prev) => {
                if (!prev) return prev
                const updatedSongs = [...prev.songs]
                const start = isPaginated ? (safePage - 1) * ITEMS_PER_PAGE : 0
                updatedSongs.splice(start, newSongs.length, ...newSongs)
                return { ...prev, songs: updatedSongs }
            },
        )
    }

    const handleImportMore = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!importUrl) return
        try {
            await importPlaylist({ url: importUrl, id: playlistId })
            setImportUrl("")
            setIsImportModalOpen(false)
        } catch {
            // Error toast is handled by the mutation's onError.
        }
    }

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newName) {
            await renamePlaylist({ id: playlistId, name: newName })
        }
        setIsRenameOpen(false)
    }

    const handleDelete = () => {
        deletePlaylist(playlistId)
        navigate("/playlists")
    }

    const isReorderEnabled = viewMode === "list"
    const isBulkActionLoading = isAddingBulk || isRemoving

    if (playlistQuery.isLoading && !playlist) {
        return (
            <div className='flex justify-center pt-20'>
                <Loader2 className='h-12 w-12 animate-spin text-red-600' />
            </div>
        )
    }

    const playlistName = playlist?.name ?? ""

    return (
        <div className='mx-auto w-full max-w-375 px-4 pt-10 pb-40'>
            <button
                onClick={() => navigate("/playlists")}
                className='mb-6 flex cursor-pointer items-center gap-1 text-sm text-gray-500 transition-colors hover:text-red-500'
            >
                <ChevronLeft className='h-4 w-4' /> Playlists
            </button>

            <div className='mb-8 flex flex-col gap-6 sm:flex-row sm:items-end'>
                <div className='flex justify-center sm:justify-start'>
                    {playlist && (
                        <PlaylistArt
                            playlist={playlist}
                            className='h-56 w-56 shrink-0 rounded-2xl shadow-lg sm:h-64 sm:w-64'
                            iconClassName='h-12 w-12'
                        />
                    )}
                </div>

                <div className='min-w-0 flex-1'>
                    <h1 className='text-3xl font-bold capitalize dark:text-white'>
                        {playlistName}
                    </h1>
                    <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                        {totalSongs} {totalSongs === 1 ? "song" : "songs"} ·{" "}
                        {formatDuration(totalDuration)}
                    </p>

                    <div className='mt-4 flex flex-wrap items-center gap-2'>
                        <button
                            onClick={() => handlePlay(0)}
                            disabled={localSongs.length === 0}
                            className='flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                            <Play className='h-4 w-4 translate-x-0.5 fill-current' /> Play
                        </button>
                        <button
                            onClick={handleShuffle}
                            disabled={localSongs.length === 0}
                            className='dark:bg-card flex h-10 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition-all hover:border-red-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white'
                        >
                            <Shuffle className='h-4 w-4' /> Shuffle
                        </button>
                        <button
                            onClick={() => setIsSearchAddOpen(true)}
                            className='dark:bg-card flex h-10 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition-all hover:border-red-200 dark:border-white/10 dark:text-white'
                        >
                            <Plus className='h-4 w-4' /> Add Songs
                        </button>

                        {isRenameOpen ? (
                            <form onSubmit={handleRename} className='flex items-center gap-1'>
                                <input
                                    type='text'
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    autoFocus
                                    className='h-10 w-48 rounded-xl border px-3 text-sm dark:border-white/10 dark:bg-black dark:text-white'
                                />
                                <button
                                    type='submit'
                                    className='cursor-pointer p-2 text-emerald-500'
                                >
                                    <Check className='h-5 w-5' />
                                </button>
                                <button
                                    type='button'
                                    onClick={() => setIsRenameOpen(false)}
                                    className='cursor-pointer p-2 text-red-500'
                                >
                                    <X className='h-5 w-5' />
                                </button>
                            </form>
                        ) : (
                            <button
                                onClick={() => {
                                    setNewName(playlistName)
                                    setIsRenameOpen(true)
                                }}
                                className='dark:bg-card flex h-10 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition-all hover:border-red-200 dark:border-white/10 dark:text-white'
                            >
                                <Edit2 className='h-4 w-4' /> Rename
                            </button>
                        )}

                        <button
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className='flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400'
                        >
                            <Trash2 className='h-4 w-4' /> Delete
                        </button>

                        <button
                            onClick={() =>
                                setMoreMenuFor(moreMenuFor === playlistId ? null : playlistId)
                            }
                            data-more-btn={playlistId}
                            className='dark:bg-card flex h-10 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition-all hover:border-red-200 dark:border-white/10 dark:text-white'
                            title='More options'
                        >
                            <MoreHorizontal className='h-4 w-4' /> More
                        </button>
                    </div>
                </div>
            </div>

            <div className='mb-6 flex flex-wrap items-center justify-between gap-4'>
                <div className='relative'>
                    <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
                    <input
                        type='text'
                        value={playlistSearch}
                        onChange={(e) => {
                            setPlaylistSearch(e.target.value)
                            setCurrentPage(1)
                        }}
                        placeholder='Search in this playlist...'
                        className='dark:bg-card h-11 w-64 rounded-xl border bg-white pr-4 pl-10 text-sm shadow-sm transition-all focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                    />
                </div>

                <div className='flex items-center gap-3'>
                    <button
                        onClick={() => setIsPaginated(!isPaginated)}
                        className={`flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-medium shadow-sm transition-all ${
                            !isPaginated
                                ? "border-red-500 bg-red-500 text-white dark:bg-red-600"
                                : "dark:bg-card border-gray-200 bg-white text-gray-700 hover:border-red-200 dark:border-white/10 dark:text-white"
                        }`}
                        title={
                            isPaginated
                                ? "Disable pagination to view all songs"
                                : "Enable pagination"
                        }
                    >
                        <LayoutList className='h-4 w-4' />
                        <span>{isPaginated ? "Paginated" : "Show All"}</span>
                    </button>
                    <ViewToggle view={viewMode} onChange={setViewMode} />
                </div>
            </div>

            {localSongs.length === 0 ? (
                <div className='flex flex-col items-center gap-4 py-16 text-center'>
                    <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <ListMusic className='h-9 w-9 text-red-500' />
                    </span>
                    <div className='flex flex-col gap-1'>
                        <h2 className='text-lg font-semibold dark:text-white'>
                            {playlistSearch
                                ? "No songs found"
                                : totalSongs === 0
                                  ? "This playlist is empty"
                                  : "No songs here yet"}
                        </h2>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                            {playlistSearch
                                ? `Nothing matched "${playlistSearch}". Try a different search.`
                                : "Add songs via 'Add Songs' or from the search page"}
                        </p>
                    </div>
                </div>
            ) : isReorderEnabled ? (
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
                            toggleSelect={(id, e) => toggleSelect(id, e, localSongs)}
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
                                onClick={(e) => toggleSelect(song.id, e, localSongs)}
                                className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all ${
                                    isSelected
                                        ? "border-red-500 bg-red-50 ring-2 ring-red-500/50 dark:bg-red-950"
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
                                onClick={(e) => toggleSelect(song.id, e, localSongs)}
                                className={`group flex cursor-pointer items-center gap-4 rounded-xl border p-2 transition-all select-none ${
                                    isSelected
                                        ? "border-red-500 bg-red-50 dark:bg-red-950"
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

            {isPaginated && totalPages > 1 && (
                <div className='mt-8 flex items-center justify-center gap-4'>
                    <button
                        onClick={() => handlePageChange(Math.max(1, safePage - 1))}
                        disabled={safePage === 1}
                        className='dark:bg-card flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border bg-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white'
                    >
                        <ChevronLeft className='h-5 w-5' />
                    </button>
                    <span className='text-sm font-medium text-gray-500'>
                        Page {safePage} of {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(Math.min(totalPages, safePage + 1))}
                        disabled={safePage === totalPages}
                        className='dark:bg-card flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border bg-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white'
                    >
                        <ChevronRight className='h-5 w-5' />
                    </button>
                </div>
            )}

            <BulkActionBar
                isVisible={selectedSongIds.length > 0}
                selectedCount={selectedSongIds.length}
                totalCount={localSongs.length}
                onSelectAll={() => toggleSelectAll(localSongs.map((s) => s.id))}
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
                    setIsRemoveDialogOpen(false)
                    clearSelection()
                }}
                onCancel={() => setIsRemoveDialogOpen(false)}
                type='danger'
            />

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                title='Delete Playlist'
                message={`Are you sure you want to delete "${playlistName}"? This action cannot be undone.`}
                confirmText='Delete'
                onConfirm={handleDelete}
                onCancel={() => setIsDeleteDialogOpen(false)}
                type='danger'
            />

            {isImportModalOpen && (
                <div
                    className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
                    onClick={() => setIsImportModalOpen(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className='dark:bg-card w-full max-w-xl rounded-2xl border bg-white p-6 shadow-xl dark:border-white/10'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className='mb-4 flex items-center justify-between'>
                            <h2 className='text-lg font-bold dark:text-white'>
                                Import from YouTube
                            </h2>
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className='cursor-pointer text-gray-400 transition-colors hover:text-red-500'
                            >
                                <X className='h-5 w-5' />
                            </button>
                        </div>

                        {isImporting ? (
                            <div className='flex flex-col items-center gap-3 py-10'>
                                <Loader2 className='h-10 w-10 animate-spin text-red-600' />
                                <p className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                    Importing playlist from YouTube...
                                </p>
                                <p className='text-xs text-gray-400'>
                                    Large playlists can take a while.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleImportMore} className='flex flex-col gap-5'>
                                <div className='flex flex-col gap-2'>
                                    <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                        YouTube URL
                                    </label>
                                    <input
                                        type='text'
                                        value={importUrl}
                                        onChange={(e) => setImportUrl(e.target.value)}
                                        placeholder='Paste a video or playlist link'
                                        autoFocus
                                        required
                                        className='h-11 w-full rounded-lg border bg-gray-50 px-3 text-sm dark:border-white/5 dark:bg-black dark:text-white'
                                    />
                                    <div className='flex flex-col gap-1.5'>
                                        <p className='text-xs text-gray-400'>
                                            Adds its songs to "{playlistName}".
                                        </p>
                                        <button
                                            type='button'
                                            onClick={() => {
                                                setIsImportModalOpen(false)
                                                setIsSearchAddOpen(true)
                                            }}
                                            className='cursor-pointer self-start text-xs font-medium text-gray-500 underline-offset-2 transition-colors hover:text-red-500 hover:underline dark:text-gray-400'
                                        >
                                            Looking for a specific song? Browse the catalog instead.
                                        </button>
                                    </div>
                                </div>

                                <div className='flex justify-end gap-2'>
                                    <button
                                        type='button'
                                        onClick={() => setIsImportModalOpen(false)}
                                        className='cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5'
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type='submit'
                                        disabled={isImporting}
                                        className='flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
                                    >
                                        {isImporting ? (
                                            <Loader2 className='h-4 w-4 animate-spin' />
                                        ) : (
                                            <Import className='h-4 w-4' />
                                        )}
                                        Import
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.div>
                </div>
            )}

            {renderMoreMenu()}
            {renderDialogs()}

            {isSearchAddOpen && (
                <SearchAddModal
                    playlists={playlists}
                    lockedTargetId={playlistId}
                    onClose={() => setIsSearchAddOpen(false)}
                    onSwitchToImport={() => {
                        setIsSearchAddOpen(false)
                        setIsImportModalOpen(true)
                    }}
                />
            )}
        </div>
    )
}
