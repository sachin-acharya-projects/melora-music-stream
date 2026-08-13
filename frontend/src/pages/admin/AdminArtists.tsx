import AdminLayout from "@/components/admin/admin-layout"
import AdminModal from "@/components/admin/admin-modal"
import AdminThumb from "@/components/admin/admin-thumb"
import ConfirmationDialog from "@/components/ui/confirmation-dialog/confirmation-dialog"
import { useAdminArtistActions, useAdminArtists, useBatchImportArtists } from "@/hooks/useAdmin"
import { useImportYouTubeArtist, useYouTubeArtists } from "@/hooks/useArtists"
import {
    type AdminArtist,
    type YouTubeArtist,
} from "@/types"
import {
    ChevronLeft,
    ChevronRight,
    EyeOff,
    Import,
    Loader2,
    Pencil,
    Plus,
    Search,
    Star,
    Trash2,
    Youtube,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"

const PAGE_SIZE = 50

const SORT_OPTIONS: { value: string; label: string }[] = [
    { value: "created_at:desc", label: "Recently added" },
    { value: "name:asc", label: "Name A–Z" },
    { value: "name:desc", label: "Name Z–A" },
    { value: "follower_count:desc", label: "Most followed" },
    { value: "monthly_listeners:desc", label: "Most listeners" },
    { value: "plays:desc", label: "Most played" },
]

const FILTER_TABS: { value: "all" | "youtube" | "platform"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "youtube", label: "YouTube" },
    { value: "platform", label: "Platform" },
]

const PUBLISHED_TABS: { value: "all" | "published" | "hidden"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "published", label: "Published" },
    { value: "hidden", label: "Hidden" },
]

export default function AdminArtists() {
    const [query, setQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")
    const [source, setSource] = useState<"all" | "youtube" | "platform">("all")
    const [published, setPublished] = useState<"all" | "published" | "hidden">("all")
    const [sort, setSort] = useState("created_at:desc")
    const [page, setPage] = useState(1)

    const [importOpen, setImportOpen] = useState(false)
    const [batchOpen, setBatchOpen] = useState(false)
    const [editing, setEditing] = useState<AdminArtist | null>(null)
    const [deleting, setDeleting] = useState<AdminArtist | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 250)
        return () => clearTimeout(timer)
    }, [query])

    const [sortBy, order] = sort.split(":") as ["created_at" | "name" | "follower_count" | "monthly_listeners" | "plays", "asc" | "desc"]

    const artists = useAdminArtists({
        search: debouncedQuery || undefined,
        source: source === "all" ? undefined : source,
        published: published === "all" ? undefined : published === "published",
        sort_by: sortBy,
        order,
        page,
        page_size: PAGE_SIZE,
    })
    const actions = useAdminArtistActions()

    const totalPages = Math.max(1, Math.ceil((artists.data?.total ?? 0) / PAGE_SIZE))

    const handleToggleFeature = async (artist: AdminArtist) => {
        await actions.featureArtist.mutateAsync({ id: artist.id, featured: !artist.is_featured })
    }

    const handleTogglePublished = async (artist: AdminArtist) => {
        await actions.publishArtist.mutateAsync({ id: artist.id, published: !artist.is_published })
    }

    return (
        <AdminLayout>
            <div className='mb-6 flex flex-wrap items-center justify-between gap-4'>
                <div>
                    <h1 className='text-3xl font-bold dark:text-white'>
                        Artists <span className='text-red-500'>Manager</span>
                    </h1>
                    <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                        Import, curate and edit the artist catalog
                    </p>
                </div>
                <div className='flex items-center gap-2'>
                    <button
                        onClick={() => setImportOpen(true)}
                        className='flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700'
                    >
                        <Plus className='h-4 w-4' />
                        Import artist
                    </button>
                    <button
                        onClick={() => setBatchOpen(true)}
                        className='flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold transition-colors hover:border-red-300 dark:border-white/10 dark:bg-black dark:text-white'
                    >
                        <Import className='h-4 w-4' />
                        Batch import
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
                        placeholder='Search artists...'
                        className='dark:bg-card h-11 w-64 rounded-xl border bg-white pr-4 pl-10 text-sm shadow-sm transition-all focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                    />
                </div>
                <div className='dark:bg-card flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-white/10'>
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => {
                                setSource(tab.value)
                                setPage(1)
                            }}
                            className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                                source === tab.value
                                    ? "bg-red-600 text-white"
                                    : "text-gray-600 hover:text-red-500 dark:text-gray-300"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
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
                <select
                    value={sort}
                    onChange={(e) => {
                        setSort(e.target.value)
                        setPage(1)
                    }}
                    className='dark:bg-card h-11 cursor-pointer rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                >
                    {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {artists.isLoading ? (
                <div className='flex justify-center pt-20'>
                    <Loader2 className='h-12 w-12 animate-spin text-red-600' />
                </div>
            ) : (artists.data?.items ?? []).length === 0 ? (
                <div className='dark:bg-card flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white py-16 text-center dark:border-white/10'>
                    <span className='flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950'>
                        <Youtube className='h-7 w-7 text-red-500' />
                    </span>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                        {debouncedQuery
                            ? `Nothing matched "${debouncedQuery}"`
                            : "No artists in the catalog yet"}
                    </p>
                </div>
            ) : (
                <>
                    <div className='dark:bg-card overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10'>
                        <div className='flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-white/10'>
                            <span className='text-sm text-gray-500 dark:text-gray-400'>
                                {artists.data?.total ?? 0} artist
                                {(artists.data?.total ?? 0) === 1 ? "" : "s"}
                            </span>
                        </div>
                        <div className='divide-y divide-gray-100 dark:divide-white/5'>
                            {(artists.data?.items ?? []).map((artist) => (
                                <div
                                    key={artist.id}
                                    className='flex flex-wrap items-center gap-4 px-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5'
                                >
                                    <AdminThumb
                                        src={artist.thumbnail_url}
                                        alt={artist.name}
                                        className='h-12 w-12 rounded-xl'
                                    />
                                    <div className='min-w-0 flex-1'>
                                        <div className='flex items-center gap-2'>
                                            <p className='truncate font-semibold dark:text-white'>
                                                {artist.name}
                                            </p>
                                            {artist.is_featured && (
                                                <span className='flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-600 dark:bg-purple-950 dark:text-purple-400'>
                                                    <Star className='h-3 w-3' />
                                                    Featured
                                                </span>
                                            )}
                                            {artist.is_published ? (
                                                <span className='rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600 dark:bg-green-950 dark:text-green-400'>
                                                    Published
                                                </span>
                                            ) : (
                                                <span className='flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-950 dark:text-amber-400'>
                                                    <EyeOff className='h-3 w-3' />
                                                    Hidden
                                                </span>
                                            )}
                                            {artist.is_from_youtube && (
                                                <span className='flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-950 dark:text-red-400'>
                                                    <Youtube className='h-3 w-3' />
                                                    YouTube
                                                </span>
                                            )}
                                        </div>
                                        <p className='truncate text-sm text-gray-500 dark:text-gray-400'>
                                            {(artist.genres ?? []).join(", ") || "No genres"}
                                        </p>
                                    </div>
                                    <div className='flex items-center gap-1'>
                                        <button
                                            onClick={() => handleToggleFeature(artist)}
                                            disabled={actions.featureArtist.isPending}
                                            className={`flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                                                artist.is_featured
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-black/5 text-gray-600 hover:text-purple-500 dark:bg-white/10 dark:text-gray-300"
                                            }`}
                                            title={artist.is_featured ? "Unfeature" : "Feature"}
                                        >
                                            <Star className='h-4 w-4' />
                                        </button>
                                        <button
                                            onClick={() => handleTogglePublished(artist)}
                                            disabled={actions.publishArtist.isPending}
                                            className={`flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                                                artist.is_published
                                                    ? "bg-black/5 text-gray-600 hover:text-amber-500 dark:bg-white/10 dark:text-gray-300"
                                                    : "bg-green-600 text-white"
                                            }`}
                                            title={artist.is_published ? "Hide" : "Publish"}
                                        >
                                            {artist.is_published ? (
                                                <EyeOff className='h-4 w-4' />
                                            ) : (
                                                <span className='text-sm'>Publish</span>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setEditing(artist)}
                                            className='flex h-9 cursor-pointer items-center justify-center rounded-lg bg-black/5 px-2.5 text-gray-600 transition-colors hover:text-blue-500 dark:bg-white/10 dark:text-gray-300'
                                            title='Edit'
                                        >
                                            <Pencil className='h-4 w-4' />
                                        </button>
                                        <button
                                            onClick={() => setDeleting(artist)}
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

            {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
            {batchOpen && (
                <BatchImportModal
                    onClose={() => setBatchOpen(false)}
                    onDone={() => {
                        setBatchOpen(false)
                        setPage(1)
                    }}
                />
            )}
            {editing && (
                <EditArtistModal artist={editing} onClose={() => setEditing(null)} />
            )}
            <ConfirmationDialog
                isOpen={!!deleting}
                title={`Delete ${deleting?.name}?`}
                message='This permanently removes the artist and its relations from the catalog. This cannot be undone.'
                confirmText='Delete'
                onConfirm={() => {
                    if (deleting) actions.deleteArtist.mutate(deleting.id)
                }}
                onCancel={() => setDeleting(null)}
            />
        </AdminLayout>
    )
}

// ------------------------------------------------------------------ #
// Import modal (YouTube search + pick)
// ------------------------------------------------------------------ #
function ImportModal({ onClose }: { onClose: () => void }) {
    const [query, setQuery] = useState("")
    const [debounced, setDebounced] = useState("")
    const [importingId, setImportingId] = useState<string | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(query), 300)
        return () => clearTimeout(timer)
    }, [query])

    const results = useYouTubeArtists(debounced, true)
    const importYouTube = useImportYouTubeArtist()

    const handleImport = async (artist: YouTubeArtist) => {
        setImportingId(artist.channel_id)
        try {
            await importYouTube.mutateAsync({
                channel_id: artist.channel_id,
                name: artist.name,
                thumbnail: artist.thumbnail || null,
            })
            toast.success(`Imported "${artist.name}"`)
            onClose()
        } catch {
            toast.error("Failed to import artist")
        } finally {
            setImportingId(null)
        }
    }

    return (
        <AdminModal isOpen title='Import artist from YouTube' onClose={onClose}>
            <div className='relative mb-4'>
                <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
                <input
                    type='text'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder='Search YouTube channels...'
                    autoFocus
                    className='dark:bg-card h-11 w-full rounded-xl border bg-white pr-4 pl-10 text-sm shadow-sm transition-all focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                />
            </div>
            {results.isLoading ? (
                <div className='flex justify-center py-8'>
                    <Loader2 className='h-8 w-8 animate-spin text-red-600' />
                </div>
            ) : !debounced ? (
                <p className='py-8 text-center text-sm text-gray-500 dark:text-gray-400'>
                    Search to find artists and import their channels
                </p>
            ) : (results.data?.items ?? []).length === 0 ? (
                <p className='py-8 text-center text-sm text-gray-500 dark:text-gray-400'>
                    No artists found for "{debounced}"
                </p>
            ) : (
                <div className='flex flex-col gap-2'>
                    {(results.data?.items ?? []).map((artist) => (
                        <div
                            key={artist.channel_id}
                            className='flex items-center gap-3 rounded-xl border border-gray-200 p-2.5 dark:border-white/10'
                        >
                            <AdminThumb
                                src={artist.thumbnail}
                                alt={artist.name}
                                className='h-11 w-11 rounded-lg'
                            />
                            <div className='min-w-0 flex-1'>
                                <p className='truncate text-sm font-semibold dark:text-white'>
                                    {artist.name}
                                </p>
                                <p className='text-xs text-gray-500 dark:text-gray-400'>
                                    {artist.is_in_library
                                        ? "Already in library"
                                        : `${artist.subscribers?.toLocaleString() ?? "?"} subscribers`}
                                </p>
                            </div>
                            <button
                                onClick={() => handleImport(artist)}
                                disabled={importingId === artist.channel_id}
                                className='flex cursor-pointer items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50'
                            >
                                {importingId === artist.channel_id && (
                                    <Loader2 className='h-3 w-3 animate-spin' />
                                )}
                                Import
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </AdminModal>
    )
}

// ------------------------------------------------------------------ #
// Batch import modal
// ------------------------------------------------------------------ #
function BatchImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const [items, setItems] = useState("")
    const [thumbnail, setThumbnail] = useState("")
    const [result, setResult] = useState<string | null>(null)
    const batchImport = useBatchImportArtists()

    const handleSubmit = async () => {
        const lines = items
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
        if (lines.length === 0) {
            toast.error("Enter at least one artist name or URL")
            return
        }
        if (lines.length > 50) {
            toast.error("Maximum 50 artists per batch")
            return
        }
        const response = await batchImport.mutateAsync({
            items: lines,
            thumbnail: thumbnail.trim() || null,
        })
        const failed = response.items.filter((item) => item.status === "failed")
        setResult(
            `${response.imported} imported, ${response.already_exists} already in library, ${response.failed} failed` +
                (failed.length ? ` — ${failed.map((item) => item.input).join(", ")}` : ""),
        )
        onDone()
    }

    return (
        <AdminModal isOpen title='Batch import artists' onClose={onClose}>
            <p className='mb-3 text-sm text-gray-500 dark:text-gray-400'>
                One per line — an artist name, a YouTube channel ID, or a channel URL (e.g.{" "}
                <code className='rounded bg-black/5 px-1 dark:bg-white/10'>
                    @dafpunk
                </code>
                ).
            </p>
            <textarea
                value={items}
                onChange={(e) => setItems(e.target.value)}
                rows={6}
                placeholder={"Daft Punk\n@radiohead\nUC98wRBoFyB4QxFQvE4DxXzA"}
                className='dark:bg-card mb-3 w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
            />
            <input
                type='text'
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                placeholder='Optional shared thumbnail URL'
                className='dark:bg-card mb-4 h-11 w-full rounded-xl border bg-white px-3 text-sm shadow-sm focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
            />
            {result && (
                <p className='mb-4 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400'>
                    {result}
                </p>
            )}
            <div className='flex justify-end gap-3'>
                <button
                    onClick={onClose}
                    className='cursor-pointer rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={batchImport.isPending}
                    className='flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-6 py-2 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-60'
                >
                    {batchImport.isPending && <Loader2 className='h-4 w-4 animate-spin' />}
                    Import batch
                </button>
            </div>
        </AdminModal>
    )
}

// ------------------------------------------------------------------ #
// Edit modal
// ------------------------------------------------------------------ #
function EditArtistModal({
    artist,
    onClose,
}: {
    artist: AdminArtist
    onClose: () => void
}) {
    const [name, setName] = useState(artist.name)
    const [bio, setBio] = useState(artist.bio ?? "")
    const [genres, setGenres] = useState((artist.genres ?? []).join(", "))
    const [thumbnailUrl, setThumbnailUrl] = useState(artist.thumbnail_url ?? "")
    const { updateArtist } = useAdminArtistActions()

    const handleSave = async () => {
        await updateArtist.mutateAsync({
            id: artist.id,
            update: {
                name: name.trim() || undefined,
                bio: bio.trim() || undefined,
                genres: genres
                    .split(",")
                    .map((genre) => genre.trim())
                    .filter(Boolean),
                thumbnail_url: thumbnailUrl.trim() || undefined,
            },
        })
        onClose()
    }

    return (
        <AdminModal isOpen title={`Edit ${artist.name}`} onClose={onClose}>
            <div className='flex flex-col gap-4'>
                <label className='flex flex-col gap-1.5 text-sm'>
                    <span className='font-medium text-gray-700 dark:text-gray-300'>Name</span>
                    <input
                        type='text'
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className='dark:bg-card h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                    />
                </label>
                <label className='flex flex-col gap-1.5 text-sm'>
                    <span className='font-medium text-gray-700 dark:text-gray-300'>Genres</span>
                    <input
                        type='text'
                        value={genres}
                        onChange={(e) => setGenres(e.target.value)}
                        placeholder='rock, electronic, ...'
                        className='dark:bg-card h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                    />
                </label>
                <label className='flex flex-col gap-1.5 text-sm'>
                    <span className='font-medium text-gray-700 dark:text-gray-300'>
                        Thumbnail URL
                    </span>
                    <input
                        type='text'
                        value={thumbnailUrl}
                        onChange={(e) => setThumbnailUrl(e.target.value)}
                        className='dark:bg-card h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
                    />
                </label>
                <label className='flex flex-col gap-1.5 text-sm'>
                    <span className='font-medium text-gray-700 dark:text-gray-300'>Bio</span>
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        className='dark:bg-card resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm focus:border-red-500 focus:outline-none dark:border-white/10 dark:text-white'
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
                        disabled={updateArtist.isPending}
                        className='flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-6 py-2 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-60'
                    >
                        {updateArtist.isPending && <Loader2 className='h-4 w-4 animate-spin' />}
                        Save
                    </button>
                </div>
            </div>
        </AdminModal>
    )
}
