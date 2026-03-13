import ConfirmationDialog from "@/components/ui/confirmation-dialog/confirmation-dialog"
import { usePlayerStore } from "@/hooks/usePlayer"
import { useQueueStore } from "@/hooks/useQueue"
import { useTitle } from "@/hooks/useTitle"
import { formatDuration } from "@/lib/utils"
import { type Song } from "@/types"
import { http } from "@/utils/api/http"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Reorder } from "framer-motion"
import { Download, GripVertical, Play, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "react-toastify"

export default function Queue() {
    useTitle("Download Queue")
    const { queue, remove, clear, reorder } = useQueueStore()
    const [selectedPlaylist, setSelectedPlaylist] = useState("")
    const setPlaylist = usePlayerStore((s) => s.setPlaylist)

    // Dialog state
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)

    const { data: playlists = {} } = useQuery({
        queryKey: ["playlists"],
        queryFn: async () => {
            const res = await http.get<Record<string, Song[]>>("/playlists")
            const names = Object.keys(res.data)
            if (names.length > 0 && !selectedPlaylist) {
                setSelectedPlaylist(names[0])
            }
            return res.data
        },
    })

    const playlistNames = Object.keys(playlists)

    const addToPlaylistMutation = useMutation({
        mutationFn: async ({ playlist, song }: { playlist: string; song: Song }) => {
            return http.post(`/playlists/${playlist}/add`, song)
        },
        onSuccess: (_, variables) => {
            toast.success(`Added ${variables.song.title} to ${variables.playlist}`)
        },
        onError: () => {
            toast.error("Failed to add to playlist")
        },
    })

    const handlePlay = (index: number) => {
        setPlaylist(queue, index)
    }

    const handlePlayAll = () => {
        if (queue.length > 0) {
            setPlaylist(queue, 0)
        }
    }

    const handleAddAllToPlaylist = () => {
        if (!selectedPlaylist || queue.length === 0) return
        queue.forEach((song) => {
            addToPlaylistMutation.mutate({ playlist: selectedPlaylist, song })
        })
        toast.info(`Adding ${queue.length} songs to ${selectedPlaylist}...`)
    }

    const handleDownload = (id: string) => {
        window.open(`${import.meta.env.VITE_BASE_URL}/download/${id}`, "_blank")
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

                    {playlistNames.length > 0 && (
                        <div className='flex items-center gap-2 border-x px-3 dark:border-white/10'>
                            <select
                                value={selectedPlaylist}
                                onChange={(e) => setSelectedPlaylist(e.target.value)}
                                className='cursor-pointer rounded-lg border bg-white px-2 py-2 text-sm dark:border-white/10 dark:bg-black dark:text-white'
                            >
                                {playlistNames.map((name) => (
                                    <option key={name} value={name}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddAllToPlaylist}
                                className='flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700'
                            >
                                <Plus className='h-4 w-4' />
                                Add All
                            </button>
                        </div>
                    )}

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
                        className='group dark:bg-card flex items-center gap-4 rounded-2xl border bg-white p-3 transition-shadow hover:shadow-md dark:border-white/10'
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
                                className='cursor-pointer rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700'
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
