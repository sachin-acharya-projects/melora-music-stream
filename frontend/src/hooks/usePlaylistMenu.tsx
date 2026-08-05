import ConfirmationDialog from "@/components/ui/confirmation-dialog/confirmation-dialog"
import { usePlaylists } from "@/hooks/usePlaylists"
import { useQueueStore } from "@/hooks/useQueue"
import { playlistService } from "@/services/playlist.service"
import { type Playlist } from "@/types"
import { motion } from "framer-motion"
import { ChevronDown, Download, GitMerge, Loader2, Share2, Sparkles, X } from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "react-toastify"

export function usePlaylistMenu({ playlists }: { playlists: Playlist[] }) {
    const addDownloadQueue = useQueueStore((s) => s.add)
    const { addSongsBulk, isAddingBulk, removeSongs, isRemoving } = usePlaylists()

    const [moreMenuFor, setMoreMenuFor] = useState<string | null>(null)
    const [isSharing, setIsSharing] = useState(false)
    const [dedupPlaylist, setDedupPlaylist] = useState<Playlist | null>(null)
    const [mergePlaylist, setMergePlaylist] = useState<Playlist | null>(null)
    const [mergeTargetId, setMergeTargetId] = useState("")

    const handleDownloadAll = (playlist: Playlist) => {
        playlist.songs.forEach((song) => addDownloadQueue(song, "audio", false))
        toast.success(`Added ${playlist.songs.length} songs to download queue`)
        setMoreMenuFor(null)
    }

    const handleShare = async (playlist: Playlist) => {
        setIsSharing(true)
        try {
            const token = await playlistService.createShareLink(playlist.id)
            await navigator.clipboard.writeText(`${window.location.origin}/s/${token}`)
            toast.success("Share link copied")
        } catch {
            toast.error("Failed to create share link")
        }
        setIsSharing(false)
        setMoreMenuFor(null)
    }

    const handleOpenMerge = (playlist: Playlist) => {
        const others = playlists.filter((p) => p.id !== playlist.id)
        if (others.length < 1) {
            toast.error("Create at least two playlists to merge")
            setMoreMenuFor(null)
            return
        }
        setMergeTargetId(others[0].id)
        setMergePlaylist(playlist)
        setMoreMenuFor(null)
    }

    const dedupCount = dedupPlaylist
        ? dedupPlaylist.songs.length - new Set(dedupPlaylist.songs.map((s) => s.id)).size
        : 0

    const confirmDedup = () => {
        if (!dedupPlaylist || dedupCount === 0) {
            setDedupPlaylist(null)
            return
        }
        const seen = new Set<string>()
        const dupIds: string[] = []
        for (const song of dedupPlaylist.songs) {
            if (seen.has(song.id)) {
                dupIds.push(song.id)
            } else {
                seen.add(song.id)
            }
        }
        removeSongs({ playlistId: dedupPlaylist.id, songIds: dupIds })
        setDedupPlaylist(null)
    }

    const confirmMerge = async () => {
        if (!mergePlaylist || !mergeTargetId) return
        const target = playlists.find((p) => p.id === mergeTargetId && p.id !== mergePlaylist.id)
        if (!target) return
        const targetIds = new Set(target.songs.map((s) => s.id))
        const songsToAdd = mergePlaylist.songs.filter((s) => !targetIds.has(s.id))
        await addSongsBulk({ playlistId: target.id, songs: songsToAdd })
        toast.success(`Merged ${songsToAdd.length} songs into ${target.name}`)
        setMergePlaylist(null)
        setMergeTargetId("")
    }

    const isMergeLoading = isAddingBulk || isRemoving

    useEffect(() => {
        if (!moreMenuFor) return
        const close = () => setMoreMenuFor(null)
        window.addEventListener("scroll", close, true)
        window.addEventListener("resize", close)
        return () => {
            window.removeEventListener("scroll", close, true)
            window.removeEventListener("resize", close)
        }
    }, [moreMenuFor])

    const renderMoreMenu = () => {
        const playlist = playlists.find((p) => p.id === moreMenuFor)
        if (!playlist) return null
        const btn = document.querySelector<HTMLElement>(`[data-more-btn="${playlist.id}"]`)
        if (!btn) return null
        const rect = btn.getBoundingClientRect()

        return createPortal(
            <>
                <div className='fixed inset-0 z-20' onClick={() => setMoreMenuFor(null)} />
                <div
                    onClick={(e) => e.stopPropagation()}
                    className='dark:bg-card fixed z-40 w-48 overflow-hidden rounded-xl border bg-white p-1 shadow-xl dark:border-white/10'
                    style={{
                        top: rect.bottom + 4,
                        right: Math.max(8, window.innerWidth - rect.right),
                    }}
                >
                    <button
                        onClick={() => handleDownloadAll(playlist)}
                        className='flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 dark:text-white dark:hover:bg-white/5'
                    >
                        <Download className='h-4 w-4 text-red-500' /> Download All
                    </button>
                    <button
                        onClick={() => {
                            setDedupPlaylist(playlist)
                            setMoreMenuFor(null)
                        }}
                        className='flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 dark:text-white dark:hover:bg-white/5'
                    >
                        <Sparkles className='h-4 w-4 text-red-500' /> Deduplicate
                    </button>
                    <button
                        onClick={() => handleOpenMerge(playlist)}
                        className='flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 dark:text-white dark:hover:bg-white/5'
                    >
                        <GitMerge className='h-4 w-4 text-red-500' /> Merge into…
                    </button>
                    <button
                        onClick={() => handleShare(playlist)}
                        disabled={isSharing}
                        className='flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white dark:hover:bg-white/5'
                    >
                        <Share2 className='h-4 w-4 text-red-500' /> Copy Share Link
                    </button>
                </div>
            </>,
            document.body,
        )
    }

    const renderDialogs = () => (
        <>
            <ConfirmationDialog
                isOpen={!!dedupPlaylist}
                title='Deduplicate'
                message={
                    dedupCount > 0
                        ? `Remove ${dedupCount} duplicate ${dedupCount === 1 ? "song" : "songs"} from "${dedupPlaylist?.name}"?`
                        : `No duplicate songs found in "${dedupPlaylist?.name}".`
                }
                confirmText={dedupCount > 0 ? "Remove" : "OK"}
                onConfirm={confirmDedup}
                onCancel={() => setDedupPlaylist(null)}
                type={dedupCount > 0 ? "danger" : "info"}
            />

            {mergePlaylist && (
                <div
                    className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
                    onClick={() => setMergePlaylist(null)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className='dark:bg-card w-full max-w-xl rounded-2xl border bg-white p-6 shadow-xl dark:border-white/10'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className='mb-4 flex items-center justify-between'>
                            <h2 className='text-lg font-bold dark:text-white'>
                                Merge into another playlist
                            </h2>
                            <button
                                onClick={() => setMergePlaylist(null)}
                                className='cursor-pointer text-gray-400 transition-colors hover:text-red-500'
                            >
                                <X className='h-5 w-5' />
                            </button>
                        </div>

                        <div className='flex flex-col gap-4'>
                            <div className='rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-white/10 dark:bg-black/30'>
                                <p className='text-xs tracking-wider text-gray-500 uppercase'>
                                    Source
                                </p>
                                <p className='mt-1 font-medium capitalize dark:text-white'>
                                    {mergePlaylist.name}
                                </p>
                                <p className='text-xs text-gray-500'>
                                    {mergePlaylist.songs.length} songs
                                </p>
                            </div>

                            <div className='flex flex-col gap-1.5'>
                                <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                    Merge into
                                </label>
                                <div className='relative'>
                                    <select
                                        value={mergeTargetId}
                                        onChange={(e) => setMergeTargetId(e.target.value)}
                                        className='h-11 w-full cursor-pointer appearance-none rounded-lg border bg-gray-50 px-3 pr-10 text-sm dark:border-white/5 dark:bg-black dark:text-white'
                                    >
                                        {playlists
                                            .filter((p) => p.id !== mergePlaylist.id)
                                            .map((p) => (
                                                <option
                                                    key={p.id}
                                                    value={p.id}
                                                    className='capitalize'
                                                >
                                                    {p.name}
                                                </option>
                                            ))}
                                    </select>
                                    <ChevronDown className='pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
                                </div>
                                <p className='text-xs text-gray-400'>
                                    Songs already in the target are skipped.
                                </p>
                            </div>

                            <div className='flex justify-end gap-2 pt-2'>
                                <button
                                    type='button'
                                    onClick={() => setMergePlaylist(null)}
                                    className='cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5'
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmMerge}
                                    disabled={isMergeLoading || !mergeTargetId}
                                    className='flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
                                >
                                    {isMergeLoading ? (
                                        <Loader2 className='h-4 w-4 animate-spin' />
                                    ) : (
                                        <GitMerge className='h-4 w-4' />
                                    )}
                                    Merge
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    )

    return {
        moreMenuFor,
        setMoreMenuFor,
        renderMoreMenu,
        renderDialogs,
    }
}
