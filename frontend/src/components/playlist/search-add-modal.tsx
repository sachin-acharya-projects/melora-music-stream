import { usePlaylists } from "@/hooks/usePlaylists"
import { formatDuration } from "@/lib/utils"
import { apiService } from "@/services/api.service"
import { type Playlist, type Song } from "@/types"
import { motion } from "framer-motion"
import { Check, ChevronDown, Import, Loader2, Plus, Search, X } from "lucide-react"
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
    const { addSongsBulk, isAddingBulk } = usePlaylists()
    const [targetId, setTargetId] = useState(lockedTargetId ?? playlists[0]?.id ?? "")
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<Song[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState(false)
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return
        setIsSearching(true)
        setSearchError(false)
        try {
            const data = await apiService.search(query.trim())
            setResults(data)
        } catch {
            setSearchError(true)
            setResults([])
        } finally {
            setIsSearching(false)
        }
    }

    const handleAdd = async (song: Song) => {
        if (!targetId) return
        try {
            await addSongsBulk({ playlistId: targetId, songs: [song] })
            setAddedIds((prev) => new Set(prev).add(song.id))
            toast.success(`Added to ${playlists.find((p) => p.id === targetId)?.name}`)
        } catch {
            toast.error("Failed to add song")
        }
    }

    const handleAddAll = async () => {
        if (!targetId || results.length === 0) return
        try {
            await addSongsBulk({ playlistId: targetId, songs: results })
            setAddedIds(new Set(results.map((r) => r.id)))
            toast.success(`Added ${results.length} songs`)
        } catch {
            toast.error("Failed to add songs")
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
                    <div className='relative'>
                        <select
                            value={targetId}
                            onChange={(e) => setTargetId(e.target.value)}
                            disabled={!!lockedTargetId}
                            className='h-11 w-full cursor-pointer appearance-none rounded-lg border bg-gray-50 px-3 pr-10 text-sm disabled:cursor-default disabled:opacity-60 dark:border-white/5 dark:bg-black dark:text-white'
                        >
                            {playlists.map((p) => (
                                <option key={p.id} value={p.id} className='capitalize'>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className='pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
                    </div>
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
                                    disabled={isAddingBulk}
                                    className='flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950'
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
                                                disabled={isAddingBulk}
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
