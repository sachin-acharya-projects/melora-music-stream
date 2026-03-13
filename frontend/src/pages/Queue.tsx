import ConfirmationDialog from "@/components/ui/confirmation-dialog/confirmation-dialog"
import PlaylistSelector from "@/components/ui/playlist-selector/playlist-selector"
import { usePlayerStore } from "@/hooks/usePlayer"
import { usePlaylists } from "@/hooks/usePlaylists"
import { useQueueStore } from "@/hooks/useQueue"
import { useTitle } from "@/hooks/useTitle"
import { formatDuration } from "@/lib/utils"
import { apiService } from "@/services/api.service"
import { Reorder } from "framer-motion"
import { Download, GripVertical, Loader2, Play, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "react-toastify"

export default function Queue() {
    useTitle("Download Queue")
    const { queue, remove, clear, reorder } = useQueueStore()
    const [playlistInput, setPlaylistInput] = useState("")
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)

    const { playlists, addSong, createPlaylist, isAdding, isCreating } = usePlaylists()

    // Dialog state
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)

    const handlePlay = (index: number) => {
        setPlaylist(queue, index)
    }

    const handlePlayAll = () => {
        if (queue.length > 0) {
            setPlaylist(queue, 0)
        }
    }

    const handleAddAllToPlaylist = async () => {
        if (!playlistInput || queue.length === 0) return

        try {
            const existing = playlists.find(
                (p) => p.name.toLowerCase() === playlistInput.toLowerCase(),
            )
            let playlistId = existing?.id

            if (!playlistId) {
                const newPlaylist = await createPlaylist(playlistInput)
                playlistId = newPlaylist.id
            }

            for (const song of queue) {
                await addSong({ playlistId: playlistId!, song })
            }

            toast.success(`Added ${queue.length} songs to ${playlistInput}`)
            setPlaylistInput("")
        } catch {
            toast.error("Failed to add songs to playlist")
        }
    }

    const handleDownload = (id: string) => {
        window.open(apiService.getDownloadUrl(id), "_blank")
    }

    if (queue.length === 0) {
        return (
            <div className='flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center'>
                <div className='rounded-full bg-gray-100 p-6 dark:bg-white/5'>
                    <Trash2 className='h-12 w-12 text-gray-400' />
                </div>
                <div>
                    <h2 className='text-2xl font-bold dark:text-white'>Your queue is empty</h2>
                    <p className='text-gray-500'>
                        Add some songs from the search or playlists to get started.
                    </p>
                </div>
            </div>
        )
    }

    const isPlaylistActionLoading = isAdding || isCreating

    return (
        <div className='mx-auto w-full max-w-4xl px-4 py-10'>
            <div className='mb-8 flex flex-wrap items-center justify-between gap-4'>
                <h1 className='text-3xl font-bold dark:text-white'>Download Queue</h1>

                <div className='flex items-center gap-3'>
                    <button
                        onClick={handlePlayAll}
                        className='flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700'
                    >
                        <Play className='h-4 w-4 fill-current' />
                        Play All
                    </button>

                    <div className='flex items-center gap-2 border-x px-3 dark:border-white/10'>
                        <PlaylistSelector
                            playlists={playlists}
                            value={playlistInput}
                            onChange={setPlaylistInput}
                            className='w-48'
                        />
                        <button
                            onClick={handleAddAllToPlaylist}
                            disabled={!playlistInput || isPlaylistActionLoading}
                            className='flex min-w-25 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50'
                        >
                            {isPlaylistActionLoading ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                                <Plus className='h-4 w-4' />
                            )}
                            <span>Add All</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setIsClearDialogOpen(true)}
                        className='cursor-pointer text-sm font-medium text-red-500 hover:text-red-600'
                    >
                        Clear All
                    </button>
                </div>
            </div>

            <Reorder.Group
                axis='y'
                values={queue}
                onReorder={reorder}
                className='flex flex-col gap-4'
            >
                {queue.map((song, index) => (
                    <Reorder.Item
                        key={song.id}
                        value={song}
                        className='group dark:bg-card flex items-center gap-4 rounded-2xl border bg-white p-3 transition-shadow select-none hover:shadow-md dark:border-white/10'
                    >
                        <div className='cursor-grab p-1 text-gray-400 active:cursor-grabbing'>
                            <GripVertical className='h-5 w-5' />
                        </div>

                        <div className='relative h-20 w-36 shrink-0 overflow-hidden rounded-lg'>
                            <img
                                src={song.thumbnail}
                                alt={song.title}
                                className='h-full w-full object-cover'
                            />
                            <div className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
                                <button
                                    onClick={() => handlePlay(index)}
                                    className='cursor-pointer rounded-full bg-white p-2 text-black transition-transform hover:scale-110'
                                >
                                    <Play className='h-5 w-5 fill-current' />
                                </button>
                            </div>
                            <span className='absolute right-1 bottom-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white'>
                                {formatDuration(song.duration)}
                            </span>
                        </div>

                        <div className='flex flex-1 flex-col justify-center overflow-hidden'>
                            <h3 className='truncate font-semibold dark:text-white'>{song.title}</h3>
                            <p className='text-sm text-gray-500 dark:text-gray-400'>
                                {song.uploader}
                            </p>
                        </div>

                        <div className='flex items-center gap-2'>
                            <button
                                onClick={() => handleDownload(song.id)}
                                className='cursor-pointer rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-red-700'
                                title='Download Now'
                            >
                                <Download className='h-4 w-4' />
                            </button>

                            <button
                                onClick={() => remove(song.id)}
                                className='cursor-pointer rounded-lg border p-2 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-white/10 dark:hover:bg-red-500/10'
                                title='Remove from Queue'
                            >
                                <Trash2 className='h-4 w-4' />
                            </button>
                        </div>
                    </Reorder.Item>
                ))}
            </Reorder.Group>

            <ConfirmationDialog
                isOpen={isClearDialogOpen}
                title='Clear Queue'
                message='Are you sure you want to remove all items from your download queue?'
                confirmText='Clear All'
                onConfirm={clear}
                onCancel={() => setIsClearDialogOpen(false)}
                type='danger'
            />
        </div>
    )
}
