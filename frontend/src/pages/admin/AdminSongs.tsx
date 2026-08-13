import AdminLayout from "@/components/admin/admin-layout"
import AdminModal from "@/components/admin/admin-modal"
import AdminThumb from "@/components/admin/admin-thumb"
import ConfirmationDialog from "@/components/ui/confirmation-dialog/confirmation-dialog"
import {
    useAdminPlaylistImport,
    useAdminSongActions,
    useAdminSongImport,
    useAdminSongs,
} from "@/hooks/useAdmin"
import { type AdminSong } from "@/types"
import { formatDuration } from "@/lib/utils"
import {
    ChevronLeft,
    ChevronRight,
    EyeOff,
    ListMusic,
    Loader2,
    Pencil,
    PlayCircle,
    Plus,
    Search,
    Star,
    Trash2,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"

const PAGE_SIZE = 50

const PUBLISHED_TABS: { value: "all" | "published" | "hidden"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "published", label: "Published" },
    { value: "hidden", label: "Hidden" },
]

export default function AdminSongs() {
    const [query, setQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")
    const [published, setPublished] = useState<"all" | "published" | "hidden">("all")
    const [page, setPage] = useState(1)

    const [importOpen, setImportOpen] = useState(false)
    const [playlistImportOpen, setPlaylistImportOpen] = useState(false)
    const [editing, setEditing] = useState<AdminSong | null>(null)
    const [deleting, setDeleting] = useState<AdminSong | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 250)
        return () => clearTimeout(timer)
    }, [query])

    const songs = useAdminSongs({
        search: debouncedQuery || undefined,
        published: published === "all" ? undefined : published === "published",
        page,
        page_size: PAGE_SIZE,
    })
    const actions = useAdminSongActions()

    const totalPages = Math.max(1, Math.ceil((songs.data?.total ?? 0) / PAGE_SIZE))

    const handleToggleFeature = async (song: AdminSong) => {
        await actions.featureSong.mutateAsync({ id: song.id, featured: !song.is_featured })
    }

    const handleTogglePublished = async (song: AdminSong) => {
        await actions.publishSong.mutateAsync({ id: song.id, published: !song.is_published })
    }

    const handlePlay = (song: AdminSong) => {
        window.open(`https://www.youtube.com/watch?v=${song.id}`, "_blank", "noopener,noreferrer")
    }

    return (
        <AdminLayout>
            <div className='mb-6 flex flex-wrap items-center justify-between gap-4'>
                <div>
                    <h1 className='text-3xl font-bold dark:text-white'>
                        Songs <span className='text-red-500'>Manager</span>
                    </h1>
                    <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                        Import, curate and edit the song catalog
                    </p>
                </div>
                <div className='flex items-center gap-2'>
                    <button
                        onClick={() => setPlaylistImportOpen(true)}
                        className='flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold transition-colors hover:border-red-300 dark:border-white/10 dark:bg-black dark:text-white'
                    >
                        <ListMusic className='h-4 w-4' />
                        Import playlist
                    </button>
                    <button
                        onClick={() => setImportOpen(true)}
                        className='flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700'
                    >
                        <Plus className='h-4 w-4' />
                        Import song
                    </button>
                </div>
            </div>

            <div className='mb-4 flex flex-wrap items-center gap-3'>
                <div className='relative'>
                    <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
                    <input
                        type='text'
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setPage(1)
                        }}
                        placeholder='Search title or uploader...'
                        className='dark:bg-card h-11 w-64 rounded-xl border bg-white pr-4 pl-10 text-sm shadow-sm transition-all focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                    />
                </div>
                <div className='dark:bg-card flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-white/10'>
                    {PUBLISHED_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => {
                                setPublished(tab.value)
                                setPage(1)
                            }}
                            className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                                published === tab.value
                                    ? "bg-red-600 text-white"
                                    : "text-gray-600 hover:text-red-500 dark:text-gray-300"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {songs.isLoading ? (
                <div className='flex justify-center pt-20'>
                    <Loader2 className='h-12 w-12 animate-spin text-red-600' />
                </div>
            ) : (songs.data?.items ?? []).length === 0 ? (
                <div className='dark:bg-card flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white py-16 text-center dark:border-white/10'>
                    <span className='flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <ListMusic className='h-7 w-7 text-red-500' />
                    </span>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                        {debouncedQuery
                            ? `Nothing matched "${debouncedQuery}"`
                            : "No songs in the catalog yet"}
                    </p>
                </div>
            ) : (
                <>
                    <div className='dark:bg-card overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10'>
                        <div className='flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-white/10'>
                            <span className='text-sm text-gray-500 dark:text-gray-400'>
                                {songs.data?.total ?? 0} song
                                {(songs.data?.total ?? 0) === 1 ? "" : "s"}
                            </span>
                        </div>
                        <div className='divide-y divide-gray-100 dark:divide-white/5'>
                            {(songs.data?.items ?? []).map((song) => (
                                <div
                                    key={song.id}
                                    className='flex flex-wrap items-center gap-4 px-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5'
                                >
                                    <AdminThumb
                                        src={song.thumbnail}
                                        alt={song.title}
                                        variant='song'
                                        className='h-12 w-20 rounded-xl'
                                    />
                                    <div className='min-w-0 flex-1'>
                                        <div className='flex items-center gap-2'>
                                            <p className='truncate font-semibold dark:text-white'>
                                                {song.title}
                                            </p>
                                            {song.is_featured && (
                                                <span className='flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-600 dark:bg-purple-950 dark:text-purple-400'>
                                                    <Star className='h-3 w-3' />
                                                    Featured
                                                </span>
                                            )}
                                            {song.is_published ? (
                                                <span className='rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600 dark:bg-green-950 dark:text-green-400'>
                                                    Published
                                                </span>
                                            ) : (
                                                <span className='flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-950 dark:text-amber-400'>
                                                    <EyeOff className='h-3 w-3' />
                                                    Hidden
                                                </span>
                                            )}
                                        </div>
                                        <p className='truncate text-sm text-gray-500 dark:text-gray-400'>
                                            {song.uploader} · {formatDuration(song.duration)}
                                        </p>
                                    </div>
                                    <div className='flex items-center gap-1'>
                                        <button
                                            onClick={() => handlePlay(song)}
                                            className='flex h-9 cursor-pointer items-center justify-center rounded-lg bg-black/5 px-2.5 text-gray-600 transition-colors hover:text-red-500 dark:bg-white/10 dark:text-gray-300'
                                            title='Open on YouTube'
                                        >
                                            <PlayCircle className='h-4 w-4' />
                                        </button>
                                        <button
                                            onClick={() => handleToggleFeature(song)}
                                            disabled={actions.featureSong.isPending}
                                            className={`flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                                                song.is_featured
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-black/5 text-gray-600 hover:text-purple-500 dark:bg-white/10 dark:text-gray-300"
                                            }`}
                                            title={song.is_featured ? "Unfeature" : "Feature"}
                                        >
                                            <Star className='h-4 w-4' />
                                        </button>
                                        <button
                                            onClick={() => handleTogglePublished(song)}
                                            disabled={actions.publishSong.isPending}
                                            className={`flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                                                song.is_published
                                                    ? "bg-black/5 text-gray-600 hover:text-amber-500 dark:bg-white/10 dark:text-gray-300"
                                                    : "bg-green-600 text-white"
                                            }`}
                                            title={song.is_published ? "Hide" : "Publish"}
                                        >
                                            {song.is_published ? (
                                                <EyeOff className='h-4 w-4' />
                                            ) : (
                                                <span className='text-sm'>Publish</span>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setEditing(song)}
                                            className='flex h-9 cursor-pointer items-center justify-center rounded-lg bg-black/5 px-2.5 text-gray-600 transition-colors hover:text-blue-500 dark:bg-white/10 dark:text-gray-300'
                                            title='Edit'
                                        >
                                            <Pencil className='h-4 w-4' />
                                        </button>
                                        <button
                                            onClick={() => setDeleting(song)}
                                            className='flex h-9 cursor-pointer items-center justify-center rounded-lg bg-black/5 px-2.5 text-gray-600 transition-colors hover:text-red-500 dark:bg-white/10 dark:text-gray-300'
                                            title='Delete'
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className='mt-6 flex items-center justify-center gap-3'>
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className='flex h-10 cursor-pointer items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium transition-colors hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-black dark:text-white'
                        >
                            <ChevronLeft className='h-4 w-4' />
                            Previous
                        </button>
                        <span className='text-sm text-gray-500 dark:text-gray-400'>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className='flex h-10 cursor-pointer items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium transition-colors hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-black dark:text-white'
                        >
                            Next
                            <ChevronRight className='h-4 w-4' />
                        </button>
                    </div>
                </>
            )}

            {importOpen && <ImportSongModal onClose={() => setImportOpen(false)} />}
            {playlistImportOpen && (
                <ImportPlaylistModal onClose={() => setPlaylistImportOpen(false)} />
            )}
            {editing && <EditSongModal song={editing} onClose={() => setEditing(null)} />}
            <ConfirmationDialog
                isOpen={!!deleting}
                title={`Delete "${deleting?.title}"?`}
                message='This permanently removes the song from the catalog. This cannot be undone.'
                confirmText='Delete'
                onConfirm={() => {
                    if (deleting) actions.deleteSong.mutate(deleting.id)
                }}
                onCancel={() => setDeleting(null)}
            />
        </AdminLayout>
    )
}

// ------------------------------------------------------------------ #
// Direct song import modal
// ------------------------------------------------------------------ #
function ImportSongModal({ onClose }: { onClose: () => void }) {
    const [url, setUrl] = useState("")
    const importSong = useAdminSongImport()

    const handleSubmit = async () => {
        if (!url.trim()) {
            toast.error("Enter a YouTube video ID or URL")
            return
        }
        await importSong.mutateAsync(url.trim())
        onClose()
    }

    return (
        <AdminModal isOpen title='Import a song' onClose={onClose}>
            <p className='mb-3 text-sm text-gray-500 dark:text-gray-400'>
                Paste a YouTube video URL or a raw video ID.
            </p>
            <input
                type='text'
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder='https://www.youtube.com/watch?v=...'
                autoFocus
                className='dark:bg-card mb-4 h-11 w-full rounded-xl border bg-white px-3 text-sm shadow-sm focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
            />
            <div className='flex justify-end gap-3'>
                <button
                    onClick={onClose}
                    className='cursor-pointer rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={importSong.isPending}
                    className='flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-6 py-2 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-60'
                >
                    {importSong.isPending && <Loader2 className='h-4 w-4 animate-spin' />}
                    Import
                </button>
            </div>
        </AdminModal>
    )
}

// ------------------------------------------------------------------ #
// Playlist import modal
// ------------------------------------------------------------------ #
function ImportPlaylistModal({ onClose }: { onClose: () => void }) {
    const [url, setUrl] = useState("")
    const importPlaylist = useAdminPlaylistImport()

    const handleSubmit = async () => {
        if (!url.trim()) {
            toast.error("Enter a YouTube playlist URL")
            return
        }
        await importPlaylist.mutateAsync(url.trim())
        onClose()
    }

    return (
        <AdminModal isOpen title='Import playlist into the catalog' onClose={onClose}>
            <p className='mb-3 text-sm text-gray-500 dark:text-gray-400'>
                Every song in the playlist is added to the catalog. Songs already in the library are
                skipped.
            </p>
            <input
                type='text'
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder='https://www.youtube.com/playlist?list=...'
                autoFocus
                className='dark:bg-card mb-4 h-11 w-full rounded-xl border bg-white px-3 text-sm shadow-sm focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
            />
            <div className='flex justify-end gap-3'>
                <button
                    onClick={onClose}
                    className='cursor-pointer rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={importPlaylist.isPending}
                    className='flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-6 py-2 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-60'
                >
                    {importPlaylist.isPending && <Loader2 className='h-4 w-4 animate-spin' />}
                    Import playlist
                </button>
            </div>
        </AdminModal>
    )
}

// ------------------------------------------------------------------ #
// Edit song modal
// ------------------------------------------------------------------ #
function EditSongModal({ song, onClose }: { song: AdminSong; onClose: () => void }) {
    const [title, setTitle] = useState(song.title)
    const [uploader, setUploader] = useState(song.uploader)
    const [thumbnail, setThumbnail] = useState(song.thumbnail ?? "")
    const { updateSong } = useAdminSongActions()

    const handleSave = async () => {
        await updateSong.mutateAsync({
            id: song.id,
            update: {
                title: title.trim() || undefined,
                uploader: uploader.trim() || undefined,
                thumbnail: thumbnail.trim() || undefined,
            },
        })
        onClose()
    }

    return (
        <AdminModal isOpen title={`Edit "${song.title}"`} onClose={onClose}>
            <div className='flex flex-col gap-4'>
                <label className='flex flex-col gap-1.5 text-sm'>
                    <span className='font-medium text-gray-700 dark:text-gray-300'>Title</span>
                    <input
                        type='text'
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className='dark:bg-card h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                    />
                </label>
                <label className='flex flex-col gap-1.5 text-sm'>
                    <span className='font-medium text-gray-700 dark:text-gray-300'>Uploader</span>
                    <input
                        type='text'
                        value={uploader}
                        onChange={(e) => setUploader(e.target.value)}
                        className='dark:bg-card h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                    />
                </label>
                <label className='flex flex-col gap-1.5 text-sm'>
                    <span className='font-medium text-gray-700 dark:text-gray-300'>
                        Thumbnail URL
                    </span>
                    <input
                        type='text'
                        value={thumbnail}
                        onChange={(e) => setThumbnail(e.target.value)}
                        className='dark:bg-card h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                    />
                </label>
                <div className='mt-2 flex justify-end gap-3'>
                    <button
                        onClick={onClose}
                        className='cursor-pointer rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={updateSong.isPending}
                        className='flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-6 py-2 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-60'
                    >
                        {updateSong.isPending && <Loader2 className='h-4 w-4 animate-spin' />}
                        Save
                    </button>
                </div>
            </div>
        </AdminModal>
    )
}
