import { PlaylistArt } from "@/components/playlist/playlist-art"
import { SearchAddModal } from "@/components/playlist/search-add-modal"
import ConfirmationDialog from "@/components/ui/confirmation-dialog/confirmation-dialog"
import PlaylistSelector from "@/components/ui/playlist-selector/playlist-selector"
import { usePlaylistMenu } from "@/hooks/usePlaylistMenu"
import { usePlayerStore } from "@/hooks/usePlayer"
import { usePlaylists } from "@/hooks/usePlaylists"
import { formatDuration } from "@/lib/utils"
import { type Playlist } from "@/types"
import { motion } from "framer-motion"
import {
    Check,
    Edit2,
    Import,
    ListMusic,
    Loader2,
    MoreHorizontal,
    Play,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

export function PlaylistCollection({ playlists }: { playlists: Playlist[] }) {
    const navigate = useNavigate()
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)
    const {
        createPlaylist,
        isCreating,
        importPlaylist,
        isImporting,
        renamePlaylist,
        deletePlaylist,
    } = usePlaylists()

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<"create" | "import">("create")
    const [name, setName] = useState("")
    const [url, setUrl] = useState("")
    const [editingId, setEditingId] = useState<string | null>(null)
    const [newName, setNewName] = useState("")
    const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null)
    const [isSearchAddOpen, setIsSearchAddOpen] = useState(false)
    const { moreMenuFor, setMoreMenuFor, renderMoreMenu, renderDialogs } = usePlaylistMenu({
        playlists,
    })

    const openPlaylist = (id: string) => navigate(`/playlists?playlist=${id}`)

    const openModal = (mode: "create" | "import") => {
        setModalMode(mode)
        setName("")
        setUrl("")
        setIsModalOpen(true)
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
                await createPlaylist(name)
            }
            setName("")
            setUrl("")
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
        navigate(`/playlists?playlist=${playlist.id}`)
    }

    return (
        <div className='mx-auto w-full max-w-375 px-4 pt-10 pb-40'>
            <div className='mb-8 flex flex-wrap items-end justify-between gap-4'>
                <div>
                    <h1 className='text-3xl font-bold dark:text-white'>
                        My <span className='text-red-500'>Playlists</span>
                    </h1>
                    <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                        Your collections, all in one place
                    </p>
                </div>
                <button
                    onClick={() => setIsSearchAddOpen(true)}
                    className='dark:bg-card flex h-11 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition-all hover:border-red-200 dark:border-white/10 dark:text-white'
                >
                    <Search className='h-4 w-4 text-red-500' /> Search & Add
                </button>
            </div>

            {playlists.length === 0 ? (
                <div className='flex flex-col items-center gap-6 py-16 text-center'>
                    <span className='flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <ListMusic className='h-9 w-9 text-red-500' />
                    </span>
                    <div className='flex flex-col gap-1'>
                        <h2 className='text-lg font-semibold dark:text-white'>No playlists yet</h2>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                            Create your first playlist to start organizing your music
                        </p>
                    </div>
                    <button
                        onClick={() => openModal("create")}
                        className='flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-medium text-white transition-colors hover:bg-red-700'
                    >
                        <Plus className='h-4 w-4' /> Create Playlist
                    </button>
                </div>
            ) : (
                <div className='grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                    {playlists.map((playlist) => {
                        const totalDuration = playlist.songs.reduce(
                            (acc, song) => acc + (song.duration || 0),
                            0,
                        )

                        return (
                            <div
                                key={playlist.id}
                                onClick={() => openPlaylist(playlist.id)}
                                className='dark:bg-card group relative cursor-pointer rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-red-300 hover:shadow-lg dark:border-white/10'
                            >
                                <div className='relative aspect-square overflow-hidden rounded-t-2xl'>
                                    <PlaylistArt playlist={playlist} className='h-full w-full' />

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
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setMoreMenuFor(
                                                moreMenuFor === playlist.id ? null : playlist.id,
                                            )
                                        }}
                                        data-more-btn={playlist.id}
                                        className='absolute top-2 right-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white opacity-0 shadow-lg backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-black/70'
                                        title='More options'
                                    >
                                        <MoreHorizontal className='h-4 w-4' />
                                    </button>
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
                                            <h3 className='truncate text-sm font-semibold capitalize dark:text-white'>
                                                {playlist.name}
                                            </h3>
                                            <p className='mt-0.5 text-xs text-gray-500 dark:text-gray-400'>
                                                {playlist.songs.length}{" "}
                                                {playlist.songs.length === 1 ? "song" : "songs"} ·{" "}
                                                {formatDuration(totalDuration)}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    <button
                        onClick={() => openModal("create")}
                        className='flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-red-500 hover:text-red-500 dark:border-white/10'
                    >
                        <Plus className='h-8 w-8' />
                        <span className='text-sm font-medium'>New Playlist</span>
                    </button>
                </div>
            )}

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
