import { PlaylistArt } from "@/components/playlist/playlist-art"
import { SearchAddModal } from "@/components/playlist/search-add-modal"
import ConfirmationDialog from "@/components/ui/confirmation-dialog/confirmation-dialog"
import PlaylistSelector from "@/components/ui/playlist-selector/playlist-selector"
import SortSelect, { type SortSelectOption } from "@/components/ui/sort-select/sort-select"
import { usePlaylistMenu } from "@/hooks/usePlaylistMenu"
import { usePlayerStore } from "@/hooks/usePlayer"
import { usePlaylists } from "@/hooks/usePlaylists"
import { formatDuration } from "@/lib/utils"
import { type PlaylistSortOptions } from "@/services/playlist.service"
import { type Playlist } from "@/types"
import { AnimatePresence, motion } from "framer-motion"
import {
    Check,
    CheckSquare,
    Edit2,
    Eye,
    EyeOff,
    Heart,
    Import,
    ListMusic,
    Loader2,
    MoreHorizontal,
    Play,
    Plus,
    Search,
    Trash2,
    Users,
    X,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { type PlaylistsTab } from "@/pages/Playlists"

const COLLECTION_SORT_OPTIONS: SortSelectOption[] = [
    { value: "created_at:desc", label: "Recently added" },
    { value: "created_at:asc", label: "Oldest first" },
    { value: "name:asc", label: "Name A–Z" },
    { value: "name:desc", label: "Name Z–A" },
]

const TAB_LABELS: Record<PlaylistsTab, { title: string; subtitle: string }> = {
    mine: {
        title: "My Playlists",
        subtitle: "Your collections, all in one place",
    },
    discover: {
        title: "Discover",
        subtitle: "Trending public playlists from the community",
    },
    following: {
        title: "Following",
        subtitle: "Playlists you're following",
    },
}

interface PlaylistCollectionProps {
    playlists: Playlist[]
    sort: PlaylistSortOptions
    onSortChange: (sort: PlaylistSortOptions) => void
    view?: PlaylistsTab
    onTabChange?: (tab: PlaylistsTab) => void
    search?: string
    onSearchChange?: (query: string) => void
    onFollow?: (playlistId: string) => Promise<{ is_following: boolean; follower_count: number }>
    isFollowing?: boolean
}

export function PlaylistCollection({
    playlists,
    sort,
    onSortChange,
    view = "mine",
    onTabChange,
    search = "",
    onSearchChange,
    onFollow,
    isFollowing,
}: PlaylistCollectionProps) {
    const navigate = useNavigate()
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)
    const {
        createPlaylist,
        isCreating,
        importPlaylist,
        isImporting,
        renamePlaylist,
        deletePlaylist,
        deletePlaylistsBulk,
    } = usePlaylists()

    const isOwnerView = view === "mine"

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<"create" | "import">("create")
    const [name, setName] = useState("")
    const [url, setUrl] = useState("")
    const [description, setDescription] = useState("")
    const [visibility, setVisibility] = useState<"private" | "public">("private")
    const [editingId, setEditingId] = useState<string | null>(null)
    const [newName, setNewName] = useState("")
    const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null)
    const [isSearchAddOpen, setIsSearchAddOpen] = useState(false)
    const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([])
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const { moreMenuFor, setMoreMenuFor, renderMoreMenu, renderDialogs } = usePlaylistMenu({
        playlists,
    })

    const selectedPlaylists = useMemo(
        () => playlists.filter((p) => selectedPlaylistIds.includes(p.id)),
        [playlists, selectedPlaylistIds],
    )

    const openPlaylist = (id: string) => navigate(`/playlists?view=${view}&playlist=${id}`)

    const clearSelection = () => setSelectedPlaylistIds([])

    const togglePlaylistSelect = (id: string) => {
        setSelectedPlaylistIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        )
    }

    const toggleSelectAll = () => {
        setSelectedPlaylistIds((prev) =>
            prev.length === playlists.length ? [] : playlists.map((p) => p.id),
        )
    }

    const handleBulkPlay = () => {
        const songs = selectedPlaylists.flatMap((p) => p.songs)
        if (songs.length > 0) {
            setPlaylist(songs, 0, selectedPlaylists[0]?.id ?? null)
            navigate(`/playlists?playlist=${selectedPlaylists[0]?.id}`)
        }
        clearSelection()
    }

    const handleBulkDelete = () => {
        deletePlaylistsBulk(selectedPlaylistIds)
        setIsBulkDeleteOpen(false)
        clearSelection()
    }

    const openModal = (mode: "create" | "import") => {
        setModalMode(mode)
        setName("")
        setUrl("")
        setDescription("")
        setVisibility("private")
        setIsModalOpen(true)
    }

    const toggleFollow = async (playlist: Playlist) => {
        if (onFollow) {
            await onFollow(playlist.id)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name) return
        try {
            if (url) {
                const existing = playlists.find((p) => p.name?.toLowerCase() === name.toLowerCase())
                if (existing) {
                    await importPlaylist({ url, id: existing.id })
                } else {
                    await importPlaylist({ url, name })
                }
            } else {
                await createPlaylist({ name, description: description || undefined, visibility })
            }
            setName("")
            setUrl("")
            setDescription("")
            setIsModalOpen(false)
        } catch {
            // Error toast is handled by the mutation's onError.
        }
    }

    const handleRename = (e: React.FormEvent) => {
        e.preventDefault()
        if (editingId && newName) {
            renamePlaylist({ id: editingId, name: newName })
        }
        setEditingId(null)
    }

    const handlePlayAll = (playlist: Playlist) => {
        setPlaylist(playlist.songs, 0, playlist.id)
        navigate(`/playlists?view=${view}&playlist=${playlist.id}`)
    }

    return (
        <div className='mx-auto w-full max-w-375 px-4 pt-10 pb-40'>
            <div className='mb-8 flex flex-wrap items-end justify-between gap-4'>
                <div>
                    <h1 className='text-3xl font-bold dark:text-white'>
                        {TAB_LABELS[view].title.split(" ")[0]}{" "}
                        <span className='text-red-500'>Playlists</span>
                    </h1>
                    <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                        {TAB_LABELS[view].subtitle}
                    </p>
                </div>
                <div className='flex items-center gap-3'>
                    {onSearchChange && (
                        <div className='relative'>
                            <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
                            <input
                                type='text'
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder={
                                    view === "discover"
                                        ? "Search public playlists..."
                                        : view === "following"
                                          ? "Search followed playlists..."
                                          : "Search your playlists..."
                                }
                                className='dark:bg-card h-11 w-56 rounded-xl border bg-white pr-4 pl-10 text-sm shadow-sm transition-all focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                            />
                        </div>
                    )}
                    {onTabChange && (
                        <div className='dark:bg-card flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-white/10'>
                            {(Object.keys(TAB_LABELS) as PlaylistsTab[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => onTabChange(tab)}
                                    className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                        view === tab
                                            ? "bg-red-600 text-white"
                                            : "text-gray-600 hover:text-red-500 dark:text-gray-300"
                                    }`}
                                >
                                    {tab === "mine"
                                        ? "My Playlists"
                                        : tab === "discover"
                                          ? "Discover"
                                          : "Following"}
                                </button>
                            ))}
                        </div>
                    )}
                    <div
                        className={`flex items-center gap-3 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
                            isOwnerView
                                ? "max-w-[400px] opacity-100"
                                : "pointer-events-none -ml-3 max-w-0 opacity-0"
                        }`}
                    >
                        <SortSelect
                            value={`${sort.sort_by ?? "created_at"}:${sort.order ?? "desc"}`}
                            onChange={(value) => {
                                const [sort_by, order] = value.split(":") as [
                                    "name" | "created_at",
                                    "asc" | "desc",
                                ]
                                onSortChange({ sort_by, order })
                            }}
                            options={COLLECTION_SORT_OPTIONS}
                        />
                        <button
                            onClick={() => setIsSearchAddOpen(true)}
                            className='dark:bg-card flex h-11 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition-all hover:border-red-200 dark:border-white/10 dark:text-white'
                        >
                            <Search className='h-4 w-4 text-red-500' /> Search & Add
                        </button>
                    </div>
                </div>
            </div>

            {playlists.length === 0 ? (
                <div className='flex flex-col items-center gap-6 py-16 text-center'>
                    <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <ListMusic className='h-9 w-9 text-red-500' />
                    </span>
                    <div className='flex flex-col gap-1'>
                        {search.trim() ? (
                            <>
                                <h2 className='text-lg font-semibold dark:text-white'>
                                    No playlists found
                                </h2>
                                <p className='text-sm text-gray-500 dark:text-gray-400'>
                                    No results for “{search.trim()}”. Try a different search.
                                </p>
                            </>
                        ) : (
                            <>
                                <h2 className='text-lg font-semibold dark:text-white'>
                                    {isOwnerView
                                        ? "No playlists yet"
                                        : view === "following"
                                          ? "Not following anyone yet"
                                          : "No public playlists yet"}
                                </h2>
                                <p className='text-sm text-gray-500 dark:text-gray-400'>
                                    {isOwnerView
                                        ? "Create your first playlist to start organizing your music"
                                        : view === "following"
                                          ? "Follow playlists from Discover to see them here"
                                          : "When the community publishes playlists, they'll show up here"}
                                </p>
                            </>
                        )}
                    </div>
                    {isOwnerView && !search.trim() && (
                        <button
                            onClick={() => openModal("create")}
                            className='flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-medium text-white transition-colors hover:bg-red-700'
                        >
                            <Plus className='h-4 w-4' /> Create Playlist
                        </button>
                    )}
                </div>
            ) : (
                <div className='grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                    {playlists.map((playlist) => {
                        const totalDuration = playlist.songs.reduce(
                            (acc, song) => acc + (song.duration || 0),
                            0,
                        )
                        const isOwned = isOwnerView || playlist.is_owner
                        const canFollow = !isOwned && !!onFollow

                        return (
                            <div
                                key={playlist.id}
                                onClick={() => openPlaylist(playlist.id)}
                                className='dark:bg-card group relative cursor-pointer rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-red-300 hover:shadow-lg dark:border-white/10'
                            >
                                <div className='relative aspect-square overflow-hidden rounded-t-2xl'>
                                    <PlaylistArt playlist={playlist} className='h-full w-full' />

                                    {isOwned && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                togglePlaylistSelect(playlist.id)
                                            }}
                                            title={
                                                selectedPlaylistIds.includes(playlist.id)
                                                    ? "Deselect"
                                                    : "Select"
                                            }
                                            className={`absolute top-2 left-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 shadow-lg transition-all ${
                                                selectedPlaylistIds.includes(playlist.id)
                                                    ? "border-red-600 bg-red-600 text-white opacity-100"
                                                    : "border-white/70 bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:border-red-600 hover:bg-red-600"
                                            }`}
                                        >
                                            {selectedPlaylistIds.includes(playlist.id) && (
                                                <Check className='h-4 w-4' />
                                            )}
                                        </button>
                                    )}

                                    <div className='absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handlePlayAll(playlist)
                                            }}
                                            className='flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-110'
                                            title='Play All'
                                        >
                                            <Play className='h-5 w-5 translate-x-0.5 fill-current' />
                                        </button>
                                        {isOwned && (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setEditingId(playlist.id)
                                                        setNewName(playlist.name)
                                                    }}
                                                    className='flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-110'
                                                    title='Rename'
                                                >
                                                    <Edit2 className='h-4 w-4' />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setPlaylistToDelete(playlist)
                                                    }}
                                                    className='flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-110'
                                                    title='Delete'
                                                >
                                                    <Trash2 className='h-4 w-4' />
                                                </button>
                                            </>
                                        )}
                                        {canFollow && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    toggleFollow(playlist)
                                                }}
                                                disabled={isFollowing}
                                                className='flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-white/20 px-3 text-sm font-medium text-white shadow-lg backdrop-blur-md transition-transform hover:scale-110 disabled:opacity-60'
                                                title={
                                                    playlist.is_following ? "Unfollow" : "Follow"
                                                }
                                            >
                                                {isFollowing ? (
                                                    <Loader2 className='h-4 w-4 animate-spin' />
                                                ) : (
                                                    <Heart
                                                        className={`h-4 w-4 ${
                                                            playlist.is_following
                                                                ? "fill-red-500 text-red-500"
                                                                : ""
                                                        }`}
                                                    />
                                                )}
                                                {playlist.is_following ? "Following" : "Follow"}
                                            </button>
                                        )}
                                    </div>

                                    {isOwned && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setMoreMenuFor(
                                                    moreMenuFor === playlist.id
                                                        ? null
                                                        : playlist.id,
                                                )
                                            }}
                                            data-more-btn={playlist.id}
                                            className='absolute top-2 right-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white opacity-0 shadow-lg backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-black/70'
                                            title='More options'
                                        >
                                            <MoreHorizontal className='h-4 w-4' />
                                        </button>
                                    )}
                                </div>

                                <div className='p-3'>
                                    {editingId === playlist.id ? (
                                        <form
                                            onSubmit={handleRename}
                                            className='flex items-center gap-1'
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <input
                                                type='text'
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                autoFocus
                                                className='w-full rounded border px-2 py-1 text-sm dark:border-white/10 dark:bg-black dark:text-white'
                                            />
                                            <button
                                                type='submit'
                                                className='cursor-pointer text-emerald-500'
                                            >
                                                <Check className='h-4 w-4' />
                                            </button>
                                            <button
                                                type='button'
                                                onClick={() => setEditingId(null)}
                                                className='cursor-pointer text-red-500'
                                            >
                                                <X className='h-4 w-4' />
                                            </button>
                                        </form>
                                    ) : (
                                        <>
                                            <div className='flex items-center gap-1.5'>
                                                <h3 className='truncate text-sm font-semibold capitalize dark:text-white'>
                                                    {playlist.name}
                                                </h3>
                                                {playlist.visibility === "public" ? (
                                                    <span
                                                        className='flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                                        title='Public playlist'
                                                    >
                                                        <Eye className='h-3 w-3' />
                                                    </span>
                                                ) : (
                                                    <span
                                                        className='flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400'
                                                        title='Private playlist'
                                                    >
                                                        <EyeOff className='h-3 w-3' />
                                                    </span>
                                                )}
                                                {(playlist.follower_count ?? 0) > 0 && (
                                                    <span
                                                        className='flex shrink-0 items-center gap-1 text-[10px] font-medium text-gray-400'
                                                        title='Followers'
                                                    >
                                                        <Heart className='h-3 w-3' />
                                                        {playlist.follower_count}
                                                    </span>
                                                )}
                                                {playlist.is_collaborative && (
                                                    <span
                                                        className='flex shrink-0 items-center gap-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-400'
                                                        title='Collaborative playlist'
                                                    >
                                                        <Users className='h-3 w-3' />
                                                    </span>
                                                )}
                                            </div>
                                            <p className='mt-0.5 text-xs text-gray-500 dark:text-gray-400'>
                                                {playlist.songs.length}{" "}
                                                {playlist.songs.length === 1 ? "song" : "songs"} ·{" "}
                                                {formatDuration(totalDuration)}
                                            </p>
                                            {playlist.description && (
                                                <p className='mt-1 line-clamp-1 text-xs text-gray-400 dark:text-gray-500'>
                                                    {playlist.description}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {isOwnerView && (
                        <button
                            onClick={() => openModal("create")}
                            className='flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-red-500 hover:text-red-500 dark:border-white/10'
                        >
                            <Plus className='h-8 w-8' />
                            <span className='text-sm font-medium'>New Playlist</span>
                        </button>
                    )}
                </div>
            )}

            <AnimatePresence>
                {selectedPlaylistIds.length > 0 && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className='fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-6 rounded-2xl border border-red-500/20 bg-white/90 px-6 py-3 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-black/90'
                    >
                        <p className='text-sm font-bold whitespace-nowrap dark:text-white'>
                            {selectedPlaylistIds.length} selected
                        </p>

                        <div className='flex items-center gap-3'>
                            <button
                                onClick={toggleSelectAll}
                                className='flex cursor-pointer items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-600 hover:text-white dark:bg-red-950'
                                title='Toggle All'
                            >
                                <CheckSquare className='h-4 w-4' />
                                <span>
                                    {selectedPlaylistIds.length === playlists.length
                                        ? "Deselect All"
                                        : "Select All"}
                                </span>
                            </button>

                            <button
                                onClick={handleBulkPlay}
                                className='flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-transform active:scale-95'
                            >
                                <Play className='h-4 w-4 fill-current' /> Play
                            </button>

                            <button
                                onClick={() => setIsBulkDeleteOpen(true)}
                                className='flex cursor-pointer items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-red-500/10'
                            >
                                <Trash2 className='h-4 w-4' /> Delete
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

            <ConfirmationDialog
                isOpen={!!playlistToDelete}
                title='Delete Playlist'
                message={`Are you sure you want to delete "${playlistToDelete?.name}"? This action cannot be undone.`}
                confirmText='Delete'
                onConfirm={() => {
                    if (playlistToDelete) {
                        deletePlaylist(playlistToDelete.id)
                    }
                    setPlaylistToDelete(null)
                }}
                onCancel={() => setPlaylistToDelete(null)}
                type='danger'
            />

            <ConfirmationDialog
                isOpen={isBulkDeleteOpen}
                title='Delete Playlists'
                message={`Are you sure you want to delete ${selectedPlaylistIds.length} playlist${selectedPlaylistIds.length === 1 ? "" : "s"}? This action cannot be undone.`}
                confirmText='Delete'
                onConfirm={handleBulkDelete}
                onCancel={() => setIsBulkDeleteOpen(false)}
                type='danger'
            />

            {isModalOpen && (
                <div
                    className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
                    onClick={() => setIsModalOpen(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className='dark:bg-card w-full max-w-xl rounded-2xl border bg-white p-6 shadow-xl dark:border-white/10'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className='mb-4 flex items-center justify-between'>
                            <h2 className='text-lg font-bold dark:text-white'>
                                {modalMode === "import" ? "Import Playlist" : "New Playlist"}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
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
                            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                                <div className='flex flex-col gap-1.5'>
                                    <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                        {modalMode === "import" ? "Import into" : "Playlist Name"}
                                    </label>
                                    <PlaylistSelector
                                        playlists={playlists}
                                        value={name}
                                        onChange={setName}
                                        showSuggestions={modalMode === "import"}
                                        placeholder={
                                            modalMode === "import"
                                                ? "New or existing name"
                                                : "e.g. My Chill Mix"
                                        }
                                    />
                                    {modalMode === "import" && (
                                        <p className='text-xs text-gray-400'>
                                            Pick an existing playlist to merge into, or type a new
                                            name.
                                        </p>
                                    )}
                                </div>

                                {modalMode === "import" && (
                                    <div className='flex flex-col gap-1.5'>
                                        <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                            YouTube URL
                                        </label>
                                        <input
                                            type='text'
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            placeholder='https://www.youtube.com/playlist?list=...'
                                            autoFocus
                                            required
                                            className='h-11 w-full rounded-lg border bg-gray-50 px-3 text-sm dark:border-white/5 dark:bg-black dark:text-white'
                                        />
                                    </div>
                                )}

                                {modalMode === "create" && (
                                    <>
                                        <div className='flex flex-col gap-1.5'>
                                            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                                Description (optional)
                                            </label>
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="What's this playlist about?"
                                                rows={2}
                                                className='w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm dark:border-white/5 dark:bg-black dark:text-white'
                                            />
                                        </div>
                                        <div className='flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/5 dark:bg-black'>
                                            <div className='flex flex-col gap-0.5'>
                                                <span className='text-sm font-medium dark:text-white'>
                                                    {visibility === "public" ? "Public" : "Private"}
                                                </span>
                                                <span className='text-xs text-gray-500 dark:text-gray-400'>
                                                    {visibility === "public"
                                                        ? "Anyone can discover and follow this playlist"
                                                        : "Only you can see this playlist"}
                                                </span>
                                            </div>
                                            <button
                                                type='button'
                                                onClick={() =>
                                                    setVisibility(
                                                        visibility === "public"
                                                            ? "private"
                                                            : "public",
                                                    )
                                                }
                                                className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
                                                    visibility === "public"
                                                        ? "bg-emerald-500"
                                                        : "bg-gray-300 dark:bg-white/10"
                                                }`}
                                                title='Toggle visibility'
                                            >
                                                <span
                                                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                                        visibility === "public"
                                                            ? "left-[22px]"
                                                            : "left-0.5"
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </>
                                )}

                                {modalMode === "create" && (
                                    <button
                                        type='button'
                                        onClick={() => setModalMode("import")}
                                        className='flex cursor-pointer items-center gap-2 self-start text-sm font-medium text-red-600 transition-colors hover:text-red-700'
                                    >
                                        <Import className='h-4 w-4' /> Import from YouTube instead
                                    </button>
                                )}

                                <div className='flex justify-end gap-2 pt-2'>
                                    <button
                                        type='button'
                                        onClick={() => setIsModalOpen(false)}
                                        className='cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5'
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type='submit'
                                        disabled={isCreating || isImporting}
                                        className='flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
                                    >
                                        {isCreating || isImporting ? (
                                            <Loader2 className='h-4 w-4 animate-spin' />
                                        ) : modalMode === "import" ? (
                                            <Import className='h-4 w-4' />
                                        ) : (
                                            <Plus className='h-4 w-4' />
                                        )}
                                        {modalMode === "import" ? "Import" : "Create"}
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
                    onClose={() => setIsSearchAddOpen(false)}
                    onSwitchToImport={() => {
                        setIsSearchAddOpen(false)
                        setModalMode("import")
                        setIsModalOpen(true)
                    }}
                />
            )}
        </div>
    )
}
