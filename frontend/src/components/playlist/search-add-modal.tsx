import PlaylistSelector from "@/components/ui/playlist-selector/playlist-selector"
import { usePlaylists } from "@/hooks/usePlaylists"
import { formatDuration } from "@/lib/utils"
import { apiService } from "@/services/api.service"
import { type Playlist, type Song } from "@/types"
import { MESSAGES } from "@/utils/messages"
import { motion } from "framer-motion"
import { Check, Import, Loader2, Plus, Search, X } from "lucide-react"
import { useState } from "react"
import { toast } from "react-toastify"

export function SearchAddModal({
    playlists,
    lockedTargetId,
    onClose,
    onSwitchToImport,
}: {
    playlists: Playlist[]
    lockedTargetId?: string
    onClose: () => void
    onSwitchToImport?: () => void
}) {
    const { addSongsBulk, isAddingBulk, createPlaylist, isCreating } = usePlaylists()
    const lockedPlaylist = lockedTargetId
        ? playlists.find((p) => p.id === lockedTargetId)
        : undefined
    const [targetName, setTargetName] = useState(lockedPlaylist?.name ?? "")
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<Song[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState(false)
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

    const hasTarget = !!lockedTargetId || targetName.trim().length > 0

    const resolveTarget = async (): Promise<{ id: string; name: string } | null> => {
        if (lockedTargetId) {
            return { id: lockedTargetId, name: lockedPlaylist?.name ?? "playlist" }
        }
        const trimmed = targetName.trim()
        if (!trimmed) return null
        const existing = playlists.find((p) => p.name.toLowerCase() === trimmed.toLowerCase())
        if (existing) return { id: existing.id, name: existing.name }
        const created = await createPlaylist({ name: trimmed })
        return { id: created.id, name: created.name }
    }

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return
        setIsSearching(true)
        setSearchError(false)
        try {
            const { songs } = await apiService.search(query.trim())
            setResults(songs)
        } catch {
            setSearchError(true)
            setResults([])
        } finally {
            setIsSearching(false)
        }
    }

    const handleAdd = async (song: Song) => {
        const target = await resolveTarget()
        if (!target) return
        try {
            await addSongsBulk({ playlistId: target.id, songs: [song] })
            setAddedIds((prev) => new Set(prev).add(song.id))
            toast.success(`Added to ${target.name}`)
        } catch {
            toast.error("Failed to add song")
        }
    }

    const handleAddAll = async () => {
        const target = await resolveTarget()
        if (!target || results.length === 0) return
        try {
            await addSongsBulk({ playlistId: target.id, songs: results })
            setAddedIds(new Set(results.map((r) => r.id)))
            toast.success(`Added ${results.length} songs`)
        } catch {
            toast.error(MESSAGES.ADD_SONGS_FAILED)
        }
    }

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className='dark:bg-card flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border bg-white p-6 shadow-xl dark:border-white/10'
                onClick={(e) => e.stopPropagation()}
            >
                <div className='mb-4 flex items-center justify-between'>
                    <h2 className='text-lg font-bold dark:text-white'>Search & Add</h2>
                    <button
                        onClick={onClose}
                        className='cursor-pointer text-gray-400 transition-colors hover:text-red-500'
                    >
                        <X className='h-5 w-5' />
                    </button>
                </div>

                <div className='mb-4 flex flex-col gap-1.5'>
                    <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        {lockedTargetId ? "Adding to" : "Add to playlist"}
                    </label>
                    {lockedTargetId ? (
                        <input
                            type='text'
                            value={lockedPlaylist?.name ?? ""}
                            disabled
                            className='h-11 w-full cursor-default rounded-lg border bg-gray-50 px-3 text-sm opacity-60 dark:border-white/5 dark:bg-black dark:text-white'
                        />
                    ) : (
                        <PlaylistSelector
                            playlists={playlists}
                            value={targetName}
                            onChange={setTargetName}
                            placeholder='Select or type a playlist name...'
                            className='w-full'
                        />
                    )}
                    {!lockedTargetId && isCreating && (
                        <p className='flex items-center gap-1.5 text-xs text-gray-500'>
                            <Loader2 className='h-3 w-3 animate-spin' /> Creating a new playlist…
                        </p>
                    )}
                </div>

                <form onSubmit={handleSearch} className='mb-4 flex gap-2'>
                    <input
                        type='text'
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder='Search for songs, artists...'
                        className='h-11 w-full rounded-lg border bg-gray-50 px-3 text-sm dark:border-white/5 dark:bg-black dark:text-white'
                    />
                    <button
                        type='submit'
                        disabled={isSearching}
                        className='flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                        {isSearching ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                            <Search className='h-4 w-4' />
                        )}
                        Search
                    </button>
                </form>

                <div className='flex-1 overflow-y-auto'>
                    {searchError && (
                        <p className='py-8 text-center text-sm text-red-500'>
                            Search failed. Please try again.
                        </p>
                    )}

                    {!isSearching && !searchError && results.length === 0 && (
                        <p className='py-8 text-center text-sm text-gray-400'>
                            {query
                                ? "No results found. Try a different search."
                                : "Search the catalog, then add songs to a playlist."}
                        </p>
                    )}

                    {results.length > 0 && (
                        <div className='flex flex-col gap-2'>
                            <div className='flex items-center justify-between'>
                                <p className='text-xs font-medium text-gray-500'>
                                    {results.length} {results.length === 1 ? "result" : "results"}
                                </p>
                                <button
                                    onClick={handleAddAll}
                                    disabled={isAddingBulk || !hasTarget}
                                    className='flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950'
                                >
                                    <Plus className='h-3.5 w-3.5' /> Add all
                                </button>
                            </div>

                            {results.map((song) => {
                                const added = addedIds.has(song.id)
                                return (
                                    <div
                                        key={song.id}
                                        className='dark:bg-card flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-2 dark:border-white/10'
                                    >
                                        <img
                                            src={song.thumbnail}
                                            alt={song.title}
                                            loading='lazy'
                                            decoding='async'
                                            referrerPolicy='no-referrer'
                                            className='h-11 w-[70px] shrink-0 rounded-lg object-cover'
                                        />
                                        <div className='min-w-0 flex-1'>
                                            <h3 className='truncate text-sm font-semibold dark:text-white'>
                                                {song.title || "Unknown Title"}
                                            </h3>
                                            <p className='truncate text-xs text-gray-500 dark:text-gray-400'>
                                                {song.uploader || "Unknown Artist"} ·{" "}
                                                {formatDuration(song.duration)}
                                            </p>
                                        </div>
                                        {added ? (
                                            <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'>
                                                <Check className='h-4 w-4' />
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleAdd(song)}
                                                disabled={isAddingBulk || isCreating || !hasTarget}
                                                className='flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950'
                                                title='Add to playlist'
                                            >
                                                <Plus className='h-4 w-4' />
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {onSwitchToImport && (
                    <button
                        type='button'
                        onClick={onSwitchToImport}
                        className='mt-4 flex cursor-pointer items-center justify-center gap-2 self-center border-t pt-4 text-sm font-medium text-gray-500 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400'
                    >
                        <Import className='h-4 w-4' /> Import from YouTube instead
                    </button>
                )}
            </motion.div>
        </div>
    )
}
