import PlaylistSelector from "@/components/ui/playlist-selector/playlist-selector"
import { type PlaylistItem } from "@/hooks/usePlayer"
import { usePlaylists } from "@/hooks/usePlaylists"
import { Loader2, Plus, X } from "lucide-react"
import { useState } from "react"
import { toast } from "react-toastify"

export function AddToPlaylistModal({ song, onClose }: { song: PlaylistItem; onClose: () => void }) {
    const { playlists, createPlaylist, addSongsBulk, isAddingBulk, isCreating } = usePlaylists()
    const [name, setName] = useState("")
    const loading = isAddingBulk || isCreating

    const handleAdd = async () => {
        if (!name) return
        try {
            const existing = playlists.find((p) => p.name?.toLowerCase() === name.toLowerCase())
            let playlistId = existing?.id
            if (!playlistId) {
                const created = await createPlaylist(name)
                playlistId = created.id
            }
            await addSongsBulk({ playlistId: playlistId!, songs: [song] })
            toast.success(`Added "${song.title}" to ${name}`)
            onClose()
        } catch {
            toast.error("Failed to add song to playlist")
        }
    }

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
            onClick={onClose}
        >
            <div
                className='w-full max-w-sm rounded-2xl border bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-black'
                onClick={(e) => e.stopPropagation()}
            >
                <div className='mb-4 flex items-center justify-between'>
                    <h3 className='text-lg font-bold dark:text-white'>Add to playlist</h3>
                    <button
                        onClick={onClose}
                        className='cursor-pointer rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                    >
                        <X className='h-5 w-5' />
                    </button>
                </div>
                <p className='mb-4 truncate text-sm text-gray-500'>
                    {song.title} — {song.uploader}
                </p>
                <PlaylistSelector
                    playlists={playlists}
                    value={name}
                    onChange={setName}
                    className='w-full'
                />
                <button
                    onClick={handleAdd}
                    disabled={!name || loading}
                    className='mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50'
                >
                    {loading ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                        <Plus className='h-4 w-4' />
                    )}
                    Add to playlist
                </button>
            </div>
        </div>
    )
}
