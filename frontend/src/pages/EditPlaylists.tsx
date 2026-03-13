import ConfirmationDialog from "@/components/ui/confirmation-dialog/confirmation-dialog"
import { useTitle } from "@/hooks/useTitle"
import { type Song } from "@/types"
import { http } from "@/utils/api/http"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Edit2, Loader2, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "react-toastify"

export default function EditPlaylists() {
    useTitle("Manage Playlists")
    const queryClient = useQueryClient()
    const [editingName, setEditingName] = useState<string | null>(null)
    const [newName, setNewName] = useState("")
    const [createName, setCreateName] = useState("")

    // Dialog state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null)

    const { data: playlists = {}, isLoading } = useQuery({
        queryKey: ["playlists"],
        queryFn: async () => {
            const res = await http.get<Record<string, Song[]>>("/playlists")
            return res.data
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (name: string) => {
            return http.delete(`/playlists/${name}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            toast.success("Playlist deleted")
        },
        onError: () => {
            toast.error("Delete not supported by API")
        },
    })

    const renameMutation = useMutation({
        mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
            return http.put(`/playlists/${oldName}`, { name: newName })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            setEditingName(null)
            toast.success("Playlist renamed")
        },
        onError: () => {
            toast.error("Rename not supported by API")
            setEditingName(null)
        },
    })

    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            return http.post("/playlists", { name })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["playlists"] })
            setCreateName("")
            toast.success("Playlist created")
        },
    })

    const handleDeleteClick = (name: string) => {
        setPlaylistToDelete(name)
        setIsDeleteDialogOpen(true)
    }

    if (isLoading)
        return (
            <div className='flex justify-center pt-20'>
                <Loader2 className='animate-spin' />
            </div>
        )

    return (
        <div className='mx-auto w-full max-w-2xl px-4 py-10'>
            <h1 className='mb-8 text-3xl font-bold'>Manage Playlists</h1>

            <div className='mb-8 rounded-2xl border bg-white p-6 shadow-sm dark:bg-white/5'>
                <h2 className='mb-4 font-semibold'>Create New Playlist</h2>
                <div className='flex gap-2'>
                    <input
                        type='text'
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        placeholder='Playlist Name'
                        className='flex-1 rounded-lg border bg-gray-50 p-2 dark:bg-black'
                    />
                    <button
                        onClick={() => createMutation.mutate(createName)}
                        disabled={!createName || createMutation.isPending}
                        className='flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                        {createMutation.isPending ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                            <Plus className='h-4 w-4' />
                        )}
                        Create
                    </button>
                </div>
            </div>

            <div className='flex flex-col gap-4'>
                {Object.keys(playlists).map((name) => (
                    <div
                        key={name}
                        className='flex items-center justify-between rounded-xl border bg-white p-4 dark:bg-white/5'
                    >
                        <div className='flex items-center gap-4'>
                            {editingName === name ? (
                                <div className='flex items-center gap-2'>
                                    <input
                                        type='text'
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className='rounded border px-2 py-1 text-sm dark:bg-black'
                                        autoFocus
                                    />
                                    <button
                                        onClick={() =>
                                            renameMutation.mutate({ oldName: name, newName })
                                        }
                                        className='cursor-pointer text-emerald-500'
                                        disabled={renameMutation.isPending}
                                    >
                                        <Check className='h-4 w-4' />
                                    </button>
                                    <button
                                        onClick={() => setEditingName(null)}
                                        className='cursor-pointer text-red-500'
                                    >
                                        <X className='h-4 w-4' />
                                    </button>
                                </div>
                            ) : (
                                <span className='font-medium capitalize'>{name}</span>
                            )}
                            <span className='text-xs text-gray-400'>
                                {playlists[name].length} songs
                            </span>
                        </div>

                        <div className='flex gap-2'>
                            <button
                                onClick={() => {
                                    setEditingName(name)
                                    setNewName(name)
                                }}
                                className='cursor-pointer rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                            >
                                <Edit2 className='h-4 w-4' />
                            </button>
                            <button
                                onClick={() => handleDeleteClick(name)}
                                className='cursor-pointer rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10'
                            >
                                <Trash2 className='h-4 w-4' />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                title='Delete Playlist'
                message={`Are you sure you want to delete "${playlistToDelete}"? This action cannot be undone.`}
                confirmText='Delete'
                onConfirm={() => playlistToDelete && deleteMutation.mutate(playlistToDelete)}
                onCancel={() => setIsDeleteDialogOpen(false)}
                type='danger'
            />
        </div>
    )
}
